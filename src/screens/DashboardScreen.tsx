import React, { useCallback, useEffect, useState } from 'react'
import { View, Text, ScrollView, RefreshControl, StyleSheet, TouchableOpacity, Image } from 'react-native'
import { useAppStore } from '../state/store'
import { API } from '../api/client'
import { useNavigation } from '@react-navigation/native'

export default function DashboardScreen() {
  const theme = useAppStore((s) => s.theme)
  const user = useAppStore((s) => s.user)
  const setPunchState = useAppStore((s) => s.setPunchState)
  const navigation = useNavigation<any>()

  const [status, setStatus] = useState<any>(null)
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any[]>([])
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const [s, a, al] = await Promise.all([
        API.myStatus(),
        API.listAnnouncements(),
        API.listAlerts(true),
      ])
      setStatus(s.data)
      setPunchState(!!s.data?.currently_in, s.data?.last_punch_at ?? null)
      setAnnouncements((a.data || []).slice(0, 3))
      setAlerts((al.data || []).slice(0, 5))
    } catch {}
  }, [setPunchState])

  useEffect(() => { load() }, [load])

  const onRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const canPunch = !!user?.allow_mobile_punch
  const currentlyIn = !!status?.currently_in

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {theme.logoUrl ? (
            <Image source={{ uri: theme.logoUrl }} style={styles.logo} />
          ) : (
            <Image source={require('../../assets/icon.png')} style={styles.logo} />
          )}
          <View>
            <Text style={styles.greet}>Hello, {user?.full_name?.split(' ')[0] || 'there'}</Text>
            <Text style={styles.co}>{theme.companyName}</Text>
          </View>
        </View>
      </View>

      {canPunch && (
        <TouchableOpacity
          style={[styles.punchCard, { backgroundColor: currentlyIn ? '#ef4444' : '#10b981' }]}
          onPress={() => navigation.navigate('Punch')}
        >
          <Text style={styles.punchLabel}>{currentlyIn ? 'PUNCHED IN' : 'TAP TO PUNCH IN'}</Text>
          <Text style={styles.punchSub}>
            {currentlyIn
              ? `Since ${status?.last_punch_at?.slice(11, 16) || '—'}`
              : 'Start your workday'}
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.row2}>
        <StatCard label="Today" value={currentlyIn ? 'Working' : 'Not in'} theme={theme} />
        <StatCard label="Pending" value={`${alerts.length}`} theme={theme} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Announcements</Text>
        {announcements.length === 0 && <Text style={styles.empty}>No new announcements</Text>}
        {announcements.map((a: any) => (
          <View key={a.id} style={styles.card}>
            <Text style={styles.cardTitle}>{a.title}</Text>
            <Text style={styles.cardBody} numberOfLines={3}>{a.content}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Alerts</Text>
        {alerts.length === 0 && <Text style={styles.empty}>You're all caught up</Text>}
        {alerts.map((a: any) => (
          <View key={a.id} style={styles.card}>
            <Text style={styles.cardTitle}>{a.title}</Text>
            <Text style={styles.cardBody} numberOfLines={2}>{a.message}</Text>
          </View>
        ))}
      </View>

      <View style={{ height: 30 }} />
    </ScrollView>
  )
}

function StatCard({ label, value, theme }: any) {
  return (
    <View style={[styles.stat, { backgroundColor: theme.surface }]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color: theme.primary }]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  header: { padding: 20, paddingTop: 50, paddingBottom: 24 },
  logo: { width: 44, height: 44, resizeMode: 'contain' },
  greet: { color: '#fff', fontSize: 18, fontWeight: '700' },
  co: { color: '#cbd5e1', fontSize: 12, marginTop: 2 },
  punchCard: { margin: 16, borderRadius: 16, padding: 24, alignItems: 'center' },
  punchLabel: { color: '#fff', fontSize: 20, fontWeight: '800', letterSpacing: 1 },
  punchSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 6 },
  row2: { flexDirection: 'row', paddingHorizontal: 16, gap: 12 },
  stat: { flex: 1, borderRadius: 12, padding: 14 },
  statLabel: { color: '#64748b', fontSize: 12 },
  statValue: { fontSize: 20, fontWeight: '700', marginTop: 4 },
  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 10 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  cardBody: { fontSize: 13, color: '#475569', marginTop: 4 },
  empty: { color: '#94a3b8', fontSize: 13, textAlign: 'center', paddingVertical: 12 },
})
