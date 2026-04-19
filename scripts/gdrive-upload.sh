#!/usr/bin/env bash
# Upload one or more files to Google Drive via rclone.
# Skips silently if the rclone remote isn't set up yet.

set -euo pipefail

REMOTE_NAME="gdrive"
FOLDER_NAME="garuda-people-apks"

if ! command -v rclone >/dev/null 2>&1; then
  echo "[gdrive-upload] rclone not installed — skipping."
  exit 0
fi

if ! rclone listremotes 2>/dev/null | grep -q "^${REMOTE_NAME}:$"; then
  echo "[gdrive-upload] remote '${REMOTE_NAME}' not configured. Run: bash scripts/gdrive-setup.sh"
  exit 0
fi

if [ "$#" -eq 0 ]; then
  echo "usage: $0 <file> [file ...]"
  exit 1
fi

for f in "$@"; do
  if [ ! -f "$f" ]; then
    echo "[gdrive-upload] skipping missing file: $f"
    continue
  fi
  echo "[gdrive-upload] uploading $(basename "$f") → Drive/${FOLDER_NAME}/"
  rclone copy "$f" "${REMOTE_NAME}:${FOLDER_NAME}" --progress
done

echo "[gdrive-upload] done."
