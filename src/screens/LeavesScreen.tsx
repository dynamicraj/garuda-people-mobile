import React, { useCallback, useEffect, useState } from 'react'
import { View, Text, ScrollView, RefreshControl, StyleSheet, TouchableOpacity } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useAppStore } from '../state/store'
import { API } from '../api/client'

export default function LeavesScreen() {
  const theme = useAppStore((s) => s.theme)
  const nav = useNavigation<any>()
  const [balances, setBalances] = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    try {
      const [b, r] = await Promise.all([API.leaveBalances(), API.listLeaves()])
      setBalances(b.data || [])
      setRequests(r.data || [])
    } catch {}
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false) }} />}
    >
      <View style={{ padding: 16 }}>
        <Text style={styles.h1}>Leave Balances</Text>
        {balances.length === 0 && <Text style={styles.empty}>No leave types allocated</Text>}
        <View style={styles.row}>
          {balances.map((b: any) => (
            <View key={b.id} style={[styles.balCard, { borderLeftColor: b.color || theme.primary }]}>
              <Text style={styles.balName}>{b.leave_type_name || b.name}</Text>
              <Text style={[styles.balValue, { color: theme.primary }]}>
                {(b.allocated_days || 0) - (b.used_days || 0)}
              </Text>
              <Text style={styles.balLabel}>days remaining</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.applyBtn, { backgroundColor: theme.primary }]}
          onPress={() => nav.navigate('ApplyLeave')}
        >
          <Text style={styles.applyText}>+ Apply Leave</Text>
        </TouchableOpacity>

        <Text style={styles.h1}>Recent Requests</Text>
        {requests.length === 0 && <Text style={styles.empty}>No leave requests yet</Text>}
        {requests.slice(0, 20).map((r: any) => (
          <View key={r.id} style={styles.reqCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.reqTitle}>{r.leave_type_name || r.leave_type_id}</Text>
              <Text style={styles.reqDates}>{r.start_date} → {r.end_date} ({r.days} days)</Text>
            </View>
            <Text style={[styles.badge, statusStyle(r.status)]}>{(r.status || '').toUpperCase()}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  )
}

function statusStyle(s: string) {
  if (s === 'approved') return { backgroundColor: '#d1fae5', color: '#065f46' } as any
  if (s === 'rejected') return { backgroundColor: '#fee2e2', color: '#991b1b' } as any
  if (s === 'cancelled') return { backgroundColor: '#e2e8f0', color: '#475569' } as any
  return { backgroundColor: '#fef3c7', color: '#92400e' } as any // pending
}

const styles = StyleSheet.create({
  h1: { fontSize: 17, fontWeight: '700', color: '#0f172a', marginTop: 8, marginBottom: 10 },
  empty: { color: '#94a3b8', fontSize: 13, paddingVertical: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  balCard: { flexBasis: '48%', backgroundColor: '#fff', padding: 14, borderRadius: 12, borderLeftWidth: 4 },
  balName: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  balValue: { fontSize: 26, fontWeight: '800', marginTop: 4 },
  balLabel: { fontSize: 11, color: '#94a3b8' },
  applyBtn: { marginTop: 18, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  applyText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  reqCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 10, marginTop: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  reqTitle: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  reqDates: { fontSize: 12, color: '#64748b', marginTop: 2 },
  badge: { fontSize: 10, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
})
