#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo "  ARCANE VS STEEL — Local macOS + Xcode Workspace Setup"
echo "============================================================"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "[!] Note: This setup script is designed to run on your Mac (macOS Terminal)."
fi

TARGET_ROOT="${HOME}/Developer"
REPO_DIR="${TARGET_ROOT}/arcane-vs-steel"
REPO_URL="https://github.com/pandora523/arcane-vs-steel.git"

mkdir -p "${TARGET_ROOT}"

if [[ -d "${REPO_DIR}/.git" ]]; then
  echo "[1/4] Updating existing local repository at ${REPO_DIR}..."
  git -C "${REPO_DIR}" fetch origin main
  git -C "${REPO_DIR}" pull --ff-only origin main
else
  echo "[1/4] Cloning pandora523/arcane-vs-steel into ${REPO_DIR}..."
  git clone "${REPO_URL}" "${REPO_DIR}"
fi

echo "[2/4] Checking local Xcode installation..."
if [[ -d "/Applications/Xcode.app" ]]; then
  echo "  [OK] Found /Applications/Xcode.app"
  CURRENT_DEV_DIR="$(xcode-select -p 2>/dev/null || true)"
  if [[ "${CURRENT_DEV_DIR}" != "/Applications/Xcode.app/Contents/Developer" ]]; then
    echo "  [i] Pointing xcode-select to /Applications/Xcode.app (may ask for Mac password)..."
    sudo xcode-select -s /Applications/Xcode.app/Contents/Developer || true
  fi
  xcodebuild -version || true
else
  echo "  [!] /Applications/Xcode.app not found yet. Install Xcode from the Mac App Store before starting the Swift build."
fi

echo "[3/4] Checking Node.js (for web test suites)..."
if command -v node >/dev/null 2>&1; then
  echo "  [OK] Node $(node -v) ready"
else
  echo "  [i] Node.js not found in PATH (optional — only needed for web JS test suites)."
fi

echo "[4/4] Launching Google Antigravity on your Mac..."
if [[ -d "/Applications/Antigravity.app" ]]; then
  echo "  [OK] Found /Applications/Antigravity.app — opening ${REPO_DIR}!"
  open -a "/Applications/Antigravity.app" "${REPO_DIR}" || open -a "/Applications/Antigravity.app"
elif [[ -d "/Applications/Google Antigravity.app" ]]; then
  echo "  [OK] Found /Applications/Google Antigravity.app — opening ${REPO_DIR}!"
  open -a "/Applications/Google Antigravity.app" "${REPO_DIR}" || open -a "/Applications/Google Antigravity.app"
elif [[ -d "/Applications/Antigravity IDE.app" ]]; then
  echo "  [OK] Found /Applications/Antigravity IDE.app — opening ${REPO_DIR}!"
  open -a "/Applications/Antigravity IDE.app" "${REPO_DIR}" || open -a "/Applications/Antigravity IDE.app"
else
  echo "  [i] Antigravity Mac App is not in /Applications yet."
  echo "      Opening official download page (https://antigravity.google/download) in your browser..."
  open "https://antigravity.google/download" 2>/dev/null || true
fi

echo ""
echo "============================================================"
echo "  READY! Local repo path: ${REPO_DIR}"
echo "  In Antigravity on your Mac:"
echo "    1. Click 'New Project' (folder+) -> 'Add Folder' -> select:"
echo "       ${REPO_DIR}"
echo "    2. Pick 'Local' mode and start chatting!"
echo "    (AGENTS.md & .agents/skills/arcane-vs-steel-pipeline are"
echo "     already bundled inside the repo — zero context lost!)"
echo "============================================================"
