import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, RefreshControl,
} from 'react-native';
import { Alert } from '../components/ThemedAlert';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { spacing, radius } from '../theme';
import { LoadingSpinner, EmptyState } from '../components';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { useTranslation } from '../hooks/useTranslation';
import { getSlotCost } from '../utils/helpers';

const MyCampaignsScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { refreshUser } = useAuth();
  const { t } = useTranslation();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // taskId being acted upon
  const [error, setError] = useState(null);

  const STATUS_META = {
    active:    { label: t('campaigns.statusActive'),    color: colors.success, emoji: '🟢' },
    paused:    { label: t('campaigns.statusPaused'),    color: colors.warning, emoji: '⏸️' },
    completed: { label: t('campaigns.statusCompleted'), color: colors.primary, emoji: '✅' },
    cancelled: { label: t('campaigns.statusCancelled'), color: colors.textMuted, emoji: '❌' },
  };

  const loadTasks = async () => {
    try { setTasks(await api.getMyTasks()); setError(null); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { loadTasks(); }, []));

  const handleAction = async (taskId, action, ...args) => {
    setActionLoading(taskId);
    try {
      await action(...args);
      await loadTasks();
    } catch (e) {
      Alert.alert(t('common.error'), e.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePause = (task) => {
    Alert.alert(
      t('campaigns.pauseTitle'),
      t('campaigns.pauseMsg', { name: task.channel_name, slots: task.remaining_slots }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('campaigns.pause'), onPress: () => handleAction(task.id, api.pauseCampaign, task.id) },
      ]
    );
  };

  const handleResume = (task) => {
    Alert.alert(
      t('campaigns.resumeTitle'),
      t('campaigns.resumeMsg', { name: task.channel_name, slots: task.remaining_slots }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('campaigns.resume'), onPress: () => handleAction(task.id, api.resumeCampaign, task.id) },
      ]
    );
  };

  const handleCancel = (task) => {
    const filled = parseInt(task.completions_count || 0);
    const msg = t('campaigns.cancelMsg', { name: task.channel_name })
      + (filled > 0 ? t('campaigns.cancelCompleted', { count: filled }) : '');
    Alert.alert(
      t('campaigns.cancelTitle'),
      msg,
      [
        { text: t('campaigns.keepCampaign'), style: 'cancel' },
        {
          text: t('campaigns.cancelConfirm'),
          style: 'destructive',
          onPress: () => handleAction(task.id, async () => {
            const result = await api.cancelCampaign(task.id);
            await refreshUser();
            Alert.alert(
              t('campaigns.cancelled'),
              result.refunded_coins > 0
                ? t('campaigns.refunded', { coins: result.refunded_coins, balance: result.new_balance })
                : t('campaigns.cancelledBody')
            );
          }),
        },
      ]
    );
  };

  const renderTask = ({ item }) => {
    const meta = STATUS_META[item.status] || STATUS_META.active;
    const filled = (item.total_slots || item.remaining_slots) - item.remaining_slots;
    const total  = item.total_slots || item.remaining_slots;
    const pct    = total > 0 ? Math.round((filled / total) * 100) : 0;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.channelName} numberOfLines={1}>{item.channel_name}</Text>
            <Text style={styles.taskType}>{item.task_type?.replace('_', ' + ')}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: meta.color + '22', borderColor: meta.color + '55' }]}>
            <Text style={[styles.statusText, { color: meta.color }]}>{meta.emoji} {meta.label}</Text>
          </View>
        </View>

        <View style={styles.progressSection}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={styles.progressLabel}>{t('campaigns.slotsFilled', { filled, total })}</Text>
            <Text style={styles.progressPct}>{pct}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: meta.color }]} />
          </View>
        </View>

        <View style={styles.statsRow}>
          {[
            { label: t('campaigns.completed'), value: item.completions_count || 0 },
            { label: t('campaigns.remaining'), value: item.remaining_slots },
            { label: t('campaigns.perSlot'), value: `${item.reward}🪙` },
          ].map((s, i) => (
            <View key={i} style={styles.stat}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.controls}>
          {item.can_pause   && <TouchableOpacity style={[styles.ctrl, styles.ctrlPause]}   onPress={() => handlePause(item)}   disabled={actionLoading === item.id}><Text style={[styles.ctrlText, { color: colors.warning }]}>{actionLoading === item.id ? '...' : t('campaigns.pause')}</Text></TouchableOpacity>}
          {item.can_resume  && <TouchableOpacity style={[styles.ctrl, styles.ctrlResume]}  onPress={() => handleResume(item)}  disabled={actionLoading === item.id}><Text style={[styles.ctrlText, { color: colors.success }]}>{actionLoading === item.id ? '...' : t('campaigns.resume')}</Text></TouchableOpacity>}
          {item.can_cancel  && (
            <TouchableOpacity style={[styles.ctrl, styles.ctrlCancel]} onPress={() => handleCancel(item)} disabled={actionLoading === item.id}>
              <Text style={[styles.ctrlText, { color: colors.danger }]}>{actionLoading === item.id ? '...' : `${t('campaigns.cancel')}${item.remaining_slots > 0 ? ` (+${item.remaining_slots * getSlotCost(item.task_type, parseInt(item.watch_minutes, 10) || 1)}🪙)` : ''}`}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loading) return <LoadingSpinner message={t('common.loading')} />;

  const ordered = [
    ...tasks.filter(tk => tk.status === 'active'),
    ...tasks.filter(tk => tk.status === 'paused'),
    ...tasks.filter(tk => ['completed','cancelled'].includes(tk.status)),
  ];

  return (
    <SafeAreaView style={styles.safe}>
      {error && (
        <View style={styles.errorBanner}><Text style={styles.errorText}>{error}</Text></View>
      )}
      <View style={styles.header}>
        <Text style={styles.title}>{t('campaigns.title')}</Text>
        <Text style={styles.subtitle}>
          {tasks.filter(tk=>tk.status==='active').length} {t('campaigns.active')} · {tasks.filter(tk=>tk.status==='paused').length} {t('campaigns.paused')}
        </Text>
      </View>
      <FlatList
        data={ordered}
        keyExtractor={item => item.id.toString()}
        renderItem={renderTask}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadTasks(); }} tintColor={colors.primary} />}
        ListEmptyComponent={<EmptyState emoji="📋" title={t('campaigns.noCampaigns')} subtitle={t('campaigns.noCampaignsSubtitle')} />}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 26, fontWeight: '800', color: colors.textPrimary },
  subtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  list: { paddingHorizontal: 16, paddingBottom: 80 },
  card: { backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border, gap: spacing.md },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  channelName: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  taskType: { fontSize: 12, color: colors.textMuted, marginTop: 2, textTransform: 'capitalize' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 99, borderWidth: 1 },
  statusText: { fontSize: 11, fontWeight: '700' },
  progressSection: { gap: 6 },
  progressLabel: { fontSize: 12, color: colors.textSecondary },
  progressPct: { fontSize: 12, fontWeight: '700', color: colors.textPrimary },
  progressTrack: { height: 6, backgroundColor: colors.bgElevated, borderRadius: 99, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 99 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center', gap: 2 },
  statValue: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  statLabel: { fontSize: 10, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  controls: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  ctrl: { flex: 1, paddingVertical: 10, borderRadius: radius.md, alignItems: 'center', borderWidth: 1, minWidth: 90, backgroundColor: colors.bgElevated },
  ctrlPause:  { borderColor: colors.warning },
  ctrlResume: { borderColor: colors.success },
  ctrlCancel: { borderColor: colors.danger },
  ctrlText: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  errorBanner: { backgroundColor: '#E53935', padding: 12, alignItems: 'center' },
  errorText: { color: '#FFFFFF', fontSize: 13 },
});

export default MyCampaignsScreen;
