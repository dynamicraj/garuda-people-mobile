import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { GARUDA_BLUE, Theme, themeFromPublicSettings } from '../theme'

type User = {
  id: number
  username: string
  full_name: string
  email: string
  role: string
  allow_mobile_punch?: boolean
  [k: string]: any
}

type State = {
  serverUrl: string | null
  theme: Theme
  user: User | null
  isAuthenticated: boolean
  currentlyPunchedIn: boolean
  lastPunchAt: string | null
  offlineQueueCount: number

  setServerUrl: (url: string | null) => Promise<void>
  applyTheme: (publicSettings: Record<string, string>) => void
  setUser: (u: User | null) => void
  setAuthenticated: (b: boolean) => void
  setPunchState: (punchedIn: boolean, at?: string | null) => void
  setOfflineQueueCount: (n: number) => void
  loadFromStorage: () => Promise<void>
  reset: () => Promise<void>
}

const SERVER_URL_KEY = '@garuda/server_url'
const THEME_KEY = '@garuda/theme'
const USER_KEY = '@garuda/user'

export const useAppStore = create<State>((set, get) => ({
  serverUrl: null,
  theme: GARUDA_BLUE,
  user: null,
  isAuthenticated: false,
  currentlyPunchedIn: false,
  lastPunchAt: null,
  offlineQueueCount: 0,

  async setServerUrl(url) {
    if (url) await AsyncStorage.setItem(SERVER_URL_KEY, url)
    else await AsyncStorage.removeItem(SERVER_URL_KEY)
    set({ serverUrl: url })
  },

  applyTheme(settings) {
    const t = themeFromPublicSettings(settings)
    AsyncStorage.setItem(THEME_KEY, JSON.stringify(t)).catch(() => {})
    set({ theme: t })
  },

  setUser(u) {
    if (u) AsyncStorage.setItem(USER_KEY, JSON.stringify(u)).catch(() => {})
    else AsyncStorage.removeItem(USER_KEY).catch(() => {})
    set({ user: u })
  },

  setAuthenticated(b) {
    set({ isAuthenticated: b })
  },

  setPunchState(punchedIn, at = null) {
    set({ currentlyPunchedIn: punchedIn, lastPunchAt: at })
  },

  setOfflineQueueCount(n) {
    set({ offlineQueueCount: n })
  },

  async loadFromStorage() {
    const [url, theme, user] = await Promise.all([
      AsyncStorage.getItem(SERVER_URL_KEY),
      AsyncStorage.getItem(THEME_KEY),
      AsyncStorage.getItem(USER_KEY),
    ])
    const patch: Partial<State> = {}
    if (url) patch.serverUrl = url
    if (theme) {
      try { patch.theme = JSON.parse(theme) } catch {}
    }
    if (user) {
      try {
        patch.user = JSON.parse(user)
      } catch {}
    }
    set(patch)
  },

  async reset() {
    await Promise.all([
      AsyncStorage.removeItem(SERVER_URL_KEY),
      AsyncStorage.removeItem(THEME_KEY),
      AsyncStorage.removeItem(USER_KEY),
    ])
    set({
      serverUrl: null,
      theme: GARUDA_BLUE,
      user: null,
      isAuthenticated: false,
      currentlyPunchedIn: false,
      lastPunchAt: null,
      offlineQueueCount: 0,
    })
  },
}))
