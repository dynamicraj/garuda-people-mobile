import React, { useCallback, useEffect, useState } from 'react'
import { View, Text, ScrollView, RefreshControl, StyleSheet } from 'react-native'
import { useAppStore } from '../state/store'
import { API } from '../api/client'
import ScreenState from '../components/ScreenState'

export default function LoansScreen() {
  const theme = useAppStore((s) => s.theme)
  const [loans, setLoans] = useState<any[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const r = await API.listLoans()
      setLoans(r.data || [])
    } catch (e: any) {
      // 404 means endpoint doesn't exist on this backend; treat as empty
      if (e?.response?.status === 404) {
        setLoans([])
      } else {
        setError(e?.response?.data?.detail || e?.message || 'Could not load loans.')
      }
    }
    setLoaded(true)
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      contentContainerStyle={{ flexGrow: 1 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false) }} />}
    >
      <ScreenState loading={!loaded} error={error} onRetry={load}>
        <View style={{ padding: 16 }}>
          <Text style={styles.h1}>My Loans</Text>
          {loans.length === 0 ? (
            <Text style={styles.empty}>No active loans</Text>
          ) : (
            loans.map((l: any) => (
              <View key={l.id} style={styles.card}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={styles.title}>{l.loan_type || l.purpose || 'Loan'}</Text>
                  <Text style={[styles.badge, statusStyle(l.status)]}>{(l.status || '').toUpperCase()}</Text>
                </View>
                <View style={styles.amtRow}>
                  <View>
                    <Text style={styles.amtLabel}>Principal</Text>
                    <Text style={[styles.amt, { color: theme.primary }]}>₹{formatINR(l.principal || l.amount)}</Text>
                  </View>
                  <View>
                    <Text style={styles.amtLabel}>Outstanding</Text>
                    <Text style={[styles.amt, { color: '#ef4444' }]}>₹{formatINR(l.outstanding || 0)}</Text>
                  </View>
                  <View>
                    <Text style={styles.amtLabel}>EMI</Text>
                    <Text style={styles.amt}>₹{formatINR(l.emi || l.monthly_installment)}</Text>
                  </View>
                </View>
                {l.next_due_date && (
                  <Text style={styles.due}>Next due: {l.next_due_date}</Text>
                )}
              </View>
            ))
          )}
        </View>
      </ScreenState>
    </ScrollView>
  )
}

function statusStyle(s: string) {
  if (s === 'approved' || s === 'active') return { backgroundColor: '#d1fae5', color: '#065f46' } as any
  if (s === 'closed' || s === 'completed') return { backgroundColor: '#e2e8f0', color: '#475569' } as any
  if (s === 'rejected') return { backgroundColor: '#fee2e2', color: '#991b1b' } as any
  return { backgroundColor: '#fef3c7', color: '#92400e' } as any
}

function formatINR(n: number | null | undefined): string {
  if (n === null || n === undefined) return '0'
  const v = Number(n)
  const whole = Math.round(v).toString()
  if (whole.length <= 3) return whole
  const last3 = whole.slice(-3)
  const rest = whole.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',')
  return `${rest},${last3}`
}

const styles = StyleSheet.create({
  h1: { fontSize: 17, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  empty: { color: '#94a3b8', fontSize: 13, paddingVertical: 16, textAlign: 'center' },
  card: { backgroundColor: '#fff', padding: 14, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  title: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  badge: { fontSize: 10, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  amtRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  amtLabel: { fontSize: 11, color: '#64748b' },
  amt: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginTop: 2 },
  due: { marginTop: 10, fontSize: 12, color: '#f59e0b', fontWeight: '600' },
})
