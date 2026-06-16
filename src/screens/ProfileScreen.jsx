import React, { useState, useCallback } from 'react';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { translateTx } from '../utils/txTranslate';

import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, Alert, Image, RefreshControl, Linking,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { colors, spacing, radius } from '../theme';
import { StatCard, LoadingSpinner } from '../components';
import { formatDate, formatRelativeTime } from '../utils/helpers';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL, SUPPORT_EMAIL } from '../utils/constants';
import { useTranslation } from '../hooks/useTranslation';

const ProfileScreen = () => {
  const { user, refreshUser, signOut } = useAuth();
  const { t } = useTranslation();
  const navigation = useNavigation();
  const [transactions, setTransactions] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  const loadData = async () => {
    try {
      const [txRes, taskRes] = await Promise.all([api.getTransactions(), api.getMyTasks()]);
      setTransactions(txRes.transactions);
      setMyTasks(taskRes);
      setError(null);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { refreshUser().catch(e => setError(e.message)); loadData(); }, []));

  const handleSignOut = () => {
    Alert.alert(t('profile.signOutTitle'), t('profile.signOutMsg'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('profile.signOut'),
        style: 'destructive',
        onPress: async () => {
          try { await GoogleSignin.revokeAccess(); await GoogleSignin.signOut(); } catch (_) { /* ignore */ }
          signOut();
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(t('profile.deleteTitle'), t('profile.deleteMsg'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('profile.deleteConfirm'),
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await api.deleteAccount();
            try { await GoogleSignin.revokeAccess(); await GoogleSignin.signOut(); } catch (_) {}
            signOut(); // unmounts this screen, so no need to reset `deleting`
          } catch (e) {
            setDeleting(false);
            Alert.alert(t('common.error'), e.message || t('profile.deleteError'));
          }
        },
      },
    ]);
  };

  const handleContactSupport = () => {
    const subject = encodeURIComponent('Subs Share Support');
    const body = encodeURIComponent(`\n\n\n---\nFrom: ${user?.name || ''} (ID: ${user?.id ?? 'unknown'})`);
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`)
      .catch(() => Alert.alert(t('common.error'), SUPPORT_EMAIL));
  };

  if (loading) return <LoadingSpinner message={t('common.loading')} />;

  const totalEarned = transactions.filter(tx => tx.type === 'earned' || tx.type === 'bonus').reduce((s, tx) => s + tx.amount, 0);
  const totalSpent = transactions.filter(tx => tx.type === 'spent').reduce((s, tx) => s + tx.amount, 0);
  const completedCampaigns = myTasks.filter(tk => tk.status === 'completed').length;

  return (
    <SafeAreaView style={styles.safe}>
      {error && (
        <View style={styles.errorBanner}><Text style={styles.errorText}>{error}</Text></View>
      )}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); refreshUser().catch(e => setError(e.message)); loadData(); }} tintColor={colors.primary} />}
      >
        <View style={styles.profileCard}>
          {user?.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase()}</Text>
            </View>
          )}
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <Text style={styles.joined}>{t('profile.memberSince', { date: formatDate(user?.created_at) })}</Text>
          <View style={styles.coinDisplay}>
            <Text style={styles.coinEmoji}>🪙</Text>
            <Text style={styles.coinAmount}>{user?.coins ?? 0}</Text>
            <Text style={styles.coinLabel}>{t('common.coins')}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <StatCard emoji="💰" label={t('profile.earned')} value={totalEarned} accent={colors.gold} />
          <StatCard emoji="💸" label={t('profile.spent')} value={totalSpent} accent={colors.danger} />
          <StatCard emoji="🎯" label={t('profile.done')} value={completedCampaigns} accent={colors.success} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.transactionHistory')}</Text>
          {transactions.length === 0 ? (
            <View style={styles.emptyTx}>
              <Text style={styles.emptyTxText}>{t('profile.noTransactions')}</Text>
            </View>
          ) : (
            transactions.map(tx => (
              <View key={tx.id} style={styles.txRow}>
                <View style={[styles.txIcon, { backgroundColor: tx.type === 'earned' ? 'rgba(6,214,160,0.12)' : tx.type === 'bonus' ? 'rgba(255,209,102,0.12)' : 'rgba(239,71,111,0.12)' }]}>
                  <Text style={styles.txIconText}>{tx.type === 'earned' ? '📈' : tx.type === 'bonus' ? '🎁' : '📉'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.txDesc}>{translateTx(tx.description, t)}</Text>
                  <Text style={styles.txDate}>{formatRelativeTime(tx.created_at, t)}</Text>
                </View>
                <Text style={[styles.txAmount, { color: tx.type === 'spent' ? colors.danger : colors.success }]}>
                  {tx.type === 'spent' ? '-' : '+'}{tx.amount}
                </Text>
              </View>
            ))
          )}
        </View>

        <TouchableOpacity style={styles.languageBtn} onPress={() => navigation.navigate('Language')}>
          <Text style={styles.languageBtnText}>🌐 {t('language.title')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.languageBtn} onPress={() => Linking.openURL(PRIVACY_POLICY_URL).catch(() => {})}>
          <Text style={styles.languageBtnText}>🔒 {t('common.privacyPolicy')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.languageBtn} onPress={() => Linking.openURL(TERMS_OF_SERVICE_URL).catch(() => {})}>
          <Text style={styles.languageBtnText}>📄 {t('common.termsOfService')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.languageBtn} onPress={handleContactSupport}>
          <Text style={styles.languageBtnText}>✉️ {t('common.contactSupport')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>{t('profile.signOut')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount} disabled={deleting}>
          <Text style={styles.deleteText}>{deleting ? t('profile.deleting') : t('profile.deleteAccount')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: 80 },
  languageBtn: { backgroundColor: colors.bgCard, paddingVertical: spacing.md, borderRadius: radius.md, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  languageBtnText: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  profileCard: { backgroundColor: colors.bgCard, borderRadius: radius.xl, padding: spacing.xl, alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.border },
  avatar: { width: 80, height: 80, borderRadius: radius.full, marginBottom: spacing.sm },
  avatarFallback: { backgroundColor: colors.primaryDark, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 36, fontWeight: '800', color: colors.textPrimary },
  name: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  email: { fontSize: 14, color: colors.textSecondary },
  joined: { fontSize: 12, color: colors.textMuted },
  coinDisplay: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm, backgroundColor: 'rgba(255,209,102,0.1)', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.full, borderWidth: 1, borderColor: 'rgba(255,209,102,0.3)' },
  coinEmoji: { fontSize: 22 },
  coinAmount: { fontSize: 28, fontWeight: '900', color: colors.gold },
  coinLabel: { fontSize: 14, color: colors.gold, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  section: { gap: spacing.sm },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  txIcon: { width: 40, height: 40, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center' },
  txIconText: { fontSize: 18 },
  txDesc: { fontSize: 14, color: colors.textPrimary, fontWeight: '500' },
  txDate: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  txAmount: { fontSize: 16, fontWeight: '800' },
  emptyTx: { backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.lg, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  emptyTxText: { color: colors.textMuted, fontSize: 14 },
  signOutBtn: { backgroundColor: 'rgba(239,71,111,0.1)', paddingVertical: spacing.md, borderRadius: radius.md, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(239,71,111,0.3)' },
  signOutText: { fontSize: 15, fontWeight: '700', color: colors.danger },
  deleteBtn: { paddingVertical: spacing.sm, alignItems: 'center' },
  deleteText: { fontSize: 13, fontWeight: '600', color: colors.textMuted, textDecorationLine: 'underline' },
  errorBanner: { backgroundColor: '#E53935', padding: spacing.sm, alignItems: 'center' },
  errorText: { color: '#FFFFFF', fontSize: 13 },
});

export default ProfileScreen;
