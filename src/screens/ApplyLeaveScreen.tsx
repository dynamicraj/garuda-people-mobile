import React, { useEffect, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, Platform } from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useAppStore } from '../state/store'
import { API } from '../api/client'
import { useNavigation } from '@react-navigation/native'

export default function ApplyLeaveScreen() {
  const theme = useAppStore((s) => s.theme)
  const nav = useNavigation<any>()
  const [types, setTypes] = useState<any[]>([])
  const [typeId, setTypeId] = useState<number | null>(null)
  const [start, setStart] = useState<Date>(new Date())
  const [end, setEnd] = useState<Date>(new Date())
  const [reason, setReason] = useState('')
  const [isHalfDay, setIsHalfDay] = useState(false)
  const [busy, setBusy] = useState(false)
  const [showPicker, setShowPicker] = useState<'start' | 'end' | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const r = await API.leaveTypes()
        const list = r.data || []
        setTypes(list)
        if (list.length) setTypeId(list[0].id)
      } catch {}
    })()
  }, [])

  const submit = async () => {
    if (!typeId) { Alert.alert('Select a leave type'); return }
    if (!reason.trim()) { Alert.alert('Please enter a reason'); return }
    if (end < start) { Alert.alert('End date must be on or after start date'); return }
    setBusy(true)
    try {
      await API.applyLeave({
        leave_type_id: typeId,
        start_date: start.toISOString().slice(0, 10),
        end_date: end.toISOString().slice(0, 10),
        reason,
        is_half_day: isHalfDay,
      })
      Alert.alert('Submitted', 'Your leave request has been sent for approval.')
      nav.goBack()
    } catch (e: any) {
      Alert.alert('Could not submit', e?.response?.data?.detail || e?.message || 'Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ padding: 16 }}>
        <Text style={styles.label}>Leave Type</Text>
        <View style={styles.typeRow}>
          {types.map((t: any) => (
            <TouchableOpacity
              key={t.id}
              style={[styles.typePill, typeId === t.id && { backgroundColor: theme.primary, borderColor: theme.primary }]}
              onPress={() => setTypeId(t.id)}
            >
              <Text style={[styles.typeText, typeId === t.id && { color: '#fff' }]}>{t.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>From</Text>
        <TouchableOpacity style={styles.dateField} onPress={() => setShowPicker('start')}>
          <Text style={styles.dateText}>{start.toDateString()}</Text>
        </TouchableOpacity>
        {showPicker === 'start' && (
          <DateTimePicker
            value={start}
            mode="date"
            onChange={(_, d) => {
              setShowPicker(null)
              if (d) { setStart(d); if (end < d) setEnd(d) }
            }}
          />
        )}

        <Text style={styles.label}>To</Text>
        <TouchableOpacity style={styles.dateField} onPress={() => setShowPicker('end')}>
          <Text style={styles.dateText}>{end.toDateString()}</Text>
        </TouchableOpacity>
        {showPicker === 'end' && (
          <DateTimePicker
            value={end}
            mode="date"
            minimumDate={start}
            onChange={(_, d) => {
              setShowPicker(null)
              if (d) setEnd(d)
            }}
          />
        )}

        <TouchableOpacity
          style={styles.halfRow}
          onPress={() => setIsHalfDay(v => !v)}
        >
          <View style={[styles.checkbox, isHalfDay && { backgroundColor: theme.primary, borderColor: theme.primary }]}>
            {isHalfDay && <Text style={{ color: '#fff', fontWeight: '800' }}>✓</Text>}
          </View>
          <Text style={styles.halfText}>Half day</Text>
        </TouchableOpacity>

        <Text style={styles.label}>Reason</Text>
        <TextInput
          style={[styles.input, { minHeight: 100, textAlignVertical: 'top' }]}
          multiline
          value={reason}
          onChangeText={setReason}
          placeholder="Briefly describe the reason for your leave"
        />

        <TouchableOpacity
          style={[styles.submit, { backgroundColor: theme.primary }, busy && { opacity: 0.6 }]}
          onPress={submit}
          disabled={busy}
        >
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Submit Request</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  label: { fontSize: 13, color: '#475569', fontWeight: '600', marginTop: 14, marginBottom: 6 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typePill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' },
  typeText: { fontSize: 13, color: '#0f172a', fontWeight: '600' },
  dateField: { backgroundColor: '#fff', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  dateText: { fontSize: 15, color: '#0f172a' },
  halfRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14, gap: 10 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center' },
  halfText: { fontSize: 14, color: '#0f172a' },
  input: { backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, borderWidth: 1, borderColor: '#e2e8f0' },
  submit: { marginTop: 20, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
