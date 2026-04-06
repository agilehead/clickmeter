#!/usr/bin/env bash
set -euo pipefail

CLICKMETER_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TSONIC_REPOS_ROOT="${TSONIC_REPOS_ROOT:-$(cd "${CLICKMETER_ROOT}/../../tsoniclang" && pwd)}"

LOCAL_ASPNETCORE_PACKAGE="${TSONIC_REPOS_ROOT}/aspnetcore"
LOCAL_CORE_PACKAGE="${TSONIC_REPOS_ROOT}/core/versions/10"
LOCAL_DOTNET_PACKAGE="${TSONIC_REPOS_ROOT}/dotnet/versions/10"
LOCAL_EFCORE_PACKAGE="${TSONIC_REPOS_ROOT}/efcore"
LOCAL_EFCORE_SQLITE_PACKAGE="${TSONIC_REPOS_ROOT}/efcore-sqlite"
LOCAL_GLOBALS_PACKAGE="${TSONIC_REPOS_ROOT}/globals/versions/10"
LOCAL_MICROSOFT_EXTENSIONS_PACKAGE="${TSONIC_REPOS_ROOT}/microsoft-extensions"

ensure_local_package_exists() {
  local package_root="$1"
  local label="$2"
  if [[ ! -e "${package_root}" ]]; then
    echo "FAIL: local ${label} package root missing: ${package_root}" >&2
    exit 1
  fi
}

link_local_package() {
  local install_root="$1"
  local package_name="$2"
  local package_root="$3"
  local scope_dir="${install_root}/node_modules/@tsonic"
  local destination="${scope_dir}/${package_name}"

  if [[ ! -d "${scope_dir}" ]]; then
    echo "FAIL: expected scope directory missing: ${scope_dir}" >&2
    exit 1
  fi

  ensure_local_package_exists "${package_root}" "@tsonic/${package_name}"

  rm -rf "${destination}"
  ln -s "${package_root}" "${destination}"
}

overlay_local_first_party_packages() {
  local install_root="${1:-${CLICKMETER_ROOT}}"

  if [[ ! -d "${install_root}/node_modules/@tsonic" ]]; then
    echo "FAIL: expected @tsonic scope directory missing: ${install_root}/node_modules/@tsonic" >&2
    exit 1
  fi

  echo "=== overlay local first-party packages: ${install_root} ==="
  link_local_package "${install_root}" aspnetcore "${LOCAL_ASPNETCORE_PACKAGE}"
  link_local_package "${install_root}" core "${LOCAL_CORE_PACKAGE}"
  link_local_package "${install_root}" dotnet "${LOCAL_DOTNET_PACKAGE}"
  link_local_package "${install_root}" efcore "${LOCAL_EFCORE_PACKAGE}"
  link_local_package "${install_root}" efcore-sqlite "${LOCAL_EFCORE_SQLITE_PACKAGE}"
  link_local_package "${install_root}" globals "${LOCAL_GLOBALS_PACKAGE}"
  link_local_package "${install_root}" microsoft-extensions "${LOCAL_MICROSOFT_EXTENSIONS_PACKAGE}"
}
