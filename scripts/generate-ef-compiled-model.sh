#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}"

PROJECT_DIR="${ROOT}/packages/server/generated"
PROJECT="${PROJECT_DIR}/tsonic.csproj"
OUTDIR="${PROJECT_DIR}/ef-compiled-model"
LEGACY_OUTDIR="${PROJECT_DIR}/packages/server/generated/ef-compiled-model"

if [ ! -f "${PROJECT}" ]; then
  echo "error: missing ${PROJECT}"
  echo "run: tsonic generate --project server"
  exit 1
fi

rm -rf "${OUTDIR}"
rm -rf "${LEGACY_OUTDIR}"
mkdir -p "${OUTDIR}"

dotnet tool restore >/dev/null

pushd "${PROJECT_DIR}" >/dev/null

# Ensure NuGet assets exist for dotnet-ef to load project metadata.
dotnet restore "tsonic.csproj" >/dev/null

# dotnet-ef's internal build step is surprisingly brittle for this project when
# NativeAOT + interceptors are enabled. Make the build deterministic by building
# once (non-AOT) and then running optimize with --no-build.
dotnet build "tsonic.csproj" \
  /p:PublishAot=false \
  /p:EFOptimizeContext=false \
  >/dev/null

dotnet ef dbcontext optimize \
  --no-build \
  --project "tsonic.csproj" \
  --output-dir "ef-compiled-model" \
  --precompile-queries \
  --nativeaot \
  --namespace "Clickmeter.Server.db" \
  --context "ClickmeterDbContext"
popd >/dev/null

echo "✓ EF compiled model generated: packages/server/generated/ef-compiled-model"
