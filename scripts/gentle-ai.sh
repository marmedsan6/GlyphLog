#!/usr/bin/env bash
set -euo pipefail

VERSION="2.5.0-rc.1"
ASSET="gentle-ai_${VERSION}_linux_amd64"
EXPECTED_SHA256="a82cfd9edbba39b3ebc970ca42df1ce691c3ee7503ac53a24a856b3965ff0991"
REPOSITORY_ROOT="$(git rev-parse --show-toplevel)"
INSTALL_DIR="${REPOSITORY_ROOT}/.gentle-ai/bin"
BINARY="${INSTALL_DIR}/gentle-ai"

verify_binary() {
  [[ -f "$1" ]] && printf '%s  %s\n' "${EXPECTED_SHA256}" "$1" | sha256sum --check --status
}

if [[ "$(uname -s)" != "Linux" || "$(uname -m)" != "x86_64" ]]; then
  printf 'Unsupported platform for the pinned GlyphLog experiment: %s/%s\n' "$(uname -s)" "$(uname -m)" >&2
  exit 1
fi

if [[ ! -x "${BINARY}" ]] || ! verify_binary "${BINARY}"; then
  mkdir -p "${INSTALL_DIR}"
  TEMP_BINARY="${BINARY}.download.$$"
  DOWNLOAD_URL="https://github.com/Gentleman-Programming/gentle-ai/releases/download/v${VERSION}/${ASSET}"
  trap 'rm -f "${TEMP_BINARY}"' EXIT

  curl --fail --location --max-time 120 --output "${TEMP_BINARY}" "${DOWNLOAD_URL}"
  verify_binary "${TEMP_BINARY}"
  chmod 755 "${TEMP_BINARY}"
  mv "${TEMP_BINARY}" "${BINARY}"
  trap - EXIT
fi

exec "${BINARY}" "$@"
