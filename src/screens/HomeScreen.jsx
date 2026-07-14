import React, { useState, useCallback, useEffect } from 'react';
import { translateTx } from '../utils/txTranslate';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, RefreshControl, Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { spacing, radius } from '../theme';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { CoinBadge, StatCard, LoadingSpinner } from '../components';
import ThemeToggle from '../components/ThemeToggle';
import { formatRelativeTime } from '../utils/helpers';
import { useTranslation } from '../hooks/useTranslation';

const HomeScreen = ({ navigation }) => {
  const { user, refreshUser } = useAuth();
  const { t } = useTranslation();
  const { colors, mode, toggleTheme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [channels, setChannels] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

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
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { if (error) { const tmr = setTimeout(() => setError(null), 5000); return () => clearTimeout(tmr); } }, [error]);

  useFocusEffect(useCallback(() => { refreshUser().catch(e => setError(e.message)); loadData(); }, []));
  const onRefresh = () => { setRefreshing(true); refreshUser().catch(e => setError(e.message)); loadData(); };

  if (loading) return <LoadingSpinner message={t('common.loading')} />;

  const activeCampaigns = myTasks.length;
  const pendingSubs = myTasks.reduce((sum, tk) => sum + (parseInt(tk.remaining_slots, 10) || 0), 0);

  return (
    <SafeAreaView style={styles.safe}>
      {error && (
        <View style={styles.errorBanner}><Text style={styles.errorText}>{error}</Text></View>
      )}
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
          <View style={styles.headerRight}>
            <ThemeToggle />
            {user?.avatar && <Image source={{ uri: user.avatar }} style={styles.avatar} />}
          </View>
        </View>

        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>{t('home.balance')}</Text>
          <View style={styles.heroBalanceRow}>
            <Text style={styles.heroCoin}>🪙</Text>
            <Text style={styles.heroBalance}>{(user?.coins ?? 0).toLocaleString()}</Text>
          </View>
          <View style={styles.heroActionRow}>
            <TouchableOpacity style={styles.heroBuyBtn} activeOpacity={0.85} onPress={() => navigation.navigate('BuyCoins')}>
              <Text style={styles.heroBuyText}>{t('buy.getCoins')}</Text>
            </TouchableOpacity>
            <Text style={styles.heroHint}>{t('home.subsEstimate', { n: Math.floor((user?.coins ?? 0) / 15) })}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <TouchableOpacity style={styles.statTile} activeOpacity={0.8} onPress={() => navigation.navigate('MyCampaigns')}>
            <Text style={styles.statValue}>{activeCampaigns}</Text>
            <Text style={styles.statLabel}>{t('home.campaigns')}</Text>
          </TouchableOpacity>
          <View style={styles.statTile}>
            <Text style={styles.statValue}>{pendingSubs}</Text>
            <Text style={styles.statLabel}>{t('home.pendingSubs')}</Text>
          </View>
          <View style={styles.statTile}>
            <Text style={styles.statValue}>{user?.tasks_completed ?? 0}</Text>
            <Text style={styles.statLabel}>{t('home.completed')}</Text>
          </View>
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
              <TouchableOpacity key={ch.id} style={styles.channelCard} activeOpacity={0.8} onPress={() => navigation.navigate('MyCampaigns')}>
                <View style={styles.channelIcon}><Text style={{ fontSize: 20 }}>📺</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.channelName}>{ch.channel_name}</Text>
                  <Text style={styles.channelMeta}>
                    {ch.active_campaigns} {ch.active_campaigns !== 1 ? t('home.activeCampaigns') : t('home.activeCampaign')} · {ch.pending_subscribers} {t('home.subsPending')}
                  </Text>
                </View>
                <Text style={styles.channelChevron}>›</Text>
              </TouchableOpacity>
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

                  <Text style={styles.txDate}>{formatRelativeTime(tx.created_at, t)}</Text>
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

const makeStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  themeToggle: { width: 40, height: 40, borderRadius: radius.full, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  themeToggleIcon: { fontSize: 18 },
  greeting: { fontSize: 13, color: colors.textMuted, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 1 },
  userName: { fontSize: 28, fontWeight: '800', color: colors.textPrimary, marginTop: 2 },
  avatar: { width: 48, height: 48, borderRadius: radius.full, borderWidth: 2, borderColor: colors.primary },
  errorBanner: { backgroundColor: '#E53935', padding: spacing.sm, alignItems: 'center' },
  errorText: { color: '#FFFFFF', fontSize: 13 },
  coinCard: { backgroundColor: colors.bgCard, borderRadius: radius.xl, padding: spacing.lg, alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: 'rgba(255,209,102,0.2)' },
  coinLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 1.5, textTransform: 'uppercase' },
  coinHint: { fontSize: 12, color: colors.textMuted },
  buyPill: { marginTop: spacing.xs, backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: 6, borderRadius: radius.full },
  buyPillText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  heroCard: { backgroundColor: colors.bgCard, borderRadius: radius.xl, padding: spacing.lg, gap: spacing.md, borderWidth: 1, borderColor: colors.border },
  heroLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, letterSpacing: 0.6, textTransform: 'uppercase' },
  heroBalanceRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroCoin: { fontSize: 30 },
  heroBalance: { fontSize: 38, fontWeight: '800', color: colors.gold, letterSpacing: -0.5 },
  heroActionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  heroBuyBtn: { flex: 1, height: 46, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  heroBuyText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  heroHint: { fontSize: 12, color: colors.textMuted },
  statTile: { flex: 1, backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.md, gap: 4, borderWidth: 1, borderColor: colors.border },
  statValue: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  statLabel: { fontSize: 11, color: colors.textSecondary },
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
  channelChevron: { fontSize: 26, color: colors.textMuted, marginLeft: spacing.sm },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  txEmoji: { fontSize: 20 },
  txDesc: { fontSize: 14, color: colors.textPrimary, fontWeight: '500' },
  txDate: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  txAmount: { fontSize: 15, fontWeight: '800' },
});

export default HomeScreen;
