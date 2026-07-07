import React from 'react';
import { Stack } from 'expo-router';
import { COLORS } from '@/lib/theme';

export default function AssetsLayout() {
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
        options={{ title: 'Aset', headerShown: true }}
      />
      <Stack.Screen
        name="tambah"
        options={{ title: 'Tambah Aset', presentation: 'modal' }}
      />
      <Stack.Screen
        name="[id]"
        options={{ title: 'Detail Aset' }}
      />
      <Stack.Screen
        name="[id]/edit"
        options={{ title: 'Edit Aset' }}
      />
    </Stack>
  );
}
