import React, { useCallback, useEffect, useState } from 'react'
import { View, Text, ScrollView, RefreshControl, StyleSheet } from 'react-native'
import { useAppStore } from '../state/store'
import { API } from '../api/client'

export default function ExpensesScreen() {
  const theme = useAppStore((s) => s.theme)
  const [claims, setClaims] = useState<any[]>([])
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const r = await API.listExpenses()
      setClaims(r.data || [])
    } catch {}
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false) }} />}
    >
      <View style={{ padding: 16 }}>
        <Text style={styles.h1}>Expense Claims</Text>
        {claims.length === 0 && <Text style={styles.empty}>No expense claims yet</Text>}
        {claims.map((c: any) => (
          <View key={c.id} style={styles.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.num}>{c.claim_number || `#${c.id}`}</Text>
              <Text style={[styles.badge, statusStyle(c.status)]}>{(c.status || '').toUpperCase()}</Text>
            </View>
            <Text style={[styles.amount, { color: theme.primary }]}>₹{Number(c.total_amount || 0).toLocaleString('en-IN')}</Text>
            <Text style={styles.desc} numberOfLines={2}>{c.description || '(No description)'}</Text>
            <Text style={styles.date}>{c.claim_date}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  )
}

function statusStyle(s: string) {
  if (s === 'paid' || s === 'approved') return { backgroundColor: '#d1fae5', color: '#065f46' } as any
  if (s === 'rejected') return { backgroundColor: '#fee2e2', color: '#991b1b' } as any
  if (s === 'draft') return { backgroundColor: '#e2e8f0', color: '#475569' } as any
  return { backgroundColor: '#fef3c7', color: '#92400e' } as any
}

const styles = StyleSheet.create({
  h1: { fontSize: 17, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  empty: { color: '#94a3b8', fontSize: 13, paddingVertical: 16, textAlign: 'center' },
  card: { backgroundColor: '#fff', padding: 14, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  num: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  badge: { fontSize: 10, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  amount: { fontSize: 22, fontWeight: '800', marginTop: 8 },
  desc: { fontSize: 13, color: '#475569', marginTop: 4 },
  date: { fontSize: 11, color: '#94a3b8', marginTop: 6 },
})
