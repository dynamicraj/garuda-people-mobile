import React, { useCallback, useEffect, useState } from 'react'
import { View, Text, ScrollView, RefreshControl, StyleSheet, TouchableOpacity, Alert, Linking } from 'react-native'
import * as FileSystem from 'expo-file-system/legacy'
import * as SecureStore from 'expo-secure-store'
import { useAppStore } from '../state/store'
import { API } from '../api/client'

export default function PayslipsScreen() {
  const theme = useAppStore((s) => s.theme)
  const serverUrl = useAppStore((s) => s.serverUrl)
  const [slips, setSlips] = useState<any[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [downloading, setDownloading] = useState<number | null>(null)

  const load = useCallback(async () => {
    try {
      const r = await API.listPayslips()
      setSlips(r.data || [])
    } catch {}
  }, [])

  useEffect(() => { load() }, [load])

  const download = async (slip: any) => {
    if (!serverUrl) return
    setDownloading(slip.id)
    try {
      const token = await SecureStore.getItemAsync('access_token')
      const url = `${serverUrl.replace(/\/+$/, '')}/api/payroll/payslip/${slip.id}/pdf`
      const filename = `payslip-${slip.year}-${String(slip.month).padStart(2, '0')}.pdf`
      const dest = `${FileSystem.documentDirectory}${filename}`
      const r = await FileSystem.downloadAsync(url, dest, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (r.status !== 200) throw new Error(`Download failed (HTTP ${r.status})`)
      Alert.alert(
        'Downloaded',
        `Saved to ${filename}. Open it?`,
        [
          { text: 'Later', style: 'cancel' },
          { text: 'Open', onPress: () => Linking.openURL(r.uri).catch(() => {}) },
        ]
      )
    } catch (e: any) {
      Alert.alert('Download failed', e?.message || 'Please try again.')
    } finally {
      setDownloading(null)
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false) }} />}
    >
      <View style={{ padding: 16 }}>
        <Text style={styles.h1}>My Payslips</Text>
        {slips.length === 0 && <Text style={styles.empty}>No payslips yet</Text>}
        {slips.map((s: any) => (
          <View key={s.id} style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{monthName(s.month)} {s.year}</Text>
              <Text style={styles.sub}>Net ₹{formatINR(s.net_salary)}</Text>
              <Text style={styles.small}>Gross ₹{formatINR(s.gross_salary)} · Deductions ₹{formatINR(s.total_deductions)}</Text>
            </View>
            <TouchableOpacity
              style={[styles.dl, { backgroundColor: theme.primary }]}
              onPress={() => download(s)}
              disabled={downloading === s.id}
            >
              <Text style={styles.dlText}>{downloading === s.id ? '…' : 'PDF'}</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </ScrollView>
  )
}

function monthName(m: number): string {
  return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][(m || 1) - 1]
}

function formatINR(n: number | null | undefined): string {
  if (n === null || n === undefined) return '0.00'
  const v = Number(n)
  const [whole, dec] = v.toFixed(2).split('.')
  if (whole.length <= 3) return `${whole}.${dec}`
  const last3 = whole.slice(-3)
  const rest = whole.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',')
  return `${rest},${last3}.${dec}`
}

const styles = StyleSheet.create({
  h1: { fontSize: 17, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  empty: { color: '#94a3b8', fontSize: 13, paddingVertical: 16, textAlign: 'center' },
  card: { backgroundColor: '#fff', padding: 14, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0', flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  sub: { fontSize: 14, color: '#0f172a', marginTop: 2 },
  small: { fontSize: 11, color: '#64748b', marginTop: 4 },
  dl: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 },
  dlText: { color: '#fff', fontSize: 13, fontWeight: '700' },
})
