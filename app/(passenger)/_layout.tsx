import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { brand, neutral } from '../../src/theme/tokens';
import { fontFamily } from '../../src/theme/typography';

export default function PassengerLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: brand.navy,
        tabBarInactiveTintColor: neutral.inkSoft,
        tabBarStyle: { backgroundColor: neutral.surface, borderTopColor: neutral.line },
        tabBarLabelStyle: { fontFamily: fontFamily.medium, fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Ride',
          tabBarIcon: ({ color, size }) => <Ionicons name="navigate" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarIcon: ({ color, size }) => <Ionicons name="receipt-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="safety"
        options={{
          title: 'Safety',
          tabBarIcon: ({ color, size }) => <Ionicons name="shield-checkmark-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />
      {/* Detail routes live in the group but not in the tab bar. */}
      <Tabs.Screen name="quote" options={{ href: null }} />
      <Tabs.Screen name="trip/[id]" options={{ href: null }} />
      <Tabs.Screen name="trip/[id]/receipt" options={{ href: null }} />
    </Tabs>
  );
}
