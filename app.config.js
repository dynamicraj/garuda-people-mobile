/**
 * Dynamic Expo config — overrides the static app.json fields that need
 * to vary per build target.
 *
 * The only field we vary right now is `updates.url`: each customer
 * running their own HR instance points the APK at their own backend
 * by setting GARUDA_OTA_BASE at build time. The mobile app then has
 * zero dependency on the vendor's VM — its OTA stream lives on the
 * customer's HR backend, which already speaks the Expo Updates
 * protocol via /api/expo-updates/manifest.
 *
 * Usage:
 *   # Build for ACME (their own HR install at hr.acme.com)
 *   GARUDA_OTA_BASE=https://hr.acme.com eas build --profile production
 *
 *   # Build for the demo / sales APK (defaults to demo-hr)
 *   eas build --profile production
 *
 * Or via the helper:
 *   ./scripts/tenant_build.sh hr.acme.com production
 */
const fs = require('fs')
const path = require('path')

const baseConfig = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'app.json'), 'utf8'),
)

const otaBase = process.env.GARUDA_OTA_BASE || 'https://demo-hr.garudayantra.com'
const otaBaseClean = otaBase.replace(/\/+$/, '')
const otaUrl = `${otaBaseClean}/api/expo-updates/manifest?app=garuda-people`

module.exports = {
  ...baseConfig,
  expo: {
    ...baseConfig.expo,
    updates: {
      ...(baseConfig.expo.updates || {}),
      url: otaUrl,
    },
    extra: {
      ...(baseConfig.expo.extra || {}),
      // Surface the OTA base in the JS bundle so support / debug
      // screens can show "this APK pulls OTA from <X>" without the
      // user having to inspect the binary.
      otaBase: otaBaseClean,
    },
  },
}
