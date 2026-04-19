# Build & Release — Garuda People (v3)

This app is built with Expo Application Services (EAS). You need an Expo
account (free tier works for the first few builds per month).

## One-time setup

1. **Install eas-cli globally (or use npx)**
   ```bash
   npm i -g eas-cli
   ```

2. **Log in with your Expo account**
   ```bash
   npm run eas:login
   ```

3. **Link this directory to an EAS project**
   ```bash
   npm run eas:init
   ```
   This writes the generated `projectId` to `app.json` under
   `expo.extra.eas.projectId`. Commit that change.

4. **(Android only)** If you want EAS to auto-upload to the Play
   Console, create a service account JSON in Google Cloud → Play
   Console, grant it the "Release manager" role, and add it to EAS:
   ```bash
   eas credentials
   ```

5. **(iOS only)** Sign in with your Apple Developer account the first
   time you run an iOS build — EAS will prompt interactively.

## Day-to-day commands

| What you want | Command |
|---|---|
| Run locally in Expo Go | `npm start` |
| Android preview APK (shareable via link) | `npm run build:android:preview` |
| Android production AAB (Play Store) | `npm run build:android:production` |
| iOS preview (internal distribution) | `npm run build:ios:preview` |
| iOS production (TestFlight / App Store) | `npm run build:ios:production` |
| Both platforms, production | `npm run build:all` |
| Submit latest Android build to Play Store | `npm run submit:android` |
| Submit latest iOS build to TestFlight | `npm run submit:ios` |

## Versioning

- Bump `expo.version` in `app.json` (semver, used on both stores).
- Android `versionCode` auto-increments on production builds
  (`"autoIncrement": true` in eas.json).
- iOS `buildNumber` auto-increments on production builds
  (`"autoIncrement": "buildNumber"` in eas.json).

## OTA updates (no store submission needed for JS-only fixes)

1. Increase `expo.version` only when the native binary changes (new
   permissions, native module upgrade, etc.).
2. For JS/TS-only fixes, run:
   ```bash
   npx eas update --branch production --message "fix: <summary>"
   ```
3. Clients with the same `version` string will receive the update on
   next app launch.

Runtime version policy is set to `"policy": "appVersion"` — meaning
OTA updates are scoped per `expo.version`. When you ship a new
binary version, you must push a fresh OTA update for it too.

## White-label per tenant (optional)

Single-build runtime theming works out of the box. If a specific client
wants their own Play Store listing:

1. Add a profile to `eas.json`:
   ```json
   "production-chettinaad": {
     "extends": "production",
     "env": {
       "TENANT": "chettinaad"
     }
   }
   ```

2. Make `app.config.js` (replacing `app.json`) swap `name`, `slug`,
   `android.package`, `ios.bundleIdentifier`, and icon paths based on
   `process.env.TENANT`. Ask Claude to generate this when needed.

3. Build:
   ```bash
   eas build --profile production-chettinaad --platform android
   ```

## Troubleshooting

- **"Missing JavaScript bundle"** — run `npx expo install --fix`
  then `npm run typecheck` then try again.
- **Build errors about missing `react-native-worklets`** — it's a
  peer dependency of `react-native-reanimated` and must be installed
  (already added).
- **Android 14+ rejects background location** — double-check the
  consent screen is being shown, and that the foreground service
  notification appears when tracking starts.
- **iOS background location doesn't seem to fire** — iOS 18 no longer
  permits continuous background GPS; the app relies on periodic
  significant-change events. Test by driving ~500 m with the app
  backgrounded.
