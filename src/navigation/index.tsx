import React, { useEffect, useState } from 'react'
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Text } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAppStore } from '../state/store'
import { installTapHandler } from '../services/push'

import ServerUrlScreen from '../screens/ServerUrlScreen'
import LoginScreen from '../screens/LoginScreen'
import DashboardScreen from '../screens/DashboardScreen'
import PunchScreen from '../screens/PunchScreen'
import LeavesScreen from '../screens/LeavesScreen'
import MoreScreen from '../screens/MoreScreen'
import PayslipsScreen from '../screens/PayslipsScreen'
import LoansScreen from '../screens/LoansScreen'
import ExpensesScreen from '../screens/ExpensesScreen'
import AnnouncementsScreen from '../screens/AnnouncementsScreen'
import ProfileScreen from '../screens/ProfileScreen'
import ApplyLeaveScreen from '../screens/ApplyLeaveScreen'
import ConsentScreen, { CONSENT_KEY } from '../screens/ConsentScreen'

const RootStack = createNativeStackNavigator()
const Tabs = createBottomTabNavigator()

function AppTabs() {
  const theme = useAppStore((s) => s.theme)
  const canPunch = !!useAppStore((s) => s.user?.allow_mobile_punch)
  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: '#94a3b8',
      }}
    >
      <Tabs.Screen name="Home" component={DashboardScreen} options={{ tabBarIcon: () => <Text>🏠</Text> }} />
      {canPunch && (
        <Tabs.Screen name="Punch" component={PunchScreen} options={{ tabBarIcon: () => <Text>⏱️</Text> }} />
      )}
      <Tabs.Screen name="Leaves" component={LeavesScreen} options={{ tabBarIcon: () => <Text>📅</Text> }} />
      <Tabs.Screen name="More" component={MoreScreen} options={{ tabBarIcon: () => <Text>⋯</Text> }} />
    </Tabs.Navigator>
  )
}

const navRef: { current: NavigationContainerRef<any> | null } = { current: null }

export default function RootNavigation() {
  const serverUrl = useAppStore((s) => s.serverUrl)
  const isAuthenticated = useAppStore((s) => s.isAuthenticated)
  const [consentGiven, setConsentGiven] = useState<boolean | null>(null)

  useEffect(() => {
    AsyncStorage.getItem(CONSENT_KEY).then((v) => setConsentGiven(!!v))
  }, [])

  useEffect(() => {
    // Route pushes to their screen by data.type.
    const cleanup = installTapHandler((data) => {
      if (!navRef.current) return
      switch (data.type) {
        case 'announcement':
          navRef.current.navigate('Announcements')
          break
        case 'alert':
          if (data.category === 'LEAVE' || String(data.category || '').toLowerCase().includes('leave')) {
            navRef.current.navigate('Leaves')
          } else {
            navRef.current.navigate('AppTabs', { screen: 'Home' })
          }
          break
        default:
          navRef.current.navigate('AppTabs', { screen: 'Home' })
      }
    })
    return cleanup
  }, [])

  if (consentGiven === null) return null
  if (!consentGiven) return <ConsentScreen onAccept={() => setConsentGiven(true)} />

  return (
    <NavigationContainer ref={(r) => { navRef.current = r }}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {!serverUrl ? (
          <RootStack.Screen name="ServerUrl" component={ServerUrlScreen} />
        ) : !isAuthenticated ? (
          <RootStack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <RootStack.Screen name="AppTabs" component={AppTabs} />
            <RootStack.Screen name="Payslips" component={PayslipsScreen} options={{ headerShown: true, title: 'Payslips' }} />
            <RootStack.Screen name="Loans" component={LoansScreen} options={{ headerShown: true, title: 'Loans' }} />
            <RootStack.Screen name="Expenses" component={ExpensesScreen} options={{ headerShown: true, title: 'Expense Claims' }} />
            <RootStack.Screen name="Announcements" component={AnnouncementsScreen} options={{ headerShown: true, title: 'Announcements' }} />
            <RootStack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: true, title: 'My Profile' }} />
            <RootStack.Screen name="ApplyLeave" component={ApplyLeaveScreen} options={{ headerShown: true, title: 'Apply Leave' }} />
          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  )
}
