import React from 'react'
import { View, Text, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native'
import { useAppStore } from '../state/store'

type Props = {
  loading?: boolean
  error?: string | null
  empty?: boolean
  emptyMessage?: string
  onRetry?: () => void
  children: React.ReactNode
}

/**
 * Wraps a list/detail screen with three mutually-exclusive states so it
 * never renders as a totally blank view:
 *   loading → spinner
 *   error   → red error card with Retry
 *   empty   → neutral "nothing here yet" message
 *   else    → render children
 */
export default function ScreenState({ loading, error, empty, emptyMessage, onRetry, children }: Props) {
  const theme = useAppStore((s) => s.theme)

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    )
  }
  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errTitle}>Could not load</Text>
        <Text style={styles.errBody}>{error}</Text>
        {onRetry && (
          <TouchableOpacity style={[styles.retry, { borderColor: theme.primary }]} onPress={onRetry}>
            <Text style={[styles.retryText, { color: theme.primary }]}>Retry</Text>
          </TouchableOpacity>
        )}
      </View>
    )
  }
  if (empty) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>{emptyMessage || 'Nothing here yet.'}</Text>
      </View>
    )
  }
  return <>{children}</>
}

const styles = StyleSheet.create({
  center: { flex: 1, padding: 32, justifyContent: 'center', alignItems: 'center' },
  errTitle: { fontSize: 16, fontWeight: '700', color: '#991b1b' },
  errBody: { fontSize: 13, color: '#b91c1c', marginTop: 6, textAlign: 'center' },
  retry: { marginTop: 16, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  retryText: { fontSize: 13, fontWeight: '700' },
  empty: { color: '#94a3b8', fontSize: 14, textAlign: 'center' },
})
