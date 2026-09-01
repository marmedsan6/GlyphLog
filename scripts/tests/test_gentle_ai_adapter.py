from __future__ import annotations

import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import stat
import subprocess
import tarfile
import tempfile
import unittest
from unittest import mock


MODULE_PATH = Path(__file__).parents[1] / "gentle_ai_adapter.py"
SPEC = importlib.util.spec_from_file_location("gentle_ai_adapter", MODULE_PATH)
assert SPEC and SPEC.loader
adapter = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(adapter)
FIXTURES = Path(__file__).parent / "fixtures"


def fixture(name: str) -> dict[str, object]:
    return json.loads((FIXTURES / f"{name}.json").read_text(encoding="utf-8"))


def add_tar_bytes(archive: tarfile.TarFile, name: str, content: bytes) -> str:
    info = tarfile.TarInfo(name)
    info.size = len(content)
    archive.addfile(info, io.BytesIO(content))
    return hashlib.sha256(content).hexdigest()


def create_bundle(path: Path, *, complete: bool = True) -> None:
    files = {
        "README.md": b"contract\n",
        "schemas/lens.schema.json": b"{}\n",
        "schemas/refuter.schema.json": b"{}\n",
        "schemas/targeted-validator.schema.json": b"{}\n",
        "vectors/lens.json": b"{}\n",
        "vectors/refuter.json": b"{}\n",
        "vectors/targeted-validator.json": b"{}\n",
    }
    if complete:
        for name in (
            "schemas/transition-execution.schema.json",
            "schemas/start-v4.schema.json",
            "schemas/capabilities-v2.3.schema.json",
            "schemas/status-v5.schema.json",
        ):
            files[name] = b"{}\n"
    roles = []
    for role in ("lens", "refuter", "targeted-validator"):
        roles.append(
            {
                "id": role,
                "schema": {
                    "path": f"schemas/{role}.schema.json",
                    "sha256": hashlib.sha256(
                        files[f"schemas/{role}.schema.json"]
                    ).hexdigest(),
                },
                "vector": {
                    "path": f"vectors/{role}.json",
                    "sha256": hashlib.sha256(files[f"vectors/{role}.json"]).hexdigest(),
                },
            }
        )
    manifest = {
        "schema": "gentle-ai.review-provider-contract-bundle/v1",
        "contract_semver": "1.1.0",
        "runtimes": ["codex"],
        "readme": {
            "path": "README.md",
            "sha256": hashlib.sha256(files["README.md"]).hexdigest(),
        },
        "roles": roles,
    }
    files["manifest.json"] = (json.dumps(manifest) + "\n").encode()
    with tarfile.open(path, "w:gz") as archive:
        for name, content in files.items():
            add_tar_bytes(archive, name, content)


def capabilities() -> dict[str, object]:
    return {
        "schema": adapter.CAPABILITIES_SCHEMA,
        "contract": adapter.CONTRACT,
        "protocol": {"major": 2, "minor": 3},
        "package": {"version": adapter.VERSION},
        "executable": {"sha256": f"sha256:{adapter.BINARY_SHA256}"},
        "schemas": sorted(adapter.REQUIRED_CAPABILITY_SCHEMAS),
        "features": {
            "optional": [
                {"name": name, "supported": True}
                for name in sorted(adapter.REQUIRED_FEATURES)
            ]
        },
    }


def create_fake_binary(path: Path, status_payload: dict[str, object]) -> None:
    capabilities_json = repr(json.dumps(capabilities()))
    status_json = repr(json.dumps(status_payload))
    source = f"""#!/usr/bin/env python3
import sys
if sys.argv[1:3] == ['review', 'capabilities']:
    print({capabilities_json})
elif sys.argv[1:3] == ['review', 'status']:
    print({status_json})
elif sys.argv[1:3] == ['review', 'acknowledge-approved']:
    pass
else:
    raise SystemExit(3)
"""
    path.write_text(source, encoding="utf-8")
    path.chmod(path.stat().st_mode | stat.S_IXUSR)


class NormalizationTests(unittest.TestCase):
    def test_all_normalized_states_have_json_fixtures(self) -> None:
        for expected in sorted(adapter.NORMAL_STATES):
            with self.subTest(expected=expected):
                actual = adapter.normalize(fixture(expected), "current")
                self.assertEqual(actual["state"], expected)

    def test_unknown_schema_is_rejected(self) -> None:
        with self.assertRaisesRegex(adapter.AdapterError, "not admitted") as raised:
            adapter.validate_response_schema(
                {"schema": "future/v99", "contract": adapter.CONTRACT}, "review.status"
            )
        self.assertEqual(raised.exception.code, "response_schema_unknown")

    def test_failure_preserves_typed_mutation_and_next_action(self) -> None:
        payload = fixture("rejected")
        payload["mutation_outcome"] = "not_started"
        payload["next_action"] = "rerun_status"
        error = adapter.provider_failure(payload, "current")
        self.assertEqual(
            error.payload(),
            {
                "schema": adapter.ADAPTER_SCHEMA,
                "state": "rejected",
                "code": "target_mismatch",
                "message": "target changed",
                "operation": "review.status",
                "scope": "current",
                "lineage": None,
                "allowed_action": "rerun_status",
                "provider_mutated": False,
            },
        )


class ContractTests(unittest.TestCase):
    def test_complete_bundle_and_capabilities_are_admitted(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            bundle = Path(directory) / "bundle.tar.gz"
            create_bundle(bundle)
            with mock.patch.object(
                adapter, "BUNDLE_SHA256", adapter.sha256_file(bundle)
            ):
                manifest = adapter.verify_bundle(bundle)
            self.assertIn("codex", manifest["runtimes"])
            adapter.validate_capabilities(capabilities())

    def test_missing_transition_schemas_fail_closed(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            bundle = Path(directory) / "bundle.tar.gz"
            create_bundle(bundle, complete=False)
            with mock.patch.object(
                adapter, "BUNDLE_SHA256", adapter.sha256_file(bundle)
            ):
                with self.assertRaises(adapter.AdapterError) as raised:
                    adapter.verify_bundle(bundle)
            self.assertEqual(raised.exception.code, "bundle_inventory_incomplete")

    def test_unknown_protocol_is_rejected(self) -> None:
        payload = capabilities()
        payload["protocol"] = {"major": 3, "minor": 0}
        with self.assertRaises(adapter.AdapterError) as raised:
            adapter.validate_capabilities(payload)
        self.assertEqual(raised.exception.code, "protocol_version_rejected")


class DriftAndTransitionTests(unittest.TestCase):
    def setUp(self) -> None:
        self.previous = adapter.new_state(
            {"name": "current", "base_ref": None}, fixture("reviewing")
        )

    def test_target_drift_is_rejected(self) -> None:
        payload = fixture("reviewing")
        payload["target_identity"] = "sha256:other"
        with self.assertRaises(adapter.AdapterError) as raised:
            adapter.validate_drift(self.previous, payload, allow_revision_change=False)
        self.assertEqual(raised.exception.code, "target_drift")

    def test_lineage_drift_is_rejected(self) -> None:
        payload = fixture("reviewing")
        payload["authority"]["lineage_id"] = "lineage-two"
        with self.assertRaises(adapter.AdapterError) as raised:
            adapter.validate_drift(self.previous, payload, allow_revision_change=False)
        self.assertEqual(raised.exception.code, "lineage_drift")

    def test_stale_revision_is_rejected(self) -> None:
        payload = fixture("reviewing")
        payload["authority"]["revision"] = "sha256:new"
        with self.assertRaises(adapter.AdapterError) as raised:
            adapter.validate_drift(self.previous, payload, allow_revision_change=False)
        self.assertEqual(raised.exception.code, "revision_stale")

    def test_incorrect_untracked_inventory_is_rejected(self) -> None:
        self.previous["inventory"] = {
            "intended_untracked": ["new.txt"],
            "intended_untracked_proof": "sha256:proof-one",
        }
        payload = fixture("reviewing")
        payload["projection"]["intended_untracked"] = ["other.txt"]
        payload["projection"]["intended_untracked_proof"] = "sha256:proof-two"
        with self.assertRaises(adapter.AdapterError) as raised:
            adapter.validate_drift(self.previous, payload, allow_revision_change=False)
        self.assertEqual(raised.exception.code, "untracked_inventory_drift")

    def test_altered_command_is_never_executed(self) -> None:
        execution = fixture("not_started")["next_transition"]["execute"]
        execution["command"] += " --focus=risk"
        with self.assertRaises(adapter.AdapterError) as raised:
            adapter.validate_transition(
                execution, {"name": "current", "base_ref": None}, Path("/repo"), None
            )
        self.assertEqual(raised.exception.code, "transition_command_altered")

    def test_invalid_scope_and_scope_change_are_rejected(self) -> None:
        with self.assertRaises(adapter.AdapterError) as raised:
            adapter.validate_scope("all", None)
        self.assertEqual(raised.exception.code, "scope_invalid")
        with self.assertRaises(adapter.AdapterError) as raised:
            adapter.scope_matches(
                self.previous, {"name": "committed-only", "base_ref": "main"}
            )
        self.assertEqual(raised.exception.code, "scope_drift")

    def test_acknowledgement_keeps_non_current_scope_in_persisted_state(self) -> None:
        execution = fixture("approved_pending_ack")["next_transition"]["execute"]
        adapter.validate_transition(
            execution,
            {"name": "committed-only", "base_ref": "main"},
            Path("/repo"),
            execution["binding"],
        )

    def test_acknowledgement_replay_is_rejected_before_process_execution(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            repo = Path(directory) / "repo"
            repo.mkdir()
            subprocess.run(["git", "init", "-q", str(repo)], check=True)
            bundle = Path(directory) / "bundle.tar.gz"
            binary = Path(directory) / "gentle-ai"
            create_bundle(bundle)
            payload = fixture("approved_pending_ack")
            payload["next_transition"]["execute"]["arguments"][0] = {
                "name": "cwd",
                "value": str(repo),
                "token": f"--cwd={repo}",
            }
            tokens = [
                item["token"]
                for item in payload["next_transition"]["execute"]["arguments"]
            ]
            payload["next_transition"]["execute"]["command"] = (
                "gentle-ai review acknowledge-approved " + " ".join(tokens)
            )
            create_fake_binary(binary, fixture("disabled"))
            binary_hash = adapter.sha256_file(binary)
            execution = payload["next_transition"]["execute"]
            _, digest = adapter.validate_transition(
                execution, {"name": "current", "base_ref": None}, repo, None
            )
            state = adapter.new_state(
                {"name": "current", "base_ref": None}, payload, [digest]
            )
            adapter.save_state(repo, state)
            with (
                mock.patch.object(adapter, "BINARY_SHA256", binary_hash),
                mock.patch.object(
                    adapter, "BUNDLE_SHA256", adapter.sha256_file(bundle)
                ),
            ):
                caps = capabilities()
                caps["executable"]["sha256"] = f"sha256:{binary_hash}"
                with mock.patch.object(
                    adapter, "validate_capabilities", return_value=None
                ):
                    with self.assertRaises(adapter.AdapterError) as raised:
                        adapter.adapter_step(
                            binary, bundle, repo, {"name": "current", "base_ref": None}
                        )
            self.assertEqual(raised.exception.code, "transition_replay")

    def test_symlinked_state_directory_is_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            repo = root / "repo"
            outside = root / "outside"
            repo.mkdir()
            outside.mkdir()
            (repo / ".gentle-ai").symlink_to(outside, target_is_directory=True)
            with self.assertRaises(adapter.AdapterError) as raised:
                adapter.ensure_state_path_safe(repo)
            self.assertEqual(raised.exception.code, "adapter_state_symlink")


class DisposableRepositoryIntegrationTests(unittest.TestCase):
    def test_status_uses_only_ephemeral_repo_state(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            repo = root / "repo"
            fake_home = root / "home"
            repo.mkdir()
            fake_home.mkdir()
            subprocess.run(["git", "init", "-q", str(repo)], check=True)
            bundle = root / "bundle.tar.gz"
            binary = root / "gentle-ai"
            create_bundle(bundle)
            create_fake_binary(binary, fixture("disabled"))
            binary_hash = adapter.sha256_file(binary)
            bundle_hash = adapter.sha256_file(bundle)
            before = sorted(
                path.relative_to(fake_home) for path in fake_home.rglob("*")
            )
            with (
                mock.patch.dict(os.environ, {"HOME": str(fake_home)}),
                mock.patch.object(adapter, "BINARY_SHA256", binary_hash),
                mock.patch.object(adapter, "BUNDLE_SHA256", bundle_hash),
                mock.patch.object(adapter, "validate_capabilities", return_value=None),
            ):
                result = adapter.adapter_status(
                    binary, bundle, repo, {"name": "current", "base_ref": None}
                )
            after = sorted(path.relative_to(fake_home) for path in fake_home.rglob("*"))
            self.assertEqual(result["state"], "disabled")
            self.assertEqual(before, after)
            self.assertTrue((repo / ".gentle-ai" / "adapter" / "state.json").is_file())


if __name__ == "__main__":
    unittest.main()
