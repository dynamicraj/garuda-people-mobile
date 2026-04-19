/**
 * Stable per-install device ID.
 *
 * Used as the join key for the server-side MobileDevice row so one user
 * on one phone stays linked across logouts/reinstalls (reinstalls get
 * a new ID, which is fine — a fresh row with a fresh push token).
 */
import * as SecureStore from 'expo-secure-store'

const KEY = '@garuda/device_id'

function uuidLike(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 10)}`
}

export async function getDeviceId(): Promise<string> {
  const existing = await SecureStore.getItemAsync(KEY)
  if (existing) return existing
  const fresh = uuidLike()
  await SecureStore.setItemAsync(KEY, fresh)
  return fresh
}
