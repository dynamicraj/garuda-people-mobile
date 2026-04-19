/**
 * WebSocket to backend for live notifications when the app is open.
 *
 * Backend publishes each alert to a Redis channel user:{uid}:alerts via
 * alert_service.create_alert. We subscribe to our own channel through a
 * FastAPI WebSocket endpoint (/api/v1/mobile/stream) — backend code
 * already has the Redis subscribe wiring; we just expose it over WS.
 *
 * Limitation vs. real push: only works while the app is in the
 * foreground or recently-backgrounded. True background delivery would
 * require FCM/APNs, which by user request we do not use.
 */
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'
import { AppState, AppStateStatus } from 'react-native'
import { fireLocalNotification } from './push'

let ws: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let appStateSub: { remove: () => void } | null = null

async function wsUrl(): Promise<string | null> {
  const base = await AsyncStorage.getItem('@garuda/server_url')
  const tok = await SecureStore.getItemAsync('access_token')
  if (!base || !tok) return null
  const httpUrl = base.replace(/\/+$/, '')
  const proto = httpUrl.startsWith('https://') ? 'wss://' : 'ws://'
  const host = httpUrl.replace(/^https?:\/\//, '')
  return `${proto}${host}/api/v1/mobile/stream?token=${encodeURIComponent(tok)}`
}

async function openSocket() {
  try {
    const url = await wsUrl()
    if (!url) return
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return
    ws = new WebSocket(url)
    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(String(evt.data))
        if (msg.type === 'alert' || msg.alert_type || msg.title) {
          fireLocalNotification(msg.title || 'Alert', msg.message || '', msg)
        }
      } catch {}
    }
    ws.onerror = () => {
      // Silent — reconnect handler will retry
    }
    ws.onclose = () => {
      ws = null
      scheduleReconnect()
    }
  } catch {
    scheduleReconnect()
  }
}

function scheduleReconnect() {
  if (reconnectTimer) return
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    if (AppState.currentState === 'active') openSocket()
  }, 5_000)
}

export function startNotificationsStream() {
  openSocket()
  if (!appStateSub) {
    appStateSub = AppState.addEventListener('change', (s: AppStateStatus) => {
      if (s === 'active') openSocket()
    })
  }
}

export function stopNotificationsStream() {
  try { ws?.close() } catch {}
  ws = null
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
  if (appStateSub) { appStateSub.remove(); appStateSub = null }
}
