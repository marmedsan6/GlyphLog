#!/usr/bin/env bash
set -euo pipefail

VERSION="2.5.0-rc.3"
BINARY_ASSET="gentle-ai_${VERSION}_linux_amd64"
BINARY_SHA256="b69da0a51b03f326147498ae465fc1ec52eff8427d579964eefad714c3f9bd87"
CONTRACT_ASSET="gentle-ai-review-provider-contract-1.1.0.tar.gz"
CONTRACT_SHA256="1acabf9cc45f6d2205fca11b31e44f4fb45015e16c677aea61060f9bd3feb85b"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
REPOSITORY_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd -P)"
CACHE_ROOT="${REPOSITORY_ROOT}/.gentle-ai"
BINARY="${CACHE_ROOT}/bin/gentle-ai"
CONTRACT="${CACHE_ROOT}/contracts/${CONTRACT_ASSET}"
ADAPTER="${SCRIPT_DIR}/gentle_ai_adapter.py"
RELEASE_URL="https://github.com/Gentleman-Programming/gentle-ai/releases/download/v${VERSION}"

fail() {
  printf 'gentle-ai wrapper: %s\n' "$1" >&2
  exit 2
}

verify_sha256() {
  local expected="$1"
  local path="$2"
  [[ -f "${path}" ]] && printf '%s  %s\n' "${expected}" "${path}" | sha256sum --check --status
}

download_verified() {
  local asset="$1"
  local expected="$2"
  local destination="$3"
  local destination_dir
  local temporary

  destination_dir="$(dirname "${destination}")"
  mkdir -p "${destination_dir}"
  temporary="$(mktemp "${destination_dir}/.${asset}.download.XXXXXX")"
  trap 'rm -f "${temporary}"' EXIT
  curl --fail --location --max-time 120 --output "${temporary}" "${RELEASE_URL}/${asset}"
  verify_sha256 "${expected}" "${temporary}" || fail "checksum mismatch for ${asset}"
  chmod 600 "${temporary}"
  mv "${temporary}" "${destination}"
  trap - EXIT
}

ensure_platform() {
  [[ "$(uname -s)" == "Linux" && "$(uname -m)" == "x86_64" ]] ||
    fail "unsupported pinned platform $(uname -s)/$(uname -m); expected Linux/x86_64"
}

ensure_cache_safety() {
  local path
  for path in "${CACHE_ROOT}" "${CACHE_ROOT}/bin" "${CACHE_ROOT}/contracts" "${BINARY}" "${CONTRACT}"; do
    [[ ! -L "${path}" ]] || fail "refusing symlinked cache path ${path}"
  done
  mkdir -p "${CACHE_ROOT}/bin" "${CACHE_ROOT}/contracts"
  [[ "$(realpath -e "${CACHE_ROOT}")" == "${REPOSITORY_ROOT}/.gentle-ai" ]] ||
    fail "cache root escapes the repository"
}

ensure_binary() {
  ensure_platform
  ensure_cache_safety
  if [[ ! -x "${BINARY}" ]] || ! verify_sha256 "${BINARY_SHA256}" "${BINARY}"; then
    download_verified "${BINARY_ASSET}" "${BINARY_SHA256}" "${BINARY}"
    chmod 755 "${BINARY}"
  fi
}

ensure_contract() {
  ensure_cache_safety
  if ! verify_sha256 "${CONTRACT_SHA256}" "${CONTRACT}"; then
    download_verified "${CONTRACT_ASSET}" "${CONTRACT_SHA256}" "${CONTRACT}"
  fi
}

run_adapter() {
  ensure_binary
  ensure_contract
  exec python3 "${ADAPTER}" --binary "${BINARY}" --bundle "${CONTRACT}" "$@"
}

run_review_mode() {
  local action="${1:-}"
  shift || true
  local authorized="false"
  local forwarded=()

  [[ "${action}" == "status" || "${action}" == "enable" || "${action}" == "disable" ]] ||
    fail "review mode accepts only status, enable, or disable"

  while (($#)); do
    if [[ "$1" == "--user-authorized" ]]; then
      authorized="true"
    else
      forwarded+=("$1")
    fi
    shift
  done

  if [[ "${action}" != "status" && "${authorized}" != "true" ]]; then
    fail "review mode ${action} requires explicit user authorization and --user-authorized"
  fi

  ensure_binary
  if [[ "${action}" == "enable" ]]; then
    ensure_contract
    python3 "${ADAPTER}" --binary "${BINARY}" --bundle "${CONTRACT}" contract-check
  fi
  exec "${BINARY}" review mode "${action}" "${forwarded[@]}"
}

case "${1:-}" in
  version)
    shift
    (($# == 0)) || fail "version accepts no arguments"
    ensure_binary
    exec "${BINARY}" version
    ;;
  capabilities)
    shift
    run_adapter capabilities "$@"
    ;;
  adapter)
    shift
    run_adapter adapter "$@"
    ;;
  review)
    shift
    [[ "${1:-}" == "mode" ]] || fail "raw review commands are blocked; use 'adapter status' or 'adapter step'"
    shift
    run_review_mode "$@"
    ;;
  *)
    fail "usage: gentle-ai.sh <version|capabilities|adapter status|adapter step|review mode>"
    ;;
esac
