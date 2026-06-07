import React, { useState, useCallback } from 'react';
import { translateTx } from '../utils/txTranslate';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, RefreshControl, Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { colors, spacing, radius } from '../theme';
import { CoinBadge, StatCard, LoadingSpinner } from '../components';
import { formatRelativeTime } from '../utils/helpers';
import { useTranslation } from '../hooks/useTranslation';

const HomeScreen = ({ navigation }) => {
  const { user, refreshUser } = useAuth();
  const { t } = useTranslation();
  const [channels, setChannels] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [chRes, txRes, taskRes] = await Promise.all([
        api.getMyChannels(),
        api.getTransactions(),
        api.getMyTasks(),
      ]);
      setChannels(chRes);
      setTransactions(txRes.transactions.slice(0, 5));
      setMyTasks(taskRes.filter(t => t.status === 'active'));
    } catch (err) {
      console.error('Home load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { refreshUser().catch(() => {}); loadData(); }, []));
  const onRefresh = () => { setRefreshing(true); refreshUser().catch(() => {}); loadData(); };

  if (loading) return <LoadingSpinner message={t('common.loading')} />;

  const activeCampaigns = myTasks.length;
  const pendingSubs = myTasks.reduce((sum, tk) => sum + (parseInt(tk.remaining_slots, 10) || 0), 0);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{t('home.greeting')}</Text>
            <Text style={styles.userName}>{user?.name?.split(' ')[0]}</Text>
          </View>
          {user?.avatar && <Image source={{ uri: user.avatar }} style={styles.avatar} />}
        </View>

        <View style={styles.coinCard}>
          <Text style={styles.coinLabel}>{t('home.balance')}</Text>
          <CoinBadge amount={user?.coins ?? 0} size="lg" />
          <Text style={styles.coinHint}>{t('home.coinHint')}</Text>
        </View>

        <View style={styles.statsRow}>
          <StatCard emoji="📣" label={t('home.campaigns')} value={activeCampaigns} accent={colors.primary} />
          <StatCard emoji="⏳" label={t('home.pendingSubs')} value={pendingSubs} accent={colors.gold} />
          <StatCard emoji="✅" label={t('home.completed')} value={user?.tasks_completed ?? 0} accent={colors.success} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('home.quickActions')}</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: 'rgba(108,99,255,0.12)', borderColor: colors.primary }]}
              onPress={() => navigation.navigate('Earn')}
            >
              <Text style={styles.actionEmoji}>🪙</Text>
              <Text style={[styles.actionText, { color: colors.primary }]}>{t('home.earnCoins')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: 'rgba(255,209,102,0.12)', borderColor: colors.gold }]}
              onPress={() => navigation.navigate('GetSubs')}
            >
              <Text style={styles.actionEmoji}>🚀</Text>
              <Text style={[styles.actionText, { color: colors.gold }]}>{t('home.getSubs')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {channels.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('home.myChannel')}</Text>
            {channels.map(ch => (
              <View key={ch.id} style={styles.channelCard}>
                <View style={styles.channelIcon}><Text style={{ fontSize: 20 }}>📺</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.channelName}>{ch.channel_name}</Text>
                  <Text style={styles.channelMeta}>
                    {ch.active_campaigns} {ch.active_campaigns !== 1 ? t('home.activeCampaigns') : t('home.activeCampaign')} · {ch.pending_subscribers} {t('home.subsPending')}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {transactions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('home.recentActivity')}</Text>
            {transactions.map(tx => (
              <View key={tx.id} style={styles.txRow}>
                <Text style={styles.txEmoji}>
                  {tx.type === 'earned' ? '🪙' : tx.type === 'bonus' ? '🎁' : '💸'}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.txDesc}>{translateTx(tx.description, t)}</Text>

                  <Text style={styles.txDate}>{formatRelativeTime(tx.created_at)}</Text>
                </View>
                <Text style={[styles.txAmount, { color: tx.type === 'spent' ? colors.danger : colors.success }]}>
                  {tx.type === 'spent' ? '-' : '+'}{tx.amount}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { fontSize: 13, color: colors.textMuted, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 1 },
  userName: { fontSize: 28, fontWeight: '800', color: colors.textPrimary, marginTop: 2 },
  avatar: { width: 48, height: 48, borderRadius: radius.full, borderWidth: 2, borderColor: colors.primary },
  coinCard: { backgroundColor: colors.bgCard, borderRadius: radius.xl, padding: spacing.lg, alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: 'rgba(255,209,102,0.2)' },
  coinLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 1.5, textTransform: 'uppercase' },
  coinHint: { fontSize: 12, color: colors.textMuted },
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  section: { gap: spacing.sm },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  actionsRow: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.md, borderRadius: radius.lg, gap: spacing.xs, borderWidth: 1 },
  actionEmoji: { fontSize: 28 },
  actionText: { fontSize: 14, fontWeight: '700' },
  channelCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  channelIcon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: 'rgba(255,0,0,0.1)', justifyContent: 'center', alignItems: 'center' },
  channelName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  channelMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  txEmoji: { fontSize: 20 },
  txDesc: { fontSize: 14, color: colors.textPrimary, fontWeight: '500' },
  txDate: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  txAmount: { fontSize: 15, fontWeight: '800' },
});

export default HomeScreen;
