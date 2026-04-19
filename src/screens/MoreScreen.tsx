import React from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useAppStore } from '../state/store'
import { clearTokens } from '../api/client'
import * as SecureStore from 'expo-secure-store'

type Row = { key: string; label: string; action: () => void }

export default function MoreScreen() {
  const theme = useAppStore((s) => s.theme)
  const user = useAppStore((s) => s.user)
  const resetTenant = useAppStore((s) => s.reset)
  const setAuthenticated = useAppStore((s) => s.setAuthenticated)
  const setUser = useAppStore((s) => s.setUser)

  const logout = async () => {
    Alert.alert('Sign out', 'You will need to sign in again next time.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
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
        { text: 'Disconnect', style: 'destructive', onPress: () => resetTenant() },
      ]
    )
  }

  const rows: Row[] = [
    { key: 'payslips', label: 'Payslips', action: () => Alert.alert('Coming in next build') },
    { key: 'loans', label: 'Loans', action: () => Alert.alert('Coming in next build') },
    { key: 'expenses', label: 'Expense Claims', action: () => Alert.alert('Coming in next build') },
    { key: 'profile', label: 'My Profile', action: () => Alert.alert('Coming in next build') },
    { key: 'notifications', label: 'Notifications', action: () => Alert.alert('Coming in next build') },
    { key: 'reset', label: 'Change Server', action: resetServer },
    { key: 'logout', label: 'Sign Out', action: logout },
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
            <Text style={[styles.rowText, r.key === 'logout' && { color: '#ef4444' }]}>{r.label}</Text>
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
