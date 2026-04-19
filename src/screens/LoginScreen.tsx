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
import { API, getClient, saveTokens } from '../api/client'
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
  } catch {}
}

export default function LoginScreen() {
  const theme = useAppStore((s) => s.theme)
  const setUser = useAppStore((s) => s.setUser)
  const setAuthenticated = useAppStore((s) => s.setAuthenticated)
  const resetTenant = useAppStore((s) => s.reset)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  // 2FA state
  const [needs2FA, setNeeds2FA] = useState(false)
  const [tempToken, setTempToken] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [trustDevice, setTrustDevice] = useState(true)

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
          const token = await SecureStore.getItemAsync('access_token')
          if (token) {
            try {
              const me = await API.me()
              setUser(me.data)
              setAuthenticated(true)
              postLoginRegistration()
              return
            } catch {}
          }
        }
      }
    })()
  }, [])

  const finalizeLogin = async (d: any) => {
    await saveTokens(d.access_token, d.refresh_token)
    await SecureStore.setItemAsync('last_username', username)
    setUser(d.user)
    setAuthenticated(true)
    postLoginRegistration()
  }

  const submit = async () => {
    if (!username || !password) return
    setBusy(true)
    try {
      const res = await API.login(username, password)
      const d = res.data
      if (d.requires_2fa) {
        setTempToken(d.temp_token || d.tempToken || '')
        setNeeds2FA(true)
        setBusy(false)
        return
      }
      await finalizeLogin(d)
    } catch (e: any) {
      // Backend may return 202 or 4xx with requires_2fa flag — handle both
      const data = e?.response?.data
      if (data?.requires_2fa) {
        setTempToken(data.temp_token || data.tempToken || '')
        setNeeds2FA(true)
        setBusy(false)
        return
      }
      Alert.alert('Login failed', data?.detail || e?.message || 'Please check your credentials.')
    } finally {
      setBusy(false)
    }
  }

  const verify2FA = async () => {
    if (totpCode.length < 6) return
    setBusy(true)
    try {
      const cx = getClient()
      const res = await cx.post('/api/auth/2fa/login', {
        temp_token: tempToken,
        totp_code: totpCode,
        trust_device: trustDevice,
        trust_days: 30,
      })
      await finalizeLogin(res.data)
    } catch (e: any) {
      Alert.alert('Invalid code', e?.response?.data?.detail || e?.message || 'Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const back = () => {
    setNeeds2FA(false)
    setTotpCode('')
    setTempToken('')
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
        {!needs2FA ? (
          <>
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
              onSubmitEditing={submit}
            />
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: theme.primary }, busy && styles.btnDisabled]}
              onPress={submit}
              disabled={busy}
            >
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Sign In</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.twoFaTitle}>Two-factor verification</Text>
            <Text style={styles.twoFaHint}>
              Enter the 6-digit code from your authenticator app
            </Text>
            <TextInput
              style={styles.otpInput}
              value={totpCode}
              onChangeText={(t) => setTotpCode(t.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              editable={!busy}
              onSubmitEditing={verify2FA}
            />
            <TouchableOpacity
              style={styles.trustRow}
              onPress={() => setTrustDevice((v) => !v)}
            >
              <View style={[styles.checkbox, trustDevice && { backgroundColor: theme.primary, borderColor: theme.primary }]}>
                {trustDevice && <Text style={{ color: '#fff', fontWeight: '800' }}>✓</Text>}
              </View>
              <Text style={styles.trustText}>Trust this device for 30 days</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: theme.primary }, (busy || totpCode.length < 6) && styles.btnDisabled]}
              onPress={verify2FA}
              disabled={busy || totpCode.length < 6}
            >
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Verify</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={back} style={{ marginTop: 14, alignItems: 'center' }}>
              <Text style={{ color: '#64748b', fontSize: 13 }}>← Back to password</Text>
            </TouchableOpacity>
          </>
        )}

        {!needs2FA && (
          <TouchableOpacity
            onPress={() =>
              Alert.alert(
                'Change server?',
                'This will disconnect from the current server.',
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
        )}
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
  twoFaTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a', textAlign: 'center' },
  twoFaHint: { fontSize: 13, color: '#64748b', textAlign: 'center', marginTop: 6, marginBottom: 18 },
  otpInput: {
    borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10,
    paddingVertical: 14, paddingHorizontal: 16, fontSize: 24,
    letterSpacing: 8, textAlign: 'center', fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
  },
  trustRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center' },
  trustText: { fontSize: 13, color: '#0f172a' },
})
