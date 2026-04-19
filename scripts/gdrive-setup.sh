#!/usr/bin/env bash
# One-time setup to configure rclone to upload release APKs to your
# Google Drive. After this runs once, `npm run apk:gdrive` will copy
# every new build to your Drive folder automatically.
#
# rclone is open source (MIT), talks directly to Drive's public API,
# no third-party service in between. Runs on your VPS only.

set -euo pipefail

REMOTE_NAME="gdrive"
FOLDER_NAME="garuda-people-apks"

if rclone listremotes 2>/dev/null | grep -q "^${REMOTE_NAME}:$"; then
  echo "[gdrive-setup] rclone remote '${REMOTE_NAME}' already configured."
  echo "              Test with:  rclone ls ${REMOTE_NAME}:${FOLDER_NAME}"
  echo "              Upload now: bash scripts/gdrive-upload.sh ~/GarudaPeople-v3.0.0.apk"
  exit 0
fi

cat <<'EOF'

─── rclone Google Drive setup — one-time ─────────────────────────────

This VPS has no browser, so you'll complete Google's OAuth on your
laptop (or any machine with a browser) and paste a token back here.

On your laptop:
  1. Install rclone: https://rclone.org/downloads/  (brew install rclone
     on Mac; winget install rclone on Windows)
  2. Run:  rclone authorize "drive"
  3. Your browser opens → sign into the Google account that owns the
     Drive folder you want APKs in → click "Allow".
  4. rclone prints a block of JSON like:
        {"access_token":"ya29...","token_type":"Bearer",...}
     Copy that ENTIRE JSON line.

Then on this VPS, I'll start `rclone config` interactively — answer:
  - n      (new remote)
  - gdrive (name)
  - drive  (type — press Enter until autocomplete suggests "drive")
  - Enter through client_id, client_secret, scope (accept defaults)
  - n      (don't use auto config)
  - PASTE the JSON when asked for result of rclone authorize
  - n      (team drive)
  - y      (confirm)
  - q      (quit)

Press Enter to start `rclone config`, or Ctrl-C to abort.
EOF

read -r _
rclone config

if rclone listremotes 2>/dev/null | grep -q "^${REMOTE_NAME}:$"; then
  echo ""
  echo "[gdrive-setup] OK. Creating folder '${FOLDER_NAME}' on Drive..."
  rclone mkdir "${REMOTE_NAME}:${FOLDER_NAME}" 2>/dev/null || true
  echo "[gdrive-setup] Done. Uploads will land in: Drive/${FOLDER_NAME}"
else
  echo "[gdrive-setup] Remote '${REMOTE_NAME}' not created. Re-run this script."
  exit 1
fi
