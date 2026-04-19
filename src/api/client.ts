import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import * as SecureStore from 'expo-secure-store'
import { useAppStore } from '../state/store'

const TOKEN_KEY = 'access_token'
const REFRESH_KEY = 'refresh_token'

let instance: AxiosInstance | null = null

// Chrome-like UA so servers fronted by Zscaler / Cloudflare-bot-protection
// don't block us as "not a browser". Every on-prem HR deploy we've seen
// sits behind some WAF — this header sidesteps them uniformly.
const BROWSER_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36 GarudaPeople/3.0.0'

export function getClient(): AxiosInstance {
  if (instance) return instance
  instance = axios.create({
    timeout: 15_000,
    headers: { 'User-Agent': BROWSER_UA },
  })

  instance.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    const serverUrl = useAppStore.getState().serverUrl
    if (serverUrl && config.url && !/^https?:/i.test(config.url)) {
      const base = serverUrl.replace(/\/+$/, '')
      const path = config.url.startsWith('/') ? config.url : `/${config.url}`
      config.baseURL = undefined
      config.url = `${base}${path}`
    }
    config.headers = config.headers || ({} as any)
    ;(config.headers as any)['User-Agent'] = BROWSER_UA
    const token = await SecureStore.getItemAsync(TOKEN_KEY)
    if (token) {
      ;(config.headers as any).Authorization = `Bearer ${token}`
    }
    return config
  })

  instance.interceptors.response.use(
    (r) => r,
    async (err) => {
      if (err?.response?.status === 401) {
        await SecureStore.deleteItemAsync(TOKEN_KEY)
        await SecureStore.deleteItemAsync(REFRESH_KEY)
        useAppStore.setState({ isAuthenticated: false, user: null })
      }
      throw err
    }
  )
  return instance
}

export async function saveTokens(access: string, refresh?: string) {
  await SecureStore.setItemAsync(TOKEN_KEY, access)
  if (refresh) await SecureStore.setItemAsync(REFRESH_KEY, refresh)
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync(TOKEN_KEY)
  await SecureStore.deleteItemAsync(REFRESH_KEY)
}

export async function hasToken(): Promise<boolean> {
  return !!(await SecureStore.getItemAsync(TOKEN_KEY))
}

// Typed endpoint helpers — thin wrappers so screens don't repeat URLs.
export const API = {
  publicSettings: () => getClient().get('/api/settings/public'),
  compat: (version: string, platform: string) =>
    getClient().get('/api/mobile/compat', { params: { version, platform } }),

  login: (username: string, password: string) =>
    getClient().post('/api/auth/login', { username, password }),
  me: () => getClient().get('/api/auth/me'),

  registerToken: (body: {
    device_id: string
    expo_push_token?: string
    platform?: string
    app_version?: string
    os_version?: string
    device_model?: string
  }) => getClient().post('/api/v1/mobile/register-token', body),
  unregisterToken: (device_id: string) =>
    getClient().post('/api/v1/mobile/unregister-token', { device_id }),

  punch: (body: {
    punch_type: 'in' | 'out' | 'auto'
    latitude: number
    longitude: number
    accuracy?: number
    selfie_path?: string
    device_info?: string
  }) => getClient().post('/api/mobile-attendance/punch', body),

  punchBatch: (punches: any[]) =>
    getClient().post('/api/v1/mobile/punch-batch', { punches }),

  myStatus: () => getClient().get('/api/mobile-attendance/my-status'),
  myHistory: (limit = 30) =>
    getClient().get('/api/mobile-attendance/my-history', { params: { limit } }),
  myProfile: () => getClient().get('/api/mobile-attendance/my-profile'),

  locationUpdate: (body: { latitude: number; longitude: number; accuracy?: number }) =>
    getClient().post('/api/mobile-attendance/location-update', body),

  uploadSelfie: (formData: FormData) =>
    getClient().post('/api/mobile-attendance/upload-selfie', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  listLeaves: () => getClient().get('/api/leaves/requests'),
  leaveBalances: () => getClient().get('/api/leaves/my-balance'),
  leaveTypes: () => getClient().get('/api/leaves/types'),
  applyLeave: (body: any) => getClient().post('/api/leaves/requests', body),

  listPayslips: () => getClient().get('/api/payroll/my-payslips'),
  listLoans: () => getClient().get('/api/loans/my'),
  listExpenses: () => getClient().get('/api/expense-claims/my'),
  listAnnouncements: () => getClient().get('/api/hr/announcements'),
  listAlerts: (unread = false) =>
    getClient().get('/api/alerts', { params: unread ? { is_read: false } : {} }),
}
