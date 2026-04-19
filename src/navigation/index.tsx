import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Text } from 'react-native'
import { useAppStore } from '../state/store'

import ServerUrlScreen from '../screens/ServerUrlScreen'
import LoginScreen from '../screens/LoginScreen'
import DashboardScreen from '../screens/DashboardScreen'
import PunchScreen from '../screens/PunchScreen'
import LeavesScreen from '../screens/LeavesScreen'
import MoreScreen from '../screens/MoreScreen'

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

export default function RootNavigation() {
  const serverUrl = useAppStore((s) => s.serverUrl)
  const isAuthenticated = useAppStore((s) => s.isAuthenticated)

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {!serverUrl ? (
          <RootStack.Screen name="ServerUrl" component={ServerUrlScreen} />
        ) : !isAuthenticated ? (
          <RootStack.Screen name="Login" component={LoginScreen} />
        ) : (
          <RootStack.Screen name="AppTabs" component={AppTabs} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  )
}
