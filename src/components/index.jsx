import React, { Component } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, radius } from '../theme';

// ── Coin Badge ──────────────────────────────────────────────
export const CoinBadge = ({ amount, size = 'md' }) => {
  const isLg = size === 'lg';
  return (
    <View style={[styles.coinBadge, isLg && styles.coinBadgeLg]}>
      <Text style={isLg ? styles.coinEmojLg : styles.coinEmoji}>🪙</Text>
      <Text style={[styles.coinText, isLg && styles.coinTextLg]}>{amount}</Text>
    </View>
  );
};

// ── Loading Spinner ──────────────────────────────────────────
export const LoadingSpinner = ({ message }) => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color={colors.primary} />
    {message && <Text style={styles.loadingText}>{message}</Text>}
  </View>
);

// ── Empty State ──────────────────────────────────────────────
export const EmptyState = ({ emoji = '📭', title, subtitle }) => (
  <View style={styles.emptyContainer}>
    <Text style={styles.emptyEmoji}>{emoji}</Text>
    <Text style={styles.emptyTitle}>{title}</Text>
    {subtitle && <Text style={styles.emptySubtitle}>{subtitle}</Text>}
  </View>
);

// ── Stat Card ────────────────────────────────────────────────
export const StatCard = ({ label, value, emoji, accent }) => (
  <View style={[styles.statCard, accent && { borderColor: accent, borderWidth: 1 }]}>
    <Text style={styles.statEmoji}>{emoji}</Text>
    <Text style={[styles.statValue, accent && { color: accent }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

// ── Error Boundary ───────────────────────────────────────────
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary', error, errorInfo);
  }
  render() {
    if (this.state.error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorEmoji}>💥</Text>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>{this.state.error.message}</Text>
          <TouchableOpacity style={styles.errorBtn} onPress={() => this.setState({ error: null })}>
            <Text style={styles.errorBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  // CoinBadge
  coinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 209, 102, 0.12)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 209, 102, 0.3)',
  },
  coinBadgeLg: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 8,
  },
  coinEmoji: { fontSize: 14 },
  coinEmojLg: { fontSize: 22 },
  coinText: { fontSize: 14, fontWeight: '700', color: colors.gold },
  coinTextLg: { fontSize: 28, fontWeight: '800' },

  // LoadingSpinner
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.bg,
  },
  loadingText: { color: colors.textSecondary, fontSize: 14 },

  // EmptyState
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', maxWidth: 260 },

  // StatCard
  statCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    gap: 4,
    flex: 1,
    borderColor: colors.border,
    borderWidth: 1,
  },
  statEmoji: { fontSize: 24 },
  statValue: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  statLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },

  // ErrorBoundary
  errorContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: colors.bg, padding: spacing.lg, gap: spacing.md,
  },
  errorEmoji: { fontSize: 48 },
  errorTitle: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, textAlign: 'center' },
  errorMessage: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', maxWidth: 300 },
  errorBtn: {
    backgroundColor: colors.primary, paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm, borderRadius: radius.md, marginTop: spacing.sm,
  },
  errorBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
