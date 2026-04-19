/**
 * Background task registrations.
 *
 * MUST be imported once at app startup (from App.tsx), before any user
 * flow triggers start/stop. TaskManager and BackgroundFetch require task
 * handlers to be registered synchronously at module scope so the OS can
 * wake the JS bundle in the background and dispatch events to them.
 *
 * Two tasks:
 *   BACKGROUND_LOCATION — wakes while the user is punched in; sends
 *     periodic GPS updates to /api/mobile-attendance/location-update.
 *     On Android this runs as a foreground service with a persistent
 *     notification (required by Android 14+); on iOS it piggy-backs on
 *     significant-change + region monitoring when true continuous
 *     tracking is unavailable.
 *
 *   BACKGROUND_SYNC — periodic job (every ~15 min) that flushes the
 *     SQLite punch queue to /api/v1/mobile/punch-batch when the network
 *     is up. Exponential backoff on server error; no-op when queue empty.
 */
import * as TaskManager from 'expo-task-manager'
import * as Location from 'expo-location'
import * as BackgroundFetch from 'expo-background-fetch'
import axios from 'axios'
import * as SecureStore from 'expo-secure-store'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { pendingPunches, markSynced, bumpAttempt } from '../db'

export const BACKGROUND_LOCATION = 'garuda-people-bg-location'
export const BACKGROUND_SYNC = 'garuda-people-bg-sync'

const SERVER_URL_KEY = '@garuda/server_url'

async function authedPost(path: string, body: any): Promise<any> {
  const url = await AsyncStorage.getItem(SERVER_URL_KEY)
  const token = await SecureStore.getItemAsync('access_token')
  if (!url || !token) throw new Error('not-configured')
  return axios.post(`${url.replace(/\/+$/, '')}${path}`, body, {
    timeout: 20_000,
    headers: { Authorization: `Bearer ${token}` },
  })
}

TaskManager.defineTask(BACKGROUND_LOCATION, async ({ data, error }) => {
  if (error) return
  const locs = (data as any)?.locations as Location.LocationObject[] | undefined
  if (!locs || locs.length === 0) return
  const last = locs[locs.length - 1]
  try {
    await authedPost('/api/mobile-attendance/location-update', {
      latitude: last.coords.latitude,
      longitude: last.coords.longitude,
      accuracy: last.coords.accuracy,
    })
  } catch {
    // Fire-and-forget; will retry on next tick
  }
})

TaskManager.defineTask(BACKGROUND_SYNC, async () => {
  try {
    const rows = await pendingPunches()
    if (rows.length === 0) return BackgroundFetch.BackgroundFetchResult.NoData

    const payload = rows.map((r) => ({
      client_punch_id: r.id,
      punch_type: r.punch_type,
      client_timestamp: r.created_at,
      latitude: r.latitude,
      longitude: r.longitude,
      accuracy: r.accuracy ?? undefined,
      device_info: r.device_info ?? undefined,
    }))

    const res = await authedPost('/api/v1/mobile/punch-batch', { punches: payload })
    const results = res?.data?.results || []
    const ok: string[] = []
    for (const r of results) {
      if (r.status === 'ok') ok.push(r.client_punch_id)
      else await bumpAttempt(r.client_punch_id, r.message || String(r.error_code))
    }
    await markSynced(ok)
    return ok.length > 0
      ? BackgroundFetch.BackgroundFetchResult.NewData
      : BackgroundFetch.BackgroundFetchResult.NoData
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed
  }
})

export async function startBackgroundLocation(): Promise<boolean> {
  const fg = await Location.getForegroundPermissionsAsync()
  if (fg.status !== 'granted') return false
  const bg = await Location.getBackgroundPermissionsAsync()
  if (bg.status !== 'granted') return false

  const running = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION).catch(() => false)
  if (running) return true

  await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 300_000, // 5 min
    distanceInterval: 100, // 100 m
    pausesUpdatesAutomatically: true,
    activityType: Location.ActivityType.OtherNavigation,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'Garuda People',
      notificationBody: 'Logging your work location while punched in.',
      notificationColor: '#1e3a5f',
    },
  })
  return true
}

export async function stopBackgroundLocation(): Promise<void> {
  const running = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION).catch(() => false)
  if (running) await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION)
}

export async function ensureBackgroundSync(): Promise<void> {
  try {
    await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC, {
      minimumInterval: 15 * 60, // 15 min — OS may throttle
      stopOnTerminate: false,
      startOnBoot: true,
    })
  } catch {
    // Already registered, or unsupported in the current runtime — ignore
  }
}
