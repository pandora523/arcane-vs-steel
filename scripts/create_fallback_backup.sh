#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

RAW_LABEL="${1:-manual}"
SAFE_LABEL="$(printf '%s' "${RAW_LABEL}" | tr -cs 'A-Za-z0-9._-' '_' | sed 's/^_//; s/_$//')"
if [[ -z "${SAFE_LABEL}" ]]; then
  SAFE_LABEL="manual"
fi

TIMESTAMP="$(date +"%Y%m%d_%H%M%S")"
SHORT_SHA="$(git -C "${REPO_ROOT}" rev-parse --short HEAD 2>/dev/null || echo "nogit")"

BACKUP_ROOT="${REPO_ROOT}/fallback_backups"
mkdir -p "${BACKUP_ROOT}"

SNAPSHOT_NAME="${TIMESTAMP}_${SHORT_SHA}_${SAFE_LABEL}"
SNAPSHOT_DIR="${BACKUP_ROOT}/${SNAPSHOT_NAME}"
SUFFIX=2
while [[ -e "${SNAPSHOT_DIR}" ]]; do
  SNAPSHOT_NAME="${TIMESTAMP}_${SHORT_SHA}_${SAFE_LABEL}_${SUFFIX}"
  SNAPSHOT_DIR="${BACKUP_ROOT}/${SNAPSHOT_NAME}"
  SUFFIX=$((SUFFIX + 1))
done

mkdir -p "${SNAPSHOT_DIR}"

TOP_FILES=(
  "index.html"
  "style.css"
  "manifest.json"
  "vercel.json"
  "AGENTS.md"
)

for f in "${TOP_FILES[@]}"; do
  if [[ -f "${REPO_ROOT}/${f}" ]]; then
    cp -p "${REPO_ROOT}/${f}" "${SNAPSHOT_DIR}/${f}"
  fi
done

rsync -a \
  --exclude='.DS_Store' \
  --exclude='__pycache__' \
  --exclude='*.pyc' \
  "${REPO_ROOT}/src/" "${SNAPSHOT_DIR}/src/"

rsync -a \
  --exclude='.DS_Store' \
  "${REPO_ROOT}/assets/" "${SNAPSHOT_DIR}/assets/"

rsync -a \
  --exclude='/build' \
  --exclude='/.build' \
  --exclude='DerivedData' \
  --exclude='xcuserdata' \
  --exclude='*.xcuserstate' \
  --exclude='.DS_Store' \
  "${REPO_ROOT}/apple/" "${SNAPSHOT_DIR}/apple/"

rsync -a \
  --exclude='.DS_Store' \
  --exclude='__pycache__' \
  --exclude='*.pyc' \
  "${REPO_ROOT}/scripts/" "${SNAPSHOT_DIR}/scripts/"

if [[ -d "${REPO_ROOT}/build" ]]; then
  rsync -a \
    --exclude='.DS_Store' \
    --exclude='__pycache__' \
    --exclude='*.pyc' \
    "${REPO_ROOT}/build/" "${SNAPSHOT_DIR}/build/"
fi

cat > "${SNAPSHOT_DIR}/RESTORE_THIS_BACKUP.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

SNAPSHOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_REPO="${1:-$(cd "${SNAPSHOT_DIR}/../.." && pwd)}"

if [[ ! -f "${SNAPSHOT_DIR}/index.html" || ! -d "${SNAPSHOT_DIR}/src" || ! -d "${SNAPSHOT_DIR}/assets" ]]; then
  echo "[ERROR] Invalid backup snapshot at ${SNAPSHOT_DIR}" >&2
  exit 1
fi

if [[ ! -d "${TARGET_REPO}" ]]; then
  echo "[ERROR] Target workspace directory does not exist: ${TARGET_REPO}" >&2
  exit 1
fi

echo "[1/3] Verifying SHA-256 checksums for $(basename "${SNAPSHOT_DIR}")..."
(
  cd "${SNAPSHOT_DIR}"
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 -c SHA256SUMS.txt >/dev/null
  else
    sha256sum -c SHA256SUMS.txt >/dev/null
  fi
)

echo "[2/3] Restoring top-level files and directories into ${TARGET_REPO}..."
for f in "index.html" "style.css" "manifest.json" "vercel.json" "AGENTS.md"; do
  if [[ -f "${SNAPSHOT_DIR}/${f}" ]]; then
    cp -p "${SNAPSHOT_DIR}/${f}" "${TARGET_REPO}/${f}"
  fi
done

rsync -a --delete \
  --exclude='.DS_Store' \
  --exclude='__pycache__' \
  --exclude='*.pyc' \
  "${SNAPSHOT_DIR}/src/" "${TARGET_REPO}/src/"

rsync -a --delete \
  --exclude='.DS_Store' \
  "${SNAPSHOT_DIR}/assets/" "${TARGET_REPO}/assets/"

rsync -a --delete \
  --exclude='/build' \
  --exclude='/.build' \
  --exclude='DerivedData' \
  --exclude='xcuserdata' \
  --exclude='*.xcuserstate' \
  --exclude='.DS_Store' \
  "${SNAPSHOT_DIR}/apple/" "${TARGET_REPO}/apple/"

rsync -a --delete \
  --exclude='.DS_Store' \
  --exclude='__pycache__' \
  --exclude='*.pyc' \
  "${SNAPSHOT_DIR}/scripts/" "${TARGET_REPO}/scripts/"

if [[ -d "${SNAPSHOT_DIR}/build" ]]; then
  mkdir -p "${TARGET_REPO}/build"
  rsync -a --delete \
    --exclude='.DS_Store' \
    --exclude='__pycache__' \
    --exclude='*.pyc' \
    "${SNAPSHOT_DIR}/build/" "${TARGET_REPO}/build/"
elif [[ -d "${TARGET_REPO}/build" ]]; then
  rm -rf "${TARGET_REPO}/build"
fi

if [[ -d "${TARGET_REPO}/dist" ]]; then
  rm -rf "${TARGET_REPO}/dist"
fi

echo "[3/3] Restore complete: ${TARGET_REPO} restored from ${SNAPSHOT_DIR}"
EOF

chmod +x "${SNAPSHOT_DIR}/RESTORE_THIS_BACKUP.sh"

(
  cd "${SNAPSHOT_DIR}"
  if command -v shasum >/dev/null 2>&1; then
    find . -type f ! -name 'SHA256SUMS.txt' ! -name '.DS_Store' \
      | sed 's|^\./||' \
      | LC_ALL=C sort \
      | tr '\n' '\0' \
      | xargs -0 shasum -a 256 > SHA256SUMS.txt
  else
    find . -type f ! -name 'SHA256SUMS.txt' ! -name '.DS_Store' \
      | sed 's|^\./||' \
      | LC_ALL=C sort \
      | tr '\n' '\0' \
      | xargs -0 sha256sum > SHA256SUMS.txt
  fi
)

FILE_COUNT="$(wc -l < "${SNAPSHOT_DIR}/SHA256SUMS.txt" | tr -d ' ')"
echo "[OK] Fallback backup created: ${SNAPSHOT_DIR} (${FILE_COUNT} files hashed)"
