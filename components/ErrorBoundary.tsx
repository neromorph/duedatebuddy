// components/ErrorBoundary.tsx
// ponytail: class component (React error boundary API requires it), no hook wrapping

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { logger } from '@/lib/logger';
import { COLORS, SPACING, TYPOGRAPHY, RADII } from '@/lib/theme';

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('ErrorBoundary', 'Unhandled rendering error', {
      componentStack: errorInfo.componentStack,
    }, error);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={styles.container}>
        <Ionicons name="alert-circle-outline" size={64} color={COLORS.statusCritical} />
        <Text style={styles.title}>Terjadi Kesalahan</Text>
        <Text style={styles.message}>
          Maaf, terjadi kesalahan yang tidak terduga. Silakan coba lagi.
        </Text>
        <TouchableOpacity style={styles.button} onPress={this.handleReset} activeOpacity={0.7}>
          <Text style={styles.buttonText}>Coba Lagi</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.xl,
  },
  title: {
    ...TYPOGRAPHY.headline,
    color: COLORS.onSurface,
    marginTop: SPACING.lg,
  },
  message: {
    ...TYPOGRAPHY.body,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    marginTop: SPACING.md,
    lineHeight: 24,
  },
  button: {
    marginTop: SPACING.xl,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADII.md,
  },
  buttonText: {
    ...TYPOGRAPHY.body,
    color: COLORS.onPrimary,
    fontWeight: '600',
  },
});
