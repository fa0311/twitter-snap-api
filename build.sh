#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TEMP_DIR="${SCRIPT_DIR}/.temp"
TARGET_DIR="${TEMP_DIR}/ffmpeg"

URL="https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-n8.0-latest-linux64-gpl-shared-8.0.tar.xz"

mkdir -p "${TEMP_DIR}" "${TARGET_DIR}"
curl -fL --progress-bar -o "${TEMP_DIR}/ffmpeg.tar.xz" "$URL"
tar -xJf "${TEMP_DIR}/ffmpeg.tar.xz" --strip-components=1 -C "${TARGET_DIR}"

# 簡易検証
test -x "${TARGET_DIR}/bin/ffmpeg" || { echo "[ERROR] ffmpeg not found"; exit 1; }
echo "[OK] FFmpeg ready at ${TARGET_DIR}"
