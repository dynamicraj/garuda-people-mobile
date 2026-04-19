# Garuda People (Mobile v3)

React Native + Expo SDK 55 app for the Garuda HR suite. Single binary, white-labels to any tenant once the user enters their server URL. Android + iOS from day one.

## Stack
- **Expo SDK 55** / React Native 0.81.5 / React 19
- **TypeScript** — strict mode
- **Navigation** — `@react-navigation/native-stack` + `bottom-tabs`
- **State** — `zustand` + `@react-native-async-storage/async-storage`
- **Offline** — `expo-sqlite` for the punch queue
- **Auth** — `expo-secure-store` (access/refresh tokens) + `expo-local-authentication` (FaceID / fingerprint)
- **Background** — `expo-task-manager`, `expo-background-fetch`, `expo-location`
- **Push** — `expo-notifications` (delivers via FCM HTTP v1 on Android, APNs on iOS)
- **Camera** — `expo-camera` for punch selfies

## Project layout
```
App.tsx                   — boot, auth restore, theme load
assets/                   — Garuda-blue transparent logos (replaced per-tenant at runtime)
src/
  api/client.ts           — axios w/ server-URL + token interceptors
  db/index.ts             — expo-sqlite punch queue
  navigation/index.tsx    — gated server-url → login → tabs
  screens/
    ServerUrlScreen.tsx   — first-run tenant discovery
    LoginScreen.tsx       — username/password + biometric unlock
    DashboardScreen.tsx   — today status, announcements, alerts
    PunchScreen.tsx       — green/red, GPS + selfie, offline-queued
    LeavesScreen.tsx      — balances + requests
    MoreScreen.tsx        — profile, payslips, loans, etc.
  state/store.ts          — zustand global state
  theme/                  — Garuda-blue default + tenant overrides
```

## Backend contract
Pinned to `/api/v1/mobile/*` for mobile-only endpoints; everything else calls the existing `/api/*` routes. The HR backend honours a strict additive-only convention, so mobile can be released ahead of or behind backend without breakage. Compat check on launch: `GET /api/mobile/compat?version=X`.

## White-labeling
- **Runtime (default)** — app ships with `Garuda People` launcher icon + transparent-bg blue logo. After the user enters their server URL, the app pulls `/api/settings/public` and re-skins splash, header, nav with `company_name`, `company_logo`, `company_primary_color`. Stored in `@garuda/theme`.
- **Per-tenant build (optional)** — for clients that want their own Play Store listing, add a new EAS build profile in `eas.json` with overrides for `bundleIdentifier`, `package`, `name`, `icon`. Run `eas build --profile <tenant>`.

## Development
```bash
npm install
npx expo start
# press 'a' to open on an Android emulator or Expo Go on a physical device
```

## Build (Android APK for internal testing)
```bash
eas login
eas build --platform android --profile preview
```

## Build (production bundle)
```bash
eas build --platform android --profile production  # AAB for Play Store
eas build --platform ios     --profile production  # requires Apple Developer Program
```

## Required backend version
`>= 3.0` of the HR backend (commit `1bb5714f` or later — adds `/api/v1/mobile/*`).
