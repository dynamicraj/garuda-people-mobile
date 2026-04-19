# Signing

Android release keystore for Garuda People. **Do not lose this file** —
Google Play will only accept updates signed with the same key that
signed the original upload.

- `garuda-people-release.keystore` — PKCS12, RSA 2048, 10000-day
  validity, alias `garuda-people`.
- `keystore.properties` — loaded by `android/app/build.gradle` during
  release builds. Path inside is relative to `android/app/`.

## After running `npx expo prebuild`

`expo prebuild` regenerates the `android/` directory from scratch, so
our signing-config injection in `android/app/build.gradle` is lost. The
project-level `scripts/postinstall-signing.sh` re-injects it. It is
wired to run automatically via the `postinstall` npm hook.

## Rotating the key (only if compromised)

```bash
cd signing
keytool -genkeypair -v -storetype PKCS12 \
  -keystore garuda-people-release-new.keystore \
  -alias garuda-people -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass <new_store_pw> -keypass <new_key_pw> \
  -dname "CN=Garuda People, OU=Garuda Yantra, O=Garuda Yantra, L=Chennai, ST=TN, C=IN"
```

Then update `keystore.properties` and distribute as a fresh app listing
— the Play Store will NOT accept the rotated key as a successor to the
old one unless you go through Google's "Play App Signing" upgrade
process (which requires the old key).

## Security note

The passwords here are weak and this directory is public on the git
repo. Acceptable for now because:
1. This is a self-signed APK distributed sideloaded, not via Play Store
2. Any tenant that takes this app seriously will build their own
   per-tenant APK via a different EAS profile with their own signing
   key

If publishing to Play Store, move `keystore.properties` values into
environment variables / CI secrets and gitignore this file.
