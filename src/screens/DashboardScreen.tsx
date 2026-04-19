import React, { useCallback, useEffect, useState } from 'react'
import { View, Text, ScrollView, RefreshControl, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native'
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
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoadError(null)
    const results = await Promise.allSettled([
      API.myStatus(),
      API.listAnnouncements(),
      API.listAlerts(true),
    ])
    const [s, a, al] = results
    if (s.status === 'fulfilled') {
      setStatus(s.value.data)
      setPunchState(!!s.value.data?.currently_in, s.value.data?.last_punch_at ?? null)
    }
    if (a.status === 'fulfilled') setAnnouncements((a.value.data || []).slice(0, 3))
    if (al.status === 'fulfilled') setAlerts((al.value.data || []).slice(0, 5))
    // If ALL failed, surface it
    if (results.every((r) => r.status === 'rejected')) {
      const err = (results[0] as PromiseRejectedResult).reason
      setLoadError(err?.response?.data?.detail || err?.message || 'Could not load dashboard')
    }
    setLoaded(true)
  }, [setPunchState])

  useEffect(() => { load() }, [load])

  const onRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  // user may come back as undefined briefly during refresh — default to
  // the last-known flag in status; only hide the button if we're certain.
  const canPunch = user?.allow_mobile_punch === true || status?.allow_mobile_punch === true
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
          <View style={{ flex: 1 }}>
            <Text style={styles.greet}>Hello, {user?.full_name?.split(' ')[0] || 'there'}</Text>
            <Text style={styles.co}>{theme.companyName}</Text>
          </View>
        </View>
      </View>

      {/* Big round punch button — the centerpiece of the dashboard */}
      {!loaded ? (
        <View style={styles.punchSlot}>
          <ActivityIndicator color={theme.primary} size="large" />
        </View>
      ) : canPunch ? (
        <View style={styles.punchSlot}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={[
              styles.punchBtn,
              { backgroundColor: currentlyIn ? '#ef4444' : '#10b981' },
            ]}
            onPress={() => navigation.navigate('Punch')}
          >
            <View style={styles.pulseRing} />
            <Text style={styles.punchTitle}>{currentlyIn ? 'PUNCH OUT' : 'PUNCH IN'}</Text>
            <Text style={styles.punchSubtitle}>
              {currentlyIn
                ? `Since ${(status?.last_punch_at || '').slice(11, 16) || '—'}`
                : 'Tap to start shift'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        user && (
          <View style={styles.punchSlot}>
            <View style={[styles.punchBtn, styles.punchBtnDisabled]}>
              <Text style={styles.punchTitleDisabled}>MOBILE PUNCH</Text>
              <Text style={styles.punchSubtitleDisabled}>Not enabled for your account</Text>
              <Text style={styles.punchSubtitleDisabled}>Contact HR/Admin</Text>
            </View>
          </View>
        )
      )}

      {loadError && (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Could not load dashboard</Text>
          <Text style={styles.errorBody}>{loadError}</Text>
          <TouchableOpacity style={[styles.errorBtn, { borderColor: theme.primary }]} onPress={load}>
            <Text style={[styles.errorBtnText, { color: theme.primary }]}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.row2}>
        <StatCard label="Today" value={currentlyIn ? 'Working' : 'Not in'} theme={theme} />
        <StatCard label="Unread alerts" value={`${alerts.length}`} theme={theme} />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Announcements</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Announcements')}>
            <Text style={[styles.sectionLink, { color: theme.primary }]}>See all</Text>
          </TouchableOpacity>
        </View>
        {announcements.length === 0 && loaded && !loadError && (
          <Text style={styles.empty}>No new announcements</Text>
        )}
        {announcements.map((a: any) => (
          <TouchableOpacity key={a.id} style={styles.card} onPress={() => navigation.navigate('Announcements')}>
            <Text style={styles.cardTitle}>{a.title}</Text>
            <Text style={styles.cardBody} numberOfLines={3}>{a.content}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Alerts</Text>
        {alerts.length === 0 && loaded && !loadError && (
          <Text style={styles.empty}>You're all caught up</Text>
        )}
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

  punchSlot: { alignItems: 'center', paddingVertical: 28 },
  punchBtn: {
    width: 220, height: 220, borderRadius: 110,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 18, shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  pulseRing: {
    position: 'absolute', width: 244, height: 244, borderRadius: 122,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
  },
  punchTitle: { color: '#fff', fontSize: 28, fontWeight: '800', letterSpacing: 2 },
  punchSubtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 8, textAlign: 'center' },
  punchBtnDisabled: { backgroundColor: '#e2e8f0' },
  punchTitleDisabled: { color: '#94a3b8', fontSize: 18, fontWeight: '700' },
  punchSubtitleDisabled: { color: '#94a3b8', fontSize: 12, marginTop: 4, textAlign: 'center' },

  row2: { flexDirection: 'row', paddingHorizontal: 16, gap: 12 },
  stat: { flex: 1, borderRadius: 12, padding: 14 },
  statLabel: { color: '#64748b', fontSize: 12 },
  statValue: { fontSize: 20, fontWeight: '700', marginTop: 4 },

  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 10 },
  sectionLink: { fontSize: 13, fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  cardBody: { fontSize: 13, color: '#475569', marginTop: 4 },
  empty: { color: '#94a3b8', fontSize: 13, textAlign: 'center', paddingVertical: 12 },

  errorBox: { marginHorizontal: 16, marginBottom: 16, padding: 14, backgroundColor: '#fef2f2', borderRadius: 12, borderWidth: 1, borderColor: '#fecaca' },
  errorTitle: { color: '#991b1b', fontWeight: '700' },
  errorBody: { color: '#b91c1c', fontSize: 12, marginTop: 4 },
  errorBtn: { alignSelf: 'flex-start', marginTop: 10, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  errorBtnText: { fontSize: 12, fontWeight: '700' },
})
