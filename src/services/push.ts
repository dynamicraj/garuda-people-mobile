/**
 * Expo Push notifications — registration, handler setup, token upload.
 *
 * On iOS APNs handles delivery; on Android FCM HTTP v1. Both are
 * transparently routed by the Expo Push service; our mobile code only
 * deals with the Expo push token.
 */
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import Constants from 'expo-constants'
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

export async function getExpoPushToken(): Promise<string | null> {
  try {
    const projectId =
      (Constants.expoConfig?.extra as any)?.eas?.projectId ||
      (Constants.easConfig as any)?.projectId
    // projectId is required in SDK ≥ 49 once the app is built with EAS.
    // For Expo Go / dev clients it can be undefined — token still works.
    const token = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    )
    return token.data
  } catch {
    return null
  }
}

export async function registerForPush(deviceId: string, opts?: { appVersion?: string; osVersion?: string; deviceModel?: string }) {
  const allowed = await ensurePushPermissions()
  const token = allowed ? await getExpoPushToken() : null

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

  try {
    await API.registerToken({
      device_id: deviceId,
      expo_push_token: token || undefined,
      platform: Platform.OS as 'android' | 'ios',
      app_version: opts?.appVersion,
      os_version: opts?.osVersion,
      device_model: opts?.deviceModel,
    })
  } catch {
    // Retry handled by subsequent app launches
  }
  return token
}

/** Install default notification-tap router. Returns a cleanup fn. */
export function installTapHandler(onTap: (data: Record<string, any>) => void): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = (response.notification.request.content.data || {}) as any
    onTap(data)
  })
  return () => sub.remove()
}
