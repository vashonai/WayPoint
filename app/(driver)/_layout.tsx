import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { brand, neutral } from '../../src/theme/tokens';
import { fontFamily } from '../../src/theme/typography';

export default function DriverLayout() {
  return (
    // Tab icon colours are the tint tokens below — always strings — but React
    // Navigation types them as any ColorValue, which Ionicons does not accept.
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
          title: 'Drive',
          tabBarIcon: ({ color, size }) => <Ionicons name="car-sport" size={size} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="earnings"
        options={{
          title: 'Earnings',
          tabBarIcon: ({ color, size }) => <Ionicons name="wallet-outline" size={size} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="documents"
        options={{
          title: 'Documents',
          tabBarIcon: ({ color, size }) => <Ionicons name="document-text-outline" size={size} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color as string} />,
        }}
      />
      <Tabs.Screen name="trip/[id]" options={{ href: null }} />
    </Tabs>
  );
}
