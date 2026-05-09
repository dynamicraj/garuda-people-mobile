/**
 * Defensive API + compat helpers.
 *
 * Goal: a backend update can never crash the shipped mobile app. Three
 * mechanisms work together:
 *
 *   1) `safeApi(fn, fallback)` — wraps a network call so any 4xx / 5xx /
 *      network error returns the fallback instead of throwing. Use for
 *      any call where a missing response is acceptable degraded UX
 *      (lists that can render empty, badges that can hide).
 *
 *   2) `useFeatureFlag(name)` — reads the latest feature_flags map from
 *      /api/mobile/compat. Lets the server kill-switch a broken feature
 *      without a store update.
 *
 *   3) `runCompatCheck()` — call on launch and every 30 min. Refreshes
 *      the cached compat info, applies feature flags + minimum-version
 *      gate, surfaces banner notices.
 *
 * The compat endpoint is the *only* contract between mobile and backend
 * we promise never to break. Everything else is best-effort.
 */
import { useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { API } from './client'

export type CompatInfo = {
  ok: boolean
  min_version: string
  recommended_version: string
  block_message?: string | null
  update_url_android?: string | null
  update_url_ios?: string | null
  api_contract_version?: number
  feature_flags?: Record<string, boolean>
  notice?: string | null
  server_time?: string | null
}

const COMPAT_CACHE_KEY = 'compat:last'
const COMPAT_TTL_MS = 30 * 60 * 1000  // 30 min

let _cached: CompatInfo | null = null

/** Wrap a network call so failures degrade to a fallback instead of crashing. */
export async function safeApi<T>(
  fn: () => Promise<{ data: T }>,
  fallback: T,
  opts?: { silent?: boolean },
): Promise<T> {
  try {
    const r = await fn()
    return r?.data ?? fallback
  } catch (e: any) {
    if (!opts?.silent) {
      // eslint-disable-next-line no-console
      console.warn('[safeApi]', e?.response?.status, e?.message)
    }
    return fallback
  }
}

/** Refresh the cached compat info. Safe to call from anywhere. */
export async function runCompatCheck(version: string, platform: 'android' | 'ios'): Promise<CompatInfo | null> {
  try {
    const r = await API.compat(version, platform)
    const info = (r?.data || {}) as CompatInfo
    _cached = info
    await AsyncStorage.setItem(COMPAT_CACHE_KEY, JSON.stringify({ at: Date.now(), info }))
    return info
  } catch (e) {
    // Keep last cached info — don't clear on transient failure.
    return _cached
  }
}

/** Return cached compat (last known good) without hitting the network. */
export async function getCachedCompat(): Promise<CompatInfo | null> {
  if (_cached) return _cached
  try {
    const raw = await AsyncStorage.getItem(COMPAT_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (Date.now() - (parsed.at || 0) > COMPAT_TTL_MS) {
      // stale but better than nothing — caller should run runCompatCheck()
    }
    _cached = parsed.info
    return _cached
  } catch {
    return null
  }
}

/** Read a feature flag from the cached compat info. Defaults to ON if
 *  the flag is unknown or compat hasn't been fetched yet — we'd rather
 *  show a feature than hide one the server expects to work. */
export function isFeatureEnabled(flag: string, fallback = true): boolean {
  const flags = _cached?.feature_flags || {}
  if (flag in flags) return !!flags[flag]
  return fallback
}

/** React hook variant of isFeatureEnabled — re-renders when compat refreshes. */
export function useFeatureFlag(flag: string, fallback = true): boolean {
  const [enabled, setEnabled] = useState<boolean>(() => isFeatureEnabled(flag, fallback))
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const c = await getCachedCompat()
      if (cancelled) return
      const f = c?.feature_flags || {}
      setEnabled(flag in f ? !!f[flag] : fallback)
    })()
    return () => { cancelled = true }
  }, [flag, fallback])
  return enabled
}

/** Compare semver strings (a >= b). Used by the compat gate. */
export function semverGte(a: string, b: string): boolean {
  const _v = (s: string) => s.split('.').slice(0, 3).map(x => parseInt(x, 10) || 0)
  const va = _v(a), vb = _v(b)
  for (let i = 0; i < 3; i++) {
    if (va[i] > vb[i]) return true
    if (va[i] < vb[i]) return false
  }
  return true
}
