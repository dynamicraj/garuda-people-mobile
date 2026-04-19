import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, Alert, Image, KeyboardAvoidingView, Platform } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { useAppStore } from '../state/store'
import { API } from '../api/client'
import { GARUDA_BLUE } from '../theme'

export default function ServerUrlScreen() {
  const [url, setUrl] = useState('https://')
  const [busy, setBusy] = useState(false)
  const setServerUrl = useAppStore((s) => s.setServerUrl)
  const applyTheme = useAppStore((s) => s.applyTheme)

  const onSubmit = async () => {
    let cleaned = url.trim().replace(/\/+$/, '')
    if (!/^https?:\/\//i.test(cleaned)) cleaned = 'https://' + cleaned
    setBusy(true)
    try {
      // Tentatively set so the API client sends to the right host
      await setServerUrl(cleaned)
      // Validate via public settings — also gives us the branding
      const res = await API.publicSettings()
      const s = res.data || {}
      if (!s.company_name) {
        throw new Error('Server responded but does not look like a Garuda HR instance.')
      }
      applyTheme(s)
    } catch (e: any) {
      await setServerUrl(null)
      Alert.alert(
        'Could not reach server',
        e?.message || 'Check the URL and your internet connection, then try again.'
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="light" />
      <View style={styles.logoBox}>
        <Image source={require('../../assets/icon.png')} style={styles.logo} />
        <Text style={styles.brand}>Garuda People</Text>
        <Text style={styles.tagline}>Connect to your HR portal</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Server URL</Text>
        <TextInput
          style={styles.input}
          value={url}
          onChangeText={setUrl}
          placeholder="https://hr.mycompany.com"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          editable={!busy}
        />
        <Text style={styles.hint}>
          Ask your HR/IT team for the company's Garuda HR web address.
        </Text>
        <TouchableOpacity
          style={[styles.btn, busy && styles.btnDisabled]}
          onPress={onSubmit}
          disabled={busy}
        >
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Continue</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: GARUDA_BLUE.primary, padding: 24, justifyContent: 'center' },
  logoBox: { alignItems: 'center', marginBottom: 32 },
  logo: { width: 96, height: 96, resizeMode: 'contain' },
  brand: { color: '#fff', fontSize: 28, fontWeight: '700', marginTop: 16 },
  tagline: { color: '#cbd5e1', fontSize: 14, marginTop: 6 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  label: { fontSize: 13, color: '#475569', marginBottom: 6, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0f172a',
  },
  hint: { color: '#94a3b8', fontSize: 12, marginTop: 8 },
  btn: {
    backgroundColor: GARUDA_BLUE.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
