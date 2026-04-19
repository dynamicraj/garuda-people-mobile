#!/usr/bin/env bash
#
# After `expo prebuild` regenerates android/, re-inject our release
# signing config so `./gradlew assembleRelease` produces a properly
# signed APK.
#
# Runs automatically via the `postinstall` npm hook (see package.json).
# Safe to run multiple times — checks idempotently.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_GRADLE="$ROOT/android/app/build.gradle"
GRADLE_PROPS="$ROOT/android/gradle.properties"
KEYSTORE_PROPS="$ROOT/signing/keystore.properties"

# If android/ doesn't exist yet (prebuild hasn't run), exit silently.
[ -d "$ROOT/android" ] || exit 0

# 1. Append signing credentials to android/gradle.properties (idempotent).
if ! grep -q "GARUDA_RELEASE_STORE_FILE" "$GRADLE_PROPS" 2>/dev/null; then
  echo "[signing] appending credentials to android/gradle.properties"
  cat "$KEYSTORE_PROPS" >> "$GRADLE_PROPS"
fi

# 2. Bump JVM heap so gradle doesn't OOM during Kotlin compile.
if grep -q "org.gradle.jvmargs=-Xmx2048m" "$GRADLE_PROPS" 2>/dev/null; then
  echo "[signing] raising gradle JVM heap to 6GB + 2GB metaspace"
  sed -i 's|^org.gradle.jvmargs=.*|org.gradle.jvmargs=-Xmx6g -XX:MaxMetaspaceSize=2g -XX:+HeapDumpOnOutOfMemoryError|' "$GRADLE_PROPS"
fi

# 3. Inject release signingConfig into android/app/build.gradle if absent.
if ! grep -q "GARUDA_RELEASE_STORE_FILE" "$BUILD_GRADLE" 2>/dev/null; then
  echo "[signing] injecting release signingConfig into android/app/build.gradle"
  # Add a `release` block inside signingConfigs { ... } using a portable
  # awk pass. Safe against rerun because of the grep guard above.
  python3 - "$BUILD_GRADLE" <<'PY'
import re, sys, pathlib
p = pathlib.Path(sys.argv[1])
src = p.read_text()

# Add release signingConfig inside signingConfigs { ... }
release_block = """        release {
            if (project.hasProperty('GARUDA_RELEASE_STORE_FILE')) {
                storeFile file(GARUDA_RELEASE_STORE_FILE)
                storePassword GARUDA_RELEASE_STORE_PASSWORD
                keyAlias GARUDA_RELEASE_KEY_ALIAS
                keyPassword GARUDA_RELEASE_KEY_PASSWORD
            }
        }
"""
src = re.sub(
    r"(signingConfigs\s*\{\s*debug\s*\{[^}]*\}\s*)",
    r"\1" + release_block,
    src,
    count=1,
    flags=re.DOTALL,
)
# Swap release buildType to use signingConfigs.release
src = src.replace(
    "release {\n            // Caution! In production, you need to generate your own keystore file.\n            // see https://reactnative.dev/docs/signed-apk-android.\n            signingConfig signingConfigs.debug",
    "release {\n            signingConfig signingConfigs.release",
)
# Fallback if the comment isn't there
src = re.sub(
    r"release\s*\{\s*signingConfig\s+signingConfigs\.debug",
    "release {\n            signingConfig signingConfigs.release",
    src,
)
p.write_text(src)
PY
fi

echo "[signing] done"
