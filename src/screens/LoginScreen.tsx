import React, { useEffect, useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet,
  Alert, Image, KeyboardAvoidingView, Platform,
} from 'react-native'
import * as LocalAuthentication from 'expo-local-authentication'
import * as SecureStore from 'expo-secure-store'
import * as Device from 'expo-device'
import Constants from 'expo-constants'
import { StatusBar } from 'expo-status-bar'
import { useAppStore } from '../state/store'
import { API, saveTokens } from '../api/client'
import { getDeviceId } from '../services/device'
import { registerForPush } from '../services/push'
import { ensureBackgroundSync } from '../services/tasks'
import { startNotificationsStream } from '../services/notifications-ws'

async function postLoginRegistration() {
  try {
    const did = await getDeviceId()
    await registerForPush(did, {
      appVersion: (Constants.expoConfig?.version as string) || '3.0.0',
      osVersion: Device.osVersion || undefined,
      deviceModel: Device.modelName || undefined,
    })
    await ensureBackgroundSync()
    startNotificationsStream()
  } catch {
    // non-fatal
  }
}

export default function LoginScreen() {
  const theme = useAppStore((s) => s.theme)
  const setUser = useAppStore((s) => s.setUser)
  const setAuthenticated = useAppStore((s) => s.setAuthenticated)
  const resetTenant = useAppStore((s) => s.reset)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    (async () => {
      const savedUser = await SecureStore.getItemAsync('last_username')
      if (savedUser) setUsername(savedUser)
      const hasBio = await LocalAuthentication.hasHardwareAsync()
      const enrolled = await LocalAuthentication.isEnrolledAsync()
      if (hasBio && enrolled && savedUser) {
        const res = await LocalAuthentication.authenticateAsync({
          promptMessage: `Sign in as ${savedUser}`,
          fallbackLabel: 'Use password',
        })
        if (res.success) {
          // Tokens persist across restarts via API client; if present, we're good
          const token = await SecureStore.getItemAsync('access_token')
          if (token) {
            try {
              const me = await API.me()
              setUser(me.data)
              setAuthenticated(true)
              postLoginRegistration()
              return
            } catch {
              // fall through to password entry
            }
          }
        }
      }
    })()
  }, [])

  const submit = async () => {
    if (!username || !password) return
    setBusy(true)
    try {
      const res = await API.login(username, password)
      const d = res.data
      if (d.requires_2fa) {
        Alert.alert('2FA required', 'Please sign in from the web portal first to complete 2FA setup, then return here.')
        return
      }
      await saveTokens(d.access_token, d.refresh_token)
      await SecureStore.setItemAsync('last_username', username)
      setUser(d.user)
      setAuthenticated(true)
      postLoginRegistration()
    } catch (e: any) {
      Alert.alert('Login failed', e?.response?.data?.detail || e?.message || 'Please check your credentials.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <KeyboardAvoidingView style={[styles.root, { backgroundColor: theme.primary }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="light" />
      <View style={styles.logoBox}>
        {theme.logoUrl ? (
          <Image source={{ uri: theme.logoUrl }} style={styles.logo} />
        ) : (
          <Image source={require('../../assets/icon.png')} style={styles.logo} />
        )}
        <Text style={styles.brand}>{theme.companyName}</Text>
        <Text style={styles.tagline}>HR Portal</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          placeholder="employee.name"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!busy}
        />
        <Text style={[styles.label, { marginTop: 12 }]}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          secureTextEntry
          editable={!busy}
        />
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: theme.primary }, busy && styles.btnDisabled]}
          onPress={submit}
          disabled={busy}
        >
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Sign In</Text>}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() =>
            Alert.alert(
              'Change server?',
              'This will disconnect from the current server. You will need to enter the server URL again.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Disconnect', style: 'destructive', onPress: () => resetTenant() },
              ]
            )
          }
          style={{ marginTop: 18, alignItems: 'center' }}
        >
          <Text style={{ color: '#64748b', fontSize: 12 }}>Change server</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 24, justifyContent: 'center' },
  logoBox: { alignItems: 'center', marginBottom: 28 },
  logo: { width: 96, height: 96, resizeMode: 'contain' },
  brand: { color: '#fff', fontSize: 24, fontWeight: '700', marginTop: 14 },
  tagline: { color: '#cbd5e1', fontSize: 13, marginTop: 4 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  label: { fontSize: 13, color: '#475569', marginBottom: 6, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: '#0f172a' },
  btn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 18 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
