import React from 'react';
import { Tabs } from 'expo-router';
import BottomNavigation from '@/components/navigation/BottomNavigation';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <BottomNavigation {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: 'Beranda' }} />
      <Tabs.Screen name="(reminders)" options={{ title: 'Pengingat' }} />
      <Tabs.Screen name="(assets)" options={{ title: 'Aset' }} />
      <Tabs.Screen name="pengaturan" options={{ title: 'Pengaturan' }} />
    </Tabs>
  );
}
