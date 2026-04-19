import React, { useEffect, useState } from 'react'
import {
  View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Alert, Image, ScrollView,
} from 'react-native'
import * as Location from 'expo-location'
import { CameraView, useCameraPermissions, CameraType } from 'expo-camera'
import * as FileSystem from 'expo-file-system/legacy'
import Constants from 'expo-constants'
import { useAppStore } from '../state/store'
import { API } from '../api/client'
import { enqueuePunch, pendingCount } from '../db'
import { startBackgroundLocation, stopBackgroundLocation } from '../services/tasks'

function uuid(): string {
  // Good enough for offline IDs; avoids adding a crypto dep.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export default function PunchScreen({ navigation }: any) {
  const theme = useAppStore((s) => s.theme)
  const user = useAppStore((s) => s.user)
  const currentlyIn = useAppStore((s) => s.currentlyPunchedIn)
  const setPunchState = useAppStore((s) => s.setPunchState)
  const setQueueCount = useAppStore((s) => s.setOfflineQueueCount)

  const [busy, setBusy] = useState(false)
  const [step, setStep] = useState<'idle' | 'selfie' | 'submitting'>('idle')
  const [camPermission, requestCamera] = useCameraPermissions()
  const [camera, setCamera] = useState<any>(null)
  const [facing] = useState<CameraType>('front')

  useEffect(() => {
    // Refresh pending count on mount
    pendingCount().then(setQueueCount)
  }, [setQueueCount])

  if (!user?.allow_mobile_punch) {
    return (
      <View style={styles.center}>
        <Text style={{ fontSize: 16, color: '#64748b', textAlign: 'center', padding: 24 }}>
          Mobile punch is not enabled for your account. Contact HR/Admin.
        </Text>
      </View>
    )
  }

  const ensurePermissions = async (): Promise<boolean> => {
    const fg = await Location.requestForegroundPermissionsAsync()
    if (fg.status !== 'granted') {
      Alert.alert('Location required', 'Garuda People needs location to record your punch.')
      return false
    }
    const svc = await Location.hasServicesEnabledAsync()
    if (!svc) {
      Alert.alert('Turn on Location', 'Please enable location/GPS on your device.')
      return false
    }
    // Ask for background permission only when the user is punching IN — Play Store
    // guidelines require background location prompts to be contextual.
    if (!currentlyIn) {
      const bg = await Location.requestBackgroundPermissionsAsync()
      if (bg.status !== 'granted') {
        Alert.alert(
          'Background location recommended',
          'Without "Allow all the time", your location will not be logged while the app is in the background. Attendance may be incomplete.'
        )
      }
    }
    if (!camPermission?.granted) {
      const r = await requestCamera()
      if (!r.granted) {
        Alert.alert('Camera required', 'A selfie is required for punching.')
        return false
      }
    }
    return true
  }

  const beginPunch = async () => {
    if (busy) return
    const ok = await ensurePermissions()
    if (!ok) return
    setStep('selfie')
  }

  const capture = async () => {
    if (!camera) return
    setBusy(true)
    setStep('submitting')
    try {
      const pic = await camera.takePictureAsync({ quality: 0.5, skipProcessing: false, exif: false })
      const coords = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })

      const punchType: 'in' | 'out' = currentlyIn ? 'out' : 'in'

      // Try to upload selfie first — non-blocking
      let selfie_path: string | undefined
      try {
        const form = new FormData()
        // @ts-ignore — RN FormData file shape
        form.append('file', {
          uri: pic.uri,
          name: `selfie-${Date.now()}.jpg`,
          type: 'image/jpeg',
        } as any)
        const upload = await API.uploadSelfie(form)
        selfie_path = upload.data?.path || upload.data?.filename
      } catch {
        // Offline or server busy — skip; we'll queue the punch anyway
      }

      const deviceInfo = `${Constants.expoConfig?.version || '3.0.0'} / ${Constants.platform?.ios ? 'ios' : 'android'}`

      try {
        const res = await API.punch({
          punch_type: punchType,
          latitude: coords.coords.latitude,
          longitude: coords.coords.longitude,
          accuracy: coords.coords.accuracy || undefined,
          selfie_path,
          device_info: deviceInfo,
        })
        const d = res.data
        if (d?.status === 'too_soon') {
          Alert.alert('Too soon', d.message || 'Please wait before punching again.')
        } else {
          setPunchState(punchType === 'in')
          if (punchType === 'in') {
            startBackgroundLocation().catch(() => {})
          } else {
            stopBackgroundLocation().catch(() => {})
          }
          Alert.alert('Punched ' + punchType.toUpperCase(), 'Recorded successfully.')
        }
      } catch (e: any) {
        // Offline / server error — queue locally
        await enqueuePunch({
          id: uuid(),
          punch_type: punchType,
          created_at: new Date().toISOString(),
          latitude: coords.coords.latitude,
          longitude: coords.coords.longitude,
          accuracy: coords.coords.accuracy ?? null,
          selfie_uri: pic.uri,
          device_info: deviceInfo,
        })
        setPunchState(punchType === 'in')
        const n = await pendingCount()
        setQueueCount(n)
        Alert.alert('Queued offline', `Punch saved on device (${n} pending). It will sync automatically when the network is available.`)
      }
      navigation.goBack()
    } catch (e: any) {
      Alert.alert('Punch failed', e?.message || 'Please try again.')
    } finally {
      setBusy(false)
      setStep('idle')
    }
  }

  if (step === 'selfie' || step === 'submitting') {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <CameraView
          ref={setCamera}
          facing={facing}
          style={{ flex: 1 }}
        />
        <View style={styles.camFooter}>
          {step === 'submitting' ? (
            <ActivityIndicator color="#fff" size="large" />
          ) : (
            <TouchableOpacity style={styles.shutter} onPress={capture} />
          )}
        </View>
      </View>
    )
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={[styles.heroCard, { backgroundColor: currentlyIn ? '#ef4444' : '#10b981' }]}>
        <Text style={styles.heroLabel}>{currentlyIn ? 'CURRENTLY IN' : 'READY TO PUNCH IN'}</Text>
        <Text style={styles.heroSub}>
          {currentlyIn
            ? 'Tap below to punch OUT'
            : 'Tap below to start your shift'}
        </Text>
      </View>

      <View style={{ padding: 16 }}>
        <TouchableOpacity
          style={[styles.bigBtn, { backgroundColor: currentlyIn ? '#ef4444' : '#10b981' }]}
          onPress={beginPunch}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.bigBtnText}>{currentlyIn ? 'PUNCH OUT' : 'PUNCH IN'}</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.note}>
          Location + selfie are required for every punch. If your device is offline,
          punches are saved locally and synced automatically later.
        </Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  heroCard: { margin: 16, borderRadius: 16, padding: 28, alignItems: 'center' },
  heroLabel: { color: '#fff', fontSize: 24, fontWeight: '800', letterSpacing: 1 },
  heroSub: { color: 'rgba(255,255,255,0.85)', fontSize: 14, marginTop: 8 },
  bigBtn: { paddingVertical: 20, borderRadius: 16, alignItems: 'center' },
  bigBtnText: { color: '#fff', fontSize: 22, fontWeight: '800' },
  note: { color: '#64748b', fontSize: 13, marginTop: 16, textAlign: 'center', paddingHorizontal: 12 },
  camFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center', paddingBottom: 40 },
  shutter: {
    width: 74, height: 74, borderRadius: 37,
    backgroundColor: '#fff', borderWidth: 5, borderColor: '#cbd5e1',
  },
})
