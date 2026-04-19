/**
 * Notification service — self-hosted.
 *
 * We do NOT use the Expo Push service (exp.host) because that's a
 * third-party runtime dependency. Instead:
 *   - Local notifications (shown by the device) still go through
 *     expo-notifications — that library just wraps the OS notification
 *     APIs, no network. Safe.
 *   - Push delivery uses a WebSocket the app opens to YOUR backend.
 *     When the app is foregrounded it hears events over WS and fires a
 *     local notification from client-side. This works fully offline-free
 *     and relies only on your Traefik + FastAPI stack.
 *   - Background delivery (when the app is killed): NOT possible without
 *     either FCM (Google) or APNs (Apple) — both OSes lock it down.
 *     Accept this tradeoff or opt into FCM later.
 */
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
import { API } from '../api/client'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowAlert: true,
  } as any),
})

export async function ensurePushPermissions(): Promise<boolean> {
  if (!Device.isDevice) return false
  const existing = await Notifications.getPermissionsAsync()
  if ((existing as any).status === 'granted' || (existing as any).granted) return true
  const req = await Notifications.requestPermissionsAsync()
  return (req as any).status === 'granted' || (req as any).granted === true
}

export async function registerForPush(deviceId: string, opts?: { appVersion?: string; osVersion?: string; deviceModel?: string }) {
  await ensurePushPermissions()

  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'General',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1e3a5f',
      })
    } catch {}
  }

  // Register the device with our own backend (no push token — WS delivery).
  try {
    await API.registerToken({
      device_id: deviceId,
      platform: Platform.OS as 'android' | 'ios',
      app_version: opts?.appVersion,
      os_version: opts?.osVersion,
      device_model: opts?.deviceModel,
    })
  } catch {}
}

/** Fire a local notification from within the app (when WS tells us to). */
export async function fireLocalNotification(title: string, body: string, data: any = {}) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data, sound: 'default' },
      trigger: null,
    })
  } catch {}
}

/** Install default notification-tap router. Returns a cleanup fn. */
export function installTapHandler(onTap: (data: Record<string, any>) => void): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = (response.notification.request.content.data || {}) as any
    onTap(data)
  })
  return () => sub.remove()
}
