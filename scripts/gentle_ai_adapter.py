#!/usr/bin/env python3
"""Fail-closed GlyphLog adapter for the pinned Gentle AI review protocol."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import shlex
import subprocess
import sys
import tarfile
import tempfile
from typing import Any


VERSION = "2.5.0-rc.3"
BINARY_SHA256 = "b69da0a51b03f326147498ae465fc1ec52eff8427d579964eefad714c3f9bd87"
BUNDLE_SHA256 = "1acabf9cc45f6d2205fca11b31e44f4fb45015e16c677aea61060f9bd3feb85b"
CONTRACT = "gentle-ai.review-integration/v2"
ADAPTER_SCHEMA = "glyphlog.gentle-ai-adapter/v1"
STATE_SCHEMA = "glyphlog.gentle-ai-adapter-state/v1"
CAPABILITIES_SCHEMA = "gentle-ai.review-integration.capabilities/v2.3"
STATUS_SCHEMA = "gentle-ai.review-integration.status/v5"
START_SCHEMA = "gentle-ai.review-integration.start/v4"
FAILURE_SCHEMA = "gentle-ai.review-integration.failure/v2"
CONSENT_SCHEMA = "gentle-ai.review-integration.consent/v3"
ALLOWED_RESPONSE_SCHEMAS = {STATUS_SCHEMA, START_SCHEMA, FAILURE_SCHEMA, CONSENT_SCHEMA}
REQUIRED_CAPABILITY_SCHEMAS = {
    CAPABILITIES_SCHEMA,
    START_SCHEMA,
    STATUS_SCHEMA,
}
REQUIRED_FEATURES = {
    "native_next_transition",
    "opaque_repository_context",
    "provider_artifact_admission",
}
REQUIRED_BUNDLE_FILES = {
    "README.md",
    "manifest.json",
    "schemas/lens.schema.json",
    "schemas/refuter.schema.json",
    "schemas/targeted-validator.schema.json",
    "schemas/transition-execution.schema.json",
    "schemas/start-v4.schema.json",
    "schemas/capabilities-v2.3.schema.json",
    "schemas/status-v5.schema.json",
}
OPERATION_COMMANDS = {
    "review.start": ("review", "start"),
    "review.status": ("review", "status"),
    "review.acknowledge-approved": ("review", "acknowledge-approved"),
}
OPERATION_ARGUMENTS = {
    "review.start": {
        "agent",
        "base-ref",
        "committed-only",
        "consent",
        "contract",
        "cwd",
        "expected-untracked-inventory",
        "focus",
        "intended-untracked",
        "lineage",
        "locale",
        "policy",
        "projection",
        "target",
        "trace",
        "untracked-scope",
        "workspace-overlay",
    },
    "review.status": {
        "action-eligibility",
        "agent",
        "base-ref",
        "base-tree",
        "committed-only",
        "contract",
        "cwd",
        "expected-untracked-inventory",
        "gate",
        "intended-untracked",
        "lineage",
        "next-transition",
        "projection",
        "recovery-actor",
        "recovery-authorization",
        "recovery-reason",
        "recovery-successor-lineage",
        "repair-actor",
        "repair-authorization",
        "repair-reason",
        "untracked-scope",
        "workspace-overlay",
    },
    "review.acknowledge-approved": {
        "cwd",
        "lineage",
        "target",
        "expected-revision",
        "token",
    },
}
MUTATING_OPERATIONS = {"review.start", "review.acknowledge-approved"}
NORMAL_STATES = {
    "disabled",
    "not_started",
    "reviewing",
    "needs_correction",
    "approved_pending_ack",
    "approved",
    "rejected",
    "stopped",
    "clean_without_review",
}


class AdapterError(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        *,
        operation: str,
        scope: str = "none",
        lineage: str | None = None,
        allowed_action: str = "stop",
        provider_mutated: bool = False,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.operation = operation
        self.scope = scope
        self.lineage = lineage
        self.allowed_action = allowed_action
        self.provider_mutated = provider_mutated

    def payload(self) -> dict[str, Any]:
        return {
            "schema": ADAPTER_SCHEMA,
            "state": "rejected",
            "code": self.code,
            "message": self.message,
            "operation": self.operation,
            "scope": self.scope,
            "lineage": self.lineage,
            "allowed_action": self.allowed_action,
            "provider_mutated": self.provider_mutated,
        }


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def canonical_digest(value: Any) -> str:
    encoded = json.dumps(value, sort_keys=True, separators=(",", ":")).encode()
    return "sha256:" + hashlib.sha256(encoded).hexdigest()


def read_tar_json(archive: tarfile.TarFile, name: str) -> dict[str, Any]:
    member = archive.getmember(name)
    stream = archive.extractfile(member)
    if stream is None:
        raise AdapterError(
            "bundle_invalid",
            f"bundle member {name} is unreadable",
            operation="contract.check",
        )
    try:
        value = json.load(stream)
    except (json.JSONDecodeError, UnicodeDecodeError) as error:
        raise AdapterError(
            "bundle_invalid",
            f"bundle member {name} is invalid JSON: {error}",
            operation="contract.check",
        ) from error
    if not isinstance(value, dict):
        raise AdapterError(
            "bundle_invalid",
            f"bundle member {name} must be an object",
            operation="contract.check",
        )
    return value


def verify_bundle(path: Path) -> dict[str, Any]:
    if not path.is_file() or sha256_file(path) != BUNDLE_SHA256:
        raise AdapterError(
            "bundle_checksum_mismatch",
            "provider contract bundle does not match the pinned rc.3 checksum",
            operation="contract.check",
        )
    try:
        with tarfile.open(path, "r:gz") as archive:
            members = archive.getmembers()
            names = {member.name for member in members}
            for member in members:
                member_path = Path(member.name)
                if (
                    member_path.is_absolute()
                    or ".." in member_path.parts
                    or member.issym()
                    or member.islnk()
                ):
                    raise AdapterError(
                        "bundle_unsafe_path",
                        f"unsafe bundle member: {member.name}",
                        operation="contract.check",
                    )
            missing = sorted(REQUIRED_BUNDLE_FILES - names)
            if missing:
                raise AdapterError(
                    "bundle_inventory_incomplete",
                    "official rc.3 bundle omits required transition schemas: "
                    + ", ".join(missing),
                    operation="contract.check",
                )
            manifest = read_tar_json(archive, "manifest.json")
            if (
                manifest.get("schema") != "gentle-ai.review-provider-contract-bundle/v1"
                or manifest.get("contract_semver") != "1.1.0"
            ):
                raise AdapterError(
                    "bundle_manifest_unknown",
                    "provider bundle manifest version is not admitted",
                    operation="contract.check",
                )
            if "codex" not in manifest.get("runtimes", []):
                raise AdapterError(
                    "runtime_not_registered",
                    "provider bundle does not register the codex runtime",
                    operation="contract.check",
                )
            references: list[dict[str, Any]] = []
            if isinstance(manifest.get("readme"), dict):
                references.append(manifest["readme"])
            for role in manifest.get("roles", []):
                if isinstance(role, dict):
                    references.extend(
                        item
                        for item in (role.get("schema"), role.get("vector"))
                        if isinstance(item, dict)
                    )
            for reference in references:
                member_name = reference.get("path")
                expected = reference.get("sha256")
                if (
                    not isinstance(member_name, str)
                    or not isinstance(expected, str)
                    or member_name not in names
                ):
                    raise AdapterError(
                        "bundle_manifest_invalid",
                        "provider bundle manifest references an invalid member",
                        operation="contract.check",
                    )
                stream = archive.extractfile(member_name)
                if (
                    stream is None
                    or hashlib.sha256(stream.read()).hexdigest() != expected
                ):
                    raise AdapterError(
                        "bundle_member_checksum_mismatch",
                        f"bundle member checksum mismatch: {member_name}",
                        operation="contract.check",
                    )
            return manifest
    except (tarfile.TarError, KeyError) as error:
        raise AdapterError(
            "bundle_invalid",
            f"provider contract bundle cannot be read: {error}",
            operation="contract.check",
        ) from error


def run_process(
    argv: list[str], *, cwd: Path | None = None
) -> subprocess.CompletedProcess[str]:
    try:
        return subprocess.run(
            argv, cwd=cwd, text=True, capture_output=True, timeout=60, check=False
        )
    except (OSError, subprocess.TimeoutExpired) as error:
        raise AdapterError(
            "provider_execution_failed", str(error), operation="provider.execute"
        ) from error


def decode_provider_json(
    result: subprocess.CompletedProcess[str], operation: str
) -> dict[str, Any]:
    try:
        payload = json.loads(result.stdout)
    except json.JSONDecodeError as error:
        detail = result.stderr.strip() or "provider returned no JSON"
        raise AdapterError(
            "provider_output_invalid",
            detail,
            operation=operation,
            provider_mutated=operation in MUTATING_OPERATIONS,
        ) from error
    if not isinstance(payload, dict):
        raise AdapterError(
            "provider_output_invalid",
            "provider output must be a JSON object",
            operation=operation,
        )
    return payload


def validate_capabilities(payload: dict[str, Any]) -> None:
    if (
        payload.get("schema") != CAPABILITIES_SCHEMA
        or payload.get("contract") != CONTRACT
    ):
        raise AdapterError(
            "capabilities_schema_unknown",
            "capabilities are not v2.3 for contract v2",
            operation="review.capabilities",
        )
    protocol = payload.get("protocol")
    package = payload.get("package")
    executable = payload.get("executable")
    if protocol != {"major": 2, "minor": 3}:
        raise AdapterError(
            "protocol_version_rejected",
            "only protocol 2.3 is admitted",
            operation="review.capabilities",
        )
    if not isinstance(package, dict) or package.get("version") != VERSION:
        raise AdapterError(
            "provider_version_rejected",
            f"only Gentle AI {VERSION} is admitted",
            operation="review.capabilities",
        )
    if (
        not isinstance(executable, dict)
        or executable.get("sha256") != f"sha256:{BINARY_SHA256}"
    ):
        raise AdapterError(
            "capability_binary_mismatch",
            "capabilities report a different executable digest",
            operation="review.capabilities",
        )
    schemas = set(payload.get("schemas", []))
    if not REQUIRED_CAPABILITY_SCHEMAS <= schemas:
        raise AdapterError(
            "capability_schema_missing",
            "capabilities omit a required v2.3/v4/v5 schema",
            operation="review.capabilities",
        )
    optional = (
        payload.get("features", {}).get("optional", [])
        if isinstance(payload.get("features"), dict)
        else []
    )
    supported = {
        item.get("name")
        for item in optional
        if isinstance(item, dict) and item.get("supported") is True
    }
    if not REQUIRED_FEATURES <= supported:
        raise AdapterError(
            "capability_feature_missing",
            "capabilities omit a required native review feature",
            operation="review.capabilities",
        )


def check_contract(binary: Path, bundle: Path) -> dict[str, Any]:
    if not binary.is_file() or sha256_file(binary) != BINARY_SHA256:
        raise AdapterError(
            "binary_checksum_mismatch",
            "local Gentle AI binary does not match the pinned rc.3 checksum",
            operation="review.capabilities",
        )
    result = run_process(
        [str(binary), "review", "capabilities", "--contract", CONTRACT]
    )
    payload = decode_provider_json(result, "review.capabilities")
    if result.returncode != 0:
        raise AdapterError(
            "capabilities_failed",
            payload.get("message", "provider rejected capabilities"),
            operation="review.capabilities",
        )
    validate_capabilities(payload)
    manifest = verify_bundle(bundle)
    return {"capabilities": payload, "bundle_manifest": manifest}


def check_contract_for_scope(
    binary: Path, bundle: Path, scope: dict[str, str | None]
) -> dict[str, Any]:
    try:
        return check_contract(binary, bundle)
    except AdapterError as error:
        if error.scope == "none":
            error.scope = str(scope["name"])
        raise


def mutation_reported(payload: dict[str, Any]) -> bool:
    outcome = payload.get("mutation_outcome")
    return isinstance(outcome, str) and outcome not in {
        "",
        "none",
        "not_started",
        "not_mutated",
    }


def provider_failure(payload: dict[str, Any], scope: str) -> AdapterError:
    return AdapterError(
        str(payload.get("code") or "provider_failure"),
        str(payload.get("message") or "provider rejected the operation"),
        operation=str(payload.get("operation") or "provider.unknown"),
        scope=scope,
        lineage=(extract_binding(payload) or {}).get("lineage_id"),
        allowed_action=str(payload.get("next_action") or "stop"),
        provider_mutated=mutation_reported(payload),
    )


def validate_scope(scope: str, base_ref: str | None) -> dict[str, str | None]:
    if scope not in {"current", "committed-only", "workspace-overlay"}:
        raise AdapterError(
            "scope_invalid",
            f"unsupported scope: {scope}",
            operation="adapter.scope",
            scope=scope,
        )
    if scope == "current" and base_ref is not None:
        raise AdapterError(
            "scope_invalid",
            "current scope cannot carry --base-ref",
            operation="adapter.scope",
            scope=scope,
        )
    if scope != "current" and not base_ref:
        raise AdapterError(
            "base_ref_required",
            f"{scope} requires --base-ref",
            operation="adapter.scope",
            scope=scope,
        )
    return {"name": scope, "base_ref": base_ref}


def scope_tokens(scope: dict[str, str | None]) -> list[str]:
    if scope["name"] == "current":
        return []
    if scope["name"] == "committed-only":
        return [f"--base-ref={scope['base_ref']}", "--committed-only=true"]
    return ["--workspace-overlay=true", f"--base-ref={scope['base_ref']}"]


def state_path(cwd: Path) -> Path:
    return cwd / ".gentle-ai" / "adapter" / "state.json"


def ensure_state_path_safe(cwd: Path) -> Path:
    state_root = cwd / ".gentle-ai"
    adapter_root = state_root / "adapter"
    destination = adapter_root / "state.json"
    for path in (state_root, adapter_root, destination):
        if path.is_symlink():
            raise AdapterError(
                "adapter_state_symlink",
                f"refusing symlinked adapter state path: {path}",
                operation="adapter.state",
            )
    adapter_root.mkdir(parents=True, exist_ok=True)
    if not adapter_root.resolve().is_relative_to(cwd.resolve()):
        raise AdapterError(
            "adapter_state_escape",
            "adapter state directory escapes the repository",
            operation="adapter.state",
        )
    return destination


def load_state(cwd: Path) -> dict[str, Any] | None:
    path = state_path(cwd)
    for candidate in (cwd / ".gentle-ai", path.parent, path):
        if candidate.is_symlink():
            raise AdapterError(
                "adapter_state_symlink",
                f"refusing symlinked adapter state path: {candidate}",
                operation="adapter.state",
            )
    if not path.exists():
        return None
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise AdapterError(
            "adapter_state_invalid",
            f"cannot read adapter state: {error}",
            operation="adapter.state",
        ) from error
    if not isinstance(value, dict) or value.get("schema") != STATE_SCHEMA:
        raise AdapterError(
            "adapter_state_invalid",
            "adapter state schema is unknown",
            operation="adapter.state",
        )
    return value


def save_state(cwd: Path, state: dict[str, Any]) -> None:
    destination = ensure_state_path_safe(cwd)
    file_descriptor, temporary_name = tempfile.mkstemp(
        prefix=".state.", suffix=".json", dir=destination.parent
    )
    try:
        with os.fdopen(file_descriptor, "w", encoding="utf-8") as stream:
            json.dump(state, stream, indent=2, sort_keys=True)
            stream.write("\n")
        os.chmod(temporary_name, 0o600)
        os.replace(temporary_name, destination)
    finally:
        if os.path.exists(temporary_name):
            os.unlink(temporary_name)


def validate_response_schema(payload: dict[str, Any], operation: str) -> None:
    schema = payload.get("schema")
    if schema not in ALLOWED_RESPONSE_SCHEMAS or payload.get("contract") != CONTRACT:
        raise AdapterError(
            "response_schema_unknown",
            f"provider response schema is not admitted: {schema}",
            operation=operation,
        )


def next_execution(payload: dict[str, Any]) -> dict[str, Any] | None:
    transition = payload.get("next_transition")
    if not isinstance(transition, dict) or transition.get("kind") != "execute":
        return None
    execution = transition.get("execute")
    return execution if isinstance(execution, dict) else None


def extract_binding(payload: dict[str, Any]) -> dict[str, str | None] | None:
    execution = next_execution(payload)
    if execution and isinstance(execution.get("binding"), dict):
        binding = execution["binding"]
        return {
            "lineage_id": binding.get("lineage_id"),
            "revision": binding.get("revision"),
            "target_identity": binding.get("target_identity"),
        }
    authority = payload.get("authority")
    if isinstance(authority, dict):
        return {
            "lineage_id": authority.get("lineage_id"),
            "revision": authority.get("revision"),
            "target_identity": payload.get("target_identity"),
        }
    if payload.get("lineage_id"):
        context = (
            payload.get("repository_context")
            if isinstance(payload.get("repository_context"), dict)
            else {}
        )
        return {
            "lineage_id": payload.get("lineage_id"),
            "revision": context.get("revision"),
            "target_identity": payload.get("target_identity")
            or context.get("target_identity"),
        }
    return None


def extract_inventory(payload: dict[str, Any]) -> dict[str, Any]:
    projection = payload.get("projection")
    if not isinstance(projection, dict):
        projection = {}
    execution = next_execution(payload) or {}
    artifacts = (
        execution.get("artifacts", [])
        if isinstance(execution.get("artifacts", []), list)
        else []
    )
    subject_hashes = [
        item.get("subject_hash")
        for item in payload.get("artifact_subjects", [])
        if isinstance(item, dict) and isinstance(item.get("subject_hash"), str)
    ]
    transition = payload.get("next_transition")
    if isinstance(transition, dict) and isinstance(transition.get("collect"), dict):
        for item in transition["collect"].get("inputs", []):
            subject = item.get("artifact_subject") if isinstance(item, dict) else None
            if isinstance(subject, dict) and isinstance(
                subject.get("subject_hash"), str
            ):
                subject_hashes.append(subject["subject_hash"])
    return {
        "paths_digest": projection.get("paths_digest"),
        "intended_untracked": projection.get("intended_untracked", []),
        "intended_untracked_proof": projection.get("intended_untracked_proof"),
        "artifacts": [
            item.get("sha256") for item in artifacts if isinstance(item, dict)
        ],
        "artifact_subjects": subject_hashes,
    }


def validate_drift(
    previous: dict[str, Any], payload: dict[str, Any], *, allow_revision_change: bool
) -> None:
    old_binding = previous.get("binding")
    new_binding = extract_binding(payload)
    if isinstance(old_binding, dict) and isinstance(new_binding, dict):
        if old_binding.get("lineage_id") != new_binding.get("lineage_id"):
            raise AdapterError(
                "lineage_drift",
                "provider lineage changed outside an admitted transition",
                operation="adapter.status",
                lineage=old_binding.get("lineage_id"),
            )
        if old_binding.get("target_identity") != new_binding.get("target_identity"):
            raise AdapterError(
                "target_drift",
                "provider target changed outside an admitted transition",
                operation="adapter.status",
                lineage=old_binding.get("lineage_id"),
            )
        if not allow_revision_change and old_binding.get("revision") != new_binding.get(
            "revision"
        ):
            raise AdapterError(
                "revision_stale",
                "provider revision changed during a read-only transition",
                operation="adapter.status",
                lineage=old_binding.get("lineage_id"),
            )
    old_inventory = previous.get("inventory")
    new_inventory = extract_inventory(payload)
    if isinstance(old_inventory, dict):
        stable_keys = ["intended_untracked", "intended_untracked_proof"]
        if not allow_revision_change:
            stable_keys.extend(["paths_digest", "artifacts", "artifact_subjects"])
        for key in stable_keys:
            if old_inventory.get(key) and old_inventory.get(key) != new_inventory.get(
                key
            ):
                raise AdapterError(
                    "untracked_inventory_drift"
                    if key.startswith("intended_untracked")
                    else "artifact_inventory_drift",
                    "artifact inventory changed outside an admitted transition",
                    operation="adapter.status",
                    lineage=(old_binding or {}).get("lineage_id"),
                )


def normalize(
    payload: dict[str, Any], scope: str, *, acknowledged: bool = False
) -> dict[str, Any]:
    authority = (
        payload.get("authority") if isinstance(payload.get("authority"), dict) else {}
    )
    provider_state = payload.get("state") or authority.get("state")
    transition = (
        payload.get("next_transition")
        if isinstance(payload.get("next_transition"), dict)
        else {}
    )
    execution = next_execution(payload)
    reason = transition.get("reason_code")
    paths = (
        payload.get("projection", {}).get("paths", [])
        if isinstance(payload.get("projection"), dict)
        else []
    )

    if acknowledged:
        state = "approved"
    elif payload.get("schema") == FAILURE_SCHEMA:
        state = "rejected"
    elif reason == "rdd_disabled":
        state = "disabled"
    elif (
        provider_state == "approved"
        and execution
        and execution.get("operation") == "review.acknowledge-approved"
    ):
        state = "approved_pending_ack"
    elif provider_state == "approved":
        state = "approved"
    elif provider_state in {
        "correction_required",
        "fixing",
        "fix_validating",
        "validating",
    }:
        state = "needs_correction"
    elif provider_state in {"escalated", "rejected"}:
        state = "rejected"
    elif payload.get("schema") == CONSENT_SCHEMA:
        state = "not_started"
    elif transition.get("kind") == "stop":
        state = (
            "clean_without_review"
            if not paths and reason in {"clean", "no_changes", "not_applicable"}
            else "stopped"
        )
    elif provider_state == "reviewing":
        state = "reviewing"
    elif (
        payload.get("action") == "start"
        or execution
        and execution.get("operation") == "review.start"
    ):
        state = "not_started"
    elif not paths and payload.get("applicability") == "unrelated":
        state = "clean_without_review"
    else:
        state = "stopped"

    if state not in NORMAL_STATES:
        raise AdapterError(
            "normalization_failed",
            f"unrecognized normalized state: {state}",
            operation="adapter.normalize",
            scope=scope,
        )
    binding = extract_binding(payload) or {}
    if payload.get("schema") == CONSENT_SCHEMA:
        allowed_action = "request_consent"
    elif execution:
        allowed_action = "step"
    elif transition.get("kind") == "collect":
        allowed_action = "collect"
    else:
        allowed_action = "stop"
    return {
        "schema": ADAPTER_SCHEMA,
        "state": state,
        "code": payload.get("code") or reason or "ok",
        "operation": payload.get(
            "operation", "review.acknowledge-approved" if acknowledged else "unknown"
        ),
        "scope": scope,
        "lineage": binding.get("lineage_id"),
        "revision": binding.get("revision"),
        "target": binding.get("target_identity") or payload.get("target_identity"),
        "allowed_action": allowed_action,
        "provider_mutated": acknowledged or mutation_reported(payload),
        "inventory": extract_inventory(payload),
        "provider": payload,
    }


def validate_transition(
    execution: dict[str, Any],
    scope: dict[str, str | None],
    cwd: Path,
    binding: dict[str, Any] | None,
) -> tuple[list[str], str]:
    operation = execution.get("operation")
    if operation not in OPERATION_COMMANDS:
        raise AdapterError(
            "transition_operation_rejected",
            f"transition operation is not allowed: {operation}",
            operation="adapter.step",
            scope=str(scope["name"]),
        )
    arguments = execution.get("arguments")
    command = execution.get("command")
    if not isinstance(arguments, list) or not isinstance(command, str):
        raise AdapterError(
            "transition_shape_invalid",
            "transition lacks ordered arguments or command",
            operation=str(operation),
            scope=str(scope["name"]),
        )
    tokens: list[str] = []
    names: list[str] = []
    for argument in arguments:
        if not isinstance(argument, dict):
            raise AdapterError(
                "transition_argument_invalid",
                "transition argument must be an object",
                operation=str(operation),
                scope=str(scope["name"]),
            )
        name, value, token = (
            argument.get("name"),
            argument.get("value"),
            argument.get("token"),
        )
        if name not in OPERATION_ARGUMENTS[str(operation)]:
            raise AdapterError(
                "transition_argument_rejected",
                f"transition argument is not allowed for {operation}: {name}",
                operation=str(operation),
                scope=str(scope["name"]),
            )
        if (
            not all(isinstance(item, str) and item for item in (name, value, token))
            or token != f"--{name}={value}"
        ):
            raise AdapterError(
                "transition_token_altered",
                "transition token does not exactly encode its name/value",
                operation=str(operation),
                scope=str(scope["name"]),
            )
        if name in names and name != "intended-untracked":
            raise AdapterError(
                "transition_argument_duplicate",
                f"duplicate transition argument: {name}",
                operation=str(operation),
                scope=str(scope["name"]),
            )
        names.append(name)
        tokens.append(token)
    expected_command = ["gentle-ai", *OPERATION_COMMANDS[str(operation)], *tokens]
    try:
        rendered_command = shlex.split(command)
    except ValueError as error:
        raise AdapterError(
            "transition_command_invalid",
            str(error),
            operation=str(operation),
            scope=str(scope["name"]),
        ) from error
    if rendered_command != expected_command:
        raise AdapterError(
            "transition_command_altered",
            "rendered command differs from ordered provider tokens",
            operation=str(operation),
            scope=str(scope["name"]),
        )
    transition_binding = execution.get("binding")
    if not isinstance(transition_binding, dict):
        raise AdapterError(
            "transition_binding_missing",
            "transition lacks a binding",
            operation=str(operation),
            scope=str(scope["name"]),
        )
    if binding:
        for key in ("lineage_id", "revision", "target_identity"):
            if binding.get(key) and transition_binding.get(key) != binding.get(key):
                raise AdapterError(
                    f"{key.replace('_identity', '').replace('_id', '')}_drift",
                    f"transition {key} differs from stored binding",
                    operation=str(operation),
                    scope=str(scope["name"]),
                    lineage=binding.get("lineage_id"),
                )
    values = {item["name"]: item["value"] for item in arguments}
    if operation == "review.acknowledge-approved" and names != [
        "cwd",
        "lineage",
        "target",
        "expected-revision",
        "token",
    ]:
        raise AdapterError(
            "acknowledgement_shape_invalid",
            "acknowledgement arguments are not the exact ordered five-token binding",
            operation=str(operation),
            scope=str(scope["name"]),
        )
    if "cwd" in values and Path(values["cwd"]).resolve() != cwd:
        raise AdapterError(
            "transition_cwd_rejected",
            "transition attempts to execute outside the bound repository",
            operation=str(operation),
            scope=str(scope["name"]),
        )
    if operation != "review.acknowledge-approved":
        if scope["name"] == "current" and any(
            name in values
            for name in ("base-ref", "committed-only", "workspace-overlay")
        ):
            raise AdapterError(
                "scope_drift",
                "current transition contains another scope selector",
                operation=str(operation),
                scope="current",
            )
        if scope["name"] == "committed-only":
            if (
                values.get("base-ref") != scope["base_ref"]
                or values.get("committed-only") != "true"
                or "workspace-overlay" in values
            ):
                raise AdapterError(
                    "scope_drift",
                    "committed-only transition selectors changed",
                    operation=str(operation),
                    scope="committed-only",
                )
        if scope["name"] == "workspace-overlay":
            if (
                values.get("base-ref") != scope["base_ref"]
                or values.get("workspace-overlay") != "true"
                or "committed-only" in values
            ):
                raise AdapterError(
                    "scope_drift",
                    "workspace-overlay transition selectors changed",
                    operation=str(operation),
                    scope="workspace-overlay",
                )
    return [*OPERATION_COMMANDS[str(operation)], *tokens], canonical_digest(execution)


def ensure_repository(cwd: Path) -> None:
    result = run_process(["git", "-C", str(cwd), "rev-parse", "--show-toplevel"])
    if result.returncode != 0 or Path(result.stdout.strip()).resolve() != cwd:
        raise AdapterError(
            "repository_invalid",
            "--cwd must be the root of an existing Git repository",
            operation="adapter.scope",
        )


def scope_matches(state: dict[str, Any], scope: dict[str, str | None]) -> None:
    if state.get("scope") != scope:
        raise AdapterError(
            "scope_drift",
            "requested scope differs from persisted transaction scope",
            operation="adapter.state",
            scope=str(scope["name"]),
            lineage=(state.get("binding") or {}).get("lineage_id"),
        )


def new_state(
    scope: dict[str, str | None],
    payload: dict[str, Any],
    attempted: list[str] | None = None,
) -> dict[str, Any]:
    return {
        "schema": STATE_SCHEMA,
        "scope": scope,
        "binding": extract_binding(payload),
        "inventory": extract_inventory(payload),
        "raw": payload,
        "attempted_transition_digests": attempted or [],
    }


def adapter_status(
    binary: Path, bundle: Path, cwd: Path, scope: dict[str, str | None]
) -> dict[str, Any]:
    check_contract_for_scope(binary, bundle, scope)
    ensure_repository(cwd)
    previous = load_state(cwd)
    attempted: list[str] = []
    if previous:
        attempted = list(previous.get("attempted_transition_digests", []))
        cached = normalize(previous.get("raw", {}), str(scope["name"]))
        active = cached["state"] in {
            "not_started",
            "reviewing",
            "needs_correction",
            "approved_pending_ack",
        }
        if active:
            scope_matches(previous, scope)
            if (next_execution(previous.get("raw", {})) or {}).get(
                "operation"
            ) != "review.status":
                return cached
        else:
            previous = None
    execution = next_execution(previous.get("raw", {})) if previous else None
    if execution and execution.get("operation") == "review.status":
        argv, _ = validate_transition(execution, scope, cwd, previous.get("binding"))
        result = run_process([str(binary), *argv], cwd=cwd)
    else:
        argv = [
            str(binary),
            "review",
            "status",
            f"--cwd={cwd}",
            f"--contract={CONTRACT}",
            "--agent=codex",
            "--next-transition=true",
            *scope_tokens(scope),
        ]
        result = run_process(argv, cwd=cwd)
    payload = decode_provider_json(result, "review.status")
    validate_response_schema(payload, "review.status")
    if previous:
        validate_drift(previous, payload, allow_revision_change=False)
    save_state(cwd, new_state(scope, payload, attempted))
    normalized = normalize(payload, str(scope["name"]))
    if payload.get("schema") == FAILURE_SCHEMA:
        raise provider_failure(payload, str(scope["name"]))
    if result.returncode != 0 and payload.get("schema") != FAILURE_SCHEMA:
        raise AdapterError(
            "provider_status_failed",
            result.stderr.strip() or "provider status failed",
            operation="review.status",
            scope=str(scope["name"]),
        )
    return normalized


def adapter_step(
    binary: Path, bundle: Path, cwd: Path, scope: dict[str, str | None]
) -> dict[str, Any]:
    check_contract_for_scope(binary, bundle, scope)
    ensure_repository(cwd)
    previous = load_state(cwd)
    if not previous:
        raise AdapterError(
            "transaction_not_started",
            "run adapter status before adapter step",
            operation="adapter.step",
            scope=str(scope["name"]),
            allowed_action="status",
        )
    scope_matches(previous, scope)
    execution = next_execution(previous.get("raw", {}))
    if not execution:
        raise AdapterError(
            "transition_not_executable",
            "provider did not issue next_transition.execute",
            operation="adapter.step",
            scope=str(scope["name"]),
            lineage=(previous.get("binding") or {}).get("lineage_id"),
            allowed_action="stop",
        )
    argv, digest = validate_transition(execution, scope, cwd, previous.get("binding"))
    attempted = list(previous.get("attempted_transition_digests", []))
    if digest in attempted and execution.get("operation") in MUTATING_OPERATIONS:
        raise AdapterError(
            "transition_replay",
            "mutating transition was already attempted; re-query status",
            operation=str(execution.get("operation")),
            scope=str(scope["name"]),
            lineage=(previous.get("binding") or {}).get("lineage_id"),
            allowed_action="status",
        )
    if execution.get("operation") in MUTATING_OPERATIONS:
        attempted.append(digest)
        previous["attempted_transition_digests"] = attempted
        save_state(cwd, previous)
    result = run_process([str(binary), *argv], cwd=cwd)
    if (
        execution.get("operation") == "review.acknowledge-approved"
        and result.returncode == 0
        and not result.stdout.strip()
    ):
        payload = {
            "schema": STATUS_SCHEMA,
            "contract": CONTRACT,
            "operation": "review.acknowledge-approved",
            "state": "approved",
            "target_identity": (previous.get("binding") or {}).get("target_identity"),
        }
        save_state(cwd, new_state(scope, payload, attempted))
        return normalize(payload, str(scope["name"]), acknowledged=True)
    payload = decode_provider_json(result, str(execution.get("operation")))
    validate_response_schema(payload, str(execution.get("operation")))
    validate_drift(
        previous,
        payload,
        allow_revision_change=execution.get("operation") in MUTATING_OPERATIONS,
    )
    save_state(cwd, new_state(scope, payload, attempted))
    normalized = normalize(payload, str(scope["name"]))
    if payload.get("schema") == FAILURE_SCHEMA:
        raise provider_failure(payload, str(scope["name"]))
    if result.returncode != 0 and payload.get("schema") != FAILURE_SCHEMA:
        raise AdapterError(
            "provider_step_failed",
            result.stderr.strip() or "provider step failed",
            operation=str(execution.get("operation")),
            scope=str(scope["name"]),
            lineage=normalized.get("lineage"),
            provider_mutated=execution.get("operation") in MUTATING_OPERATIONS,
        )
    return normalized


def print_json(payload: dict[str, Any]) -> None:
    json.dump(payload, sys.stdout, indent=2, sort_keys=True)
    sys.stdout.write("\n")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--binary", required=True, type=Path)
    parser.add_argument("--bundle", required=True, type=Path)
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("contract-check")
    commands.add_parser("capabilities")
    adapter = commands.add_parser("adapter")
    adapter_commands = adapter.add_subparsers(dest="adapter_command", required=True)
    for name in ("status", "step"):
        command = adapter_commands.add_parser(name)
        command.add_argument("--scope", required=True)
        command.add_argument("--base-ref")
        command.add_argument("--cwd", default=".", type=Path)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    binary = args.binary.resolve()
    bundle = args.bundle.resolve()
    if args.command == "contract-check":
        check_contract(binary, bundle)
        return 0
    if args.command == "capabilities":
        checked = check_contract(binary, bundle)
        print_json(
            {
                "schema": ADAPTER_SCHEMA,
                "state": "approved",
                "code": "contract_admitted",
                "operation": "review.capabilities",
                "scope": "none",
                "lineage": None,
                "allowed_action": "status",
                "provider_mutated": False,
                **checked,
            }
        )
        return 0
    scope = validate_scope(args.scope, args.base_ref)
    cwd = args.cwd.resolve()
    if args.adapter_command == "status":
        print_json(adapter_status(binary, bundle, cwd, scope))
    else:
        print_json(adapter_step(binary, bundle, cwd, scope))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except AdapterError as error:
        print_json(error.payload())
        raise SystemExit(2)
