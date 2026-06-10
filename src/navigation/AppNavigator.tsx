import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '@clerk/expo';
import { ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import AuthScreen from '../screens/AuthScreen';
import HomeScreen from '../screens/HomeScreen';
import WeekScreen from '../screens/WeekScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ConnectTelegramScreen from '../screens/ConnectTelegramScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_BAR_STYLE = {
  backgroundColor: 'white',
  borderTopColor: '#b2ebf2',
};

const HEADER_STYLE = {
  headerStyle: { backgroundColor: '#00bcd4' },
  headerTintColor: 'white',
  headerShadowVisible: false,
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: TAB_BAR_STYLE,
        tabBarActiveTintColor: '#00838f',
        tabBarInactiveTintColor: '#90a4ae',
        ...HEADER_STYLE,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'בית',
          tabBarIcon: ({ color, size }) => <Ionicons name="water" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Week"
        component={WeekScreen}
        options={{
          title: 'שבוע',
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar" color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'הגדרות',
          tabBarIcon: ({ color, size }) => <Ionicons name="settings" color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#e0f7fa' }}>
        <ActivityIndicator size="large" color="#00d4ff" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isSignedIn ? (
        <Stack.Navigator screenOptions={HEADER_STYLE}>
          <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen name="ConnectTelegram" component={ConnectTelegramScreen} options={{ title: 'חיבור טלגרם' }} />
        </Stack.Navigator>
      ) : (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Auth" component={AuthScreen} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}
