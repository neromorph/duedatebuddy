import React from 'react';
import { Stack } from 'expo-router';
import { COLORS } from '@/lib/theme';

export default function RemindersLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.surface },
        headerTintColor: COLORS.onSurface,
        headerTitleStyle: { fontWeight: '600' },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{ title: 'Pengingat', headerShown: true }}
      />
      <Stack.Screen
        name="tambah"
        options={{
          title: 'Tambah Pengingat',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{ title: 'Detail Pengingat' }}
      />
      <Stack.Screen
        name="[id]/edit"
        options={{ title: 'Edit Pengingat' }}
      />
    </Stack>
  );
}
