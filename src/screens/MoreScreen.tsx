import React from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useAppStore } from '../state/store'
import { API, clearTokens } from '../api/client'
import * as SecureStore from 'expo-secure-store'
import { getDeviceId } from '../services/device'
import { stopBackgroundLocation } from '../services/tasks'
import { stopNotificationsStream } from '../services/notifications-ws'

type Row = { key: string; label: string; action: () => void; tint?: string }

export default function MoreScreen() {
  const theme = useAppStore((s) => s.theme)
  const user = useAppStore((s) => s.user)
  const resetTenant = useAppStore((s) => s.reset)
  const setAuthenticated = useAppStore((s) => s.setAuthenticated)
  const setUser = useAppStore((s) => s.setUser)
  const nav = useNavigation<any>()

  const logout = async () => {
    Alert.alert('Sign out', 'You will need to sign in again next time.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          try {
            const did = await getDeviceId()
            await API.unregisterToken(did).catch(() => {})
          } catch {}
          stopNotificationsStream()
          await stopBackgroundLocation().catch(() => {})
          await clearTokens()
          await SecureStore.deleteItemAsync('last_username')
          setUser(null)
          setAuthenticated(false)
        },
      },
    ])
  }

  const resetServer = () => {
    Alert.alert(
      'Disconnect from server?',
      'The app will revert to Garuda branding and you will need to enter the server URL again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            await stopBackgroundLocation().catch(() => {})
            await resetTenant()
          },
        },
      ]
    )
  }

  const rows: Row[] = [
    { key: 'profile', label: 'My Profile', action: () => nav.navigate('Profile') },
    { key: 'payslips', label: 'Payslips', action: () => nav.navigate('Payslips') },
    { key: 'loans', label: 'Loans', action: () => nav.navigate('Loans') },
    { key: 'expenses', label: 'Expense Claims', action: () => nav.navigate('Expenses') },
    { key: 'announcements', label: 'Announcements', action: () => nav.navigate('Announcements') },
    { key: 'reset', label: 'Change Server', action: resetServer },
    { key: 'logout', label: 'Sign Out', action: logout, tint: '#ef4444' },
  ]

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <Text style={styles.name}>{user?.full_name || 'Employee'}</Text>
        <Text style={styles.sub}>{user?.role || ''} · {theme.companyName}</Text>
      </View>
      <View style={{ padding: 12 }}>
        {rows.map((r) => (
          <TouchableOpacity key={r.key} style={styles.row} onPress={r.action}>
            <Text style={[styles.rowText, r.tint && { color: r.tint }]}>{r.label}</Text>
            <Text style={styles.chev}>›</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  header: { padding: 20, paddingTop: 50 },
  name: { color: '#fff', fontSize: 18, fontWeight: '700' },
  sub: { color: '#cbd5e1', fontSize: 13, marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', padding: 16, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  rowText: { fontSize: 15, color: '#0f172a' },
  chev: { color: '#cbd5e1', fontSize: 20, fontWeight: '800' },
})
