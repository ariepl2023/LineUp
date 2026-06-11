import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#00bcd4' },
        headerTintColor: 'white',
        headerShadowVisible: false,
        tabBarStyle: { backgroundColor: 'white', borderTopColor: '#b2ebf2' },
        tabBarActiveTintColor: '#00838f',
        tabBarInactiveTintColor: '#90a4ae',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'בית',
          tabBarIcon: ({ color, size }) => <Ionicons name="water" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="week"
        options={{
          title: 'שבוע',
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'הגדרות',
          tabBarIcon: ({ color, size }) => <Ionicons name="settings" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
