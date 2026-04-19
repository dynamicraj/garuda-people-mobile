import React, { useEffect, useState } from 'react'
import { View, ActivityIndicator, Image } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import * as SecureStore from 'expo-secure-store'
import { useAppStore } from './src/state/store'
import { API } from './src/api/client'
import RootNavigation from './src/navigation'
import { GARUDA_BLUE } from './src/theme'
// Register background task handlers at module load — must not be deferred.
import './src/services/tasks'
import { startNotificationsStream } from './src/services/notifications-ws'

export default function App() {
  const [booting, setBooting] = useState(true)
  const loadFromStorage = useAppStore((s) => s.loadFromStorage)
  const setAuthenticated = useAppStore((s) => s.setAuthenticated)
  const setUser = useAppStore((s) => s.setUser)
  const applyTheme = useAppStore((s) => s.applyTheme)

  useEffect(() => {
    (async () => {
      try {
        await loadFromStorage()
        const token = await SecureStore.getItemAsync('access_token')
        if (token) {
          try {
            const me = await API.me()
            setUser(me.data)
            setAuthenticated(true)
            startNotificationsStream()
          } catch {
            await SecureStore.deleteItemAsync('access_token')
            await SecureStore.deleteItemAsync('refresh_token')
          }
        }
        const s = useAppStore.getState()
        if (s.serverUrl) {
          try {
            const res = await API.publicSettings()
            applyTheme(res.data || {})
          } catch {}
        }
      } finally {
        setBooting(false)
      }
    })()
  }, [])

  if (booting) {
    return (
      <View style={{ flex: 1, backgroundColor: GARUDA_BLUE.primary, justifyContent: 'center', alignItems: 'center' }}>
        <Image source={require('./assets/icon.png')} style={{ width: 100, height: 100, resizeMode: 'contain', marginBottom: 20 }} />
        <ActivityIndicator color="#fff" size="large" />
      </View>
    )
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <RootNavigation />
    </SafeAreaProvider>
  )
}
