/**
 * First-run consent screen — required for Google Play approval of
 * background location + camera permissions. Shown only once; flag is
 * persisted to AsyncStorage. User cannot proceed without accepting.
 */
import React, { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAppStore } from '../state/store'

export const CONSENT_KEY = '@garuda/consent_v1'

export default function ConsentScreen({ onAccept }: { onAccept: () => void }) {
  const theme = useAppStore((s) => s.theme)
  const [busy, setBusy] = useState(false)

  const accept = async () => {
    setBusy(true)
    try {
      await AsyncStorage.setItem(CONSENT_KEY, JSON.stringify({
        accepted_at: new Date().toISOString(),
        version: 1,
      }))
      onAccept()
    } finally {
      setBusy(false)
    }
  }

  const decline = () => {
    Alert.alert(
      'Consent required',
      'Garuda People needs these permissions to function as an HR/attendance app. If you decline, the app cannot be used on this device.',
      [{ text: 'OK' }]
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 50 }}>
        <Text style={styles.h1}>Before you begin</Text>
        <Text style={styles.p}>
          Garuda People is an HR and attendance app provided by your employer. By tapping
          <Text style={styles.b}> "I understand & Accept"</Text> you consent to the following,
          as required by your employment terms:
        </Text>

        <Section title="Location">
          <Bullet>
            Your precise location is captured <Text style={styles.b}>only when you punch in or out</Text>.
          </Bullet>
          <Bullet>
            While you are punched in, the app may periodically log your location in the background
            so your employer can verify you are at the work site. <Text style={styles.b}>Tracking stops
            the moment you punch out.</Text>
          </Bullet>
          <Bullet>
            On Android, a persistent notification will show "Garuda People is tracking your work
            location" whenever background tracking is active — required by Android 14+.
          </Bullet>
        </Section>

        <Section title="Camera">
          <Bullet>The camera is used to take a selfie at the time of punch — standard attendance practice to prevent buddy-punching.</Bullet>
          <Bullet>Selfies are uploaded to your company's HR server and are only visible to HR/admin staff.</Bullet>
        </Section>

        <Section title="Notifications">
          <Bullet>Push notifications are sent for HR announcements, leave decisions, alerts, and discipline events.</Bullet>
          <Bullet>You can turn individual event types off later in Settings.</Bullet>
        </Section>

        <Section title="Your data">
          <Bullet>All data is sent only to your company's configured HR server. Garuda Yantra does not operate a central data store.</Bullet>
          <Bullet>On sign-out, your session token is cleared. On "Change Server", all cached data is wiped.</Bullet>
        </Section>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.declineBtn} onPress={decline} disabled={busy}>
            <Text style={styles.declineText}>Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.acceptBtn, { backgroundColor: theme.primary }]} onPress={accept} disabled={busy}>
            <Text style={styles.acceptText}>I understand & Accept</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 16 }}>
      <Text style={styles.h2}>{title}</Text>
      <View style={{ marginTop: 4 }}>{children}</View>
    </View>
  )
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', marginTop: 6 }}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={styles.bullet}>{children}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  h1: { fontSize: 24, fontWeight: '800', color: '#0f172a' },
  h2: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  p: { fontSize: 14, color: '#334155', marginTop: 10, lineHeight: 20 },
  b: { fontWeight: '700', color: '#0f172a' },
  bullet: { fontSize: 13, color: '#475569', flex: 1, lineHeight: 20 },
  bulletDot: { width: 16, color: '#94a3b8', fontSize: 14, lineHeight: 20 },
  actions: { marginTop: 28, flexDirection: 'row', gap: 12 },
  declineBtn: { flex: 1, borderWidth: 1, borderColor: '#cbd5e1', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  declineText: { color: '#64748b', fontSize: 15, fontWeight: '700' },
  acceptBtn: { flex: 2, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  acceptText: { color: '#fff', fontSize: 15, fontWeight: '700' },
})
