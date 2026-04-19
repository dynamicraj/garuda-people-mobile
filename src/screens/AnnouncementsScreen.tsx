import React, { useCallback, useEffect, useState } from 'react'
import { View, Text, ScrollView, RefreshControl, StyleSheet } from 'react-native'
import { useAppStore } from '../state/store'
import { API } from '../api/client'

export default function AnnouncementsScreen() {
  const theme = useAppStore((s) => s.theme)
  const [items, setItems] = useState<any[]>([])
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const r = await API.listAnnouncements()
      setItems(r.data || [])
    } catch {}
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false) }} />}
    >
      <View style={{ padding: 16 }}>
        <Text style={styles.h1}>Announcements</Text>
        {items.length === 0 && <Text style={styles.empty}>No announcements yet</Text>}
        {items.map((a: any) => (
          <View key={a.id} style={styles.card}>
            <Text style={[styles.title, { color: theme.primary }]}>{a.title}</Text>
            {a.created_by_name && <Text style={styles.meta}>By {a.created_by_name}</Text>}
            {a.created_at && <Text style={styles.meta}>{new Date(a.created_at).toLocaleString('en-IN')}</Text>}
            <Text style={styles.body}>{a.content}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  h1: { fontSize: 17, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  empty: { color: '#94a3b8', fontSize: 13, paddingVertical: 16, textAlign: 'center' },
  card: { backgroundColor: '#fff', padding: 14, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  title: { fontSize: 16, fontWeight: '700' },
  meta: { fontSize: 11, color: '#94a3b8', marginTop: 4 },
  body: { fontSize: 14, color: '#334155', marginTop: 10, lineHeight: 20 },
})
