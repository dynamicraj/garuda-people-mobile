import React, { useCallback, useEffect, useState } from 'react'
import { View, Text, ScrollView, RefreshControl, StyleSheet, Image } from 'react-native'
import { useAppStore } from '../state/store'
import { API } from '../api/client'

export default function ProfileScreen() {
  const theme = useAppStore((s) => s.theme)
  const fallback = useAppStore((s) => s.user)
  const [profile, setProfile] = useState<any>(fallback)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const r = await API.myProfile()
      setProfile(r.data || fallback)
    } catch {
      try {
        const me = await API.me()
        setProfile(me.data)
      } catch {}
    }
  }, [fallback])

  useEffect(() => { load() }, [load])

  const serverUrl = useAppStore((s) => s.serverUrl)
  const avatarUri = profile?.avatar
    ? (profile.avatar.startsWith('http') ? profile.avatar : `${serverUrl?.replace(/\/+$/, '')}${profile.avatar.startsWith('/') ? '' : '/'}${profile.avatar}`)
    : null

  const rows: [string, any][] = [
    ['Employee ID', profile?.employee_id],
    ['Full name', profile?.full_name],
    ['Email', profile?.email],
    ['Phone', profile?.phone],
    ['Role', profile?.role],
    ['Department', profile?.department],
    ['Designation', profile?.designation],
    ['Joined', profile?.date_of_joining],
    ['Reporting manager', profile?.reporting_manager_name],
    ['Branch', profile?.branch_name],
  ]

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false) }} />}
    >
      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={{ color: '#fff', fontSize: 32, fontWeight: '800' }}>
              {(profile?.full_name || '?').slice(0, 1).toUpperCase()}
            </Text>
          </View>
        )}
        <Text style={styles.name}>{profile?.full_name || '—'}</Text>
        <Text style={styles.sub}>{profile?.designation || profile?.role || ''}</Text>
      </View>

      <View style={{ padding: 16 }}>
        {rows.map(([k, v]) => (
          <View key={k} style={styles.row}>
            <Text style={styles.rk}>{k}</Text>
            <Text style={styles.rv}>{v || '—'}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', paddingTop: 50, paddingBottom: 24 },
  avatar: { width: 96, height: 96, borderRadius: 48 },
  name: { color: '#fff', fontSize: 22, fontWeight: '700', marginTop: 14 },
  sub: { color: '#cbd5e1', fontSize: 13, marginTop: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  rk: { fontSize: 13, color: '#64748b' },
  rv: { fontSize: 14, color: '#0f172a', fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
})
