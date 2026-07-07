import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY } from '@/lib/theme';
import Button from './Button';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <Ionicons name="alert-circle-outline" size={64} color={COLORS.statusCritical} />
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <Button
          title="Coba Lagi"
          onPress={onRetry}
          variant="secondary"
          style={styles.retry}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  message: {
    ...TYPOGRAPHY.body,
    color: COLORS.statusCritical,
    marginTop: SPACING.lg,
    textAlign: 'center',
  },
  retry: {
    marginTop: SPACING.lg,
  },
});
