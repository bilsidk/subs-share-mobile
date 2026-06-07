import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, SectionList, TouchableOpacity,
  SafeAreaView, Alert, Linking, Modal, Animated, AppState,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius } from '../theme';
import TaskCard from '../components/TaskCard';
import { LoadingSpinner, EmptyState } from '../components';
import { TASK_COMPLETION_DELAY } from '../utils/constants';
import { getWarnings, getTaskDescriptions } from '../utils/warnings';
import { getDeviceId } from '../utils/device';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import { useTranslation } from '../hooks/useTranslation';

function toSections(tasks, t) {
  const TIER_META = {
    1: { label: t('earn.tierFeatured'), color: '#FFD166' },
    2: { label: t('earn.tierPremium'),  color: '#6C63FF' },
    3: { label: t('earn.tierCommunity'), color: '#9999BB' },
  };
  const buckets = { 1: [], 2: [], 3: [] };
  for (const task of tasks) buckets[task.tier || 3].push(task);
  return [1, 2, 3]
    .filter(tier => buckets[tier].length)
    .map(tier => ({ tier, title: TIER_META[tier].label, color: TIER_META[tier].color, data: buckets[tier] }));
}

const EarnScreen = () => {
  const { refreshUser } = useAuth();
  const { t } = useTranslation();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTask, setActiveTask] = useState(null);
  const [startedAt, setStartedAt] = useState(null);
  const [countdown, setCountdown] = useState(TASK_COMPLETION_DELAY);
  const [canClaim, setCanClaim] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const timerRef = useRef(null);
  const startedAtRef = useRef(null);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const animRef = useRef(null);

  // Build translated warnings and task descriptions
  const WARNINGS = getWarnings(t);
  const TASK_DESCRIPTIONS = getTaskDescriptions(t);

  const loadTasks = async () => {
    try { setTasks(await api.getAvailableTasks()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useFocusEffect(useCallback(() => { loadTasks(); }, []));

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && startedAtRef.current) {
        const elapsed = (Date.now() - startedAtRef.current) / 1000;
        const remaining = Math.max(0, TASK_COMPLETION_DELAY - elapsed);
        setCountdown(Math.ceil(remaining));
        if (remaining <= 0) { setCanClaim(true); clearInterval(timerRef.current); }
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => () => clearInterval(timerRef.current), []);

  const getWarning = (task) => {
    const map = {
      subscribe: WARNINGS.beforeSubscribe,
      like: WARNINGS.beforeLike,
      like_comment: WARNINGS.beforeLikeComment,
      subscribe_like: WARNINGS.beforeSubscribeLike,
      watch: WARNINGS.beforeWatch,
    };
    return map[task.task_type] || WARNINGS.beforeSubscribe;
  };

  const showWarningThenOpen = (task) => {
    const w = getWarning(task);
    Alert.alert(w.title, w.message, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: w.confirmText, onPress: () => openAndStartTimer(task) },
    ]);
  };

  const openAndStartTimer = async (task) => {
    const rawUrl = (task.task_type !== 'subscribe' && task.target_video_url)
      ? task.target_video_url
      : (task.channel_url || 'https://www.youtube.com');
    const now = Date.now();
    startedAtRef.current = now;
    setStartedAt(now);
    setActiveTask(task);
    setCountdown(TASK_COMPLETION_DELAY);
    setCanClaim(false);
    progressAnim.setValue(0);
    if (animRef.current) animRef.current.stop();
    animRef.current = Animated.timing(progressAnim, { toValue: 1, duration: TASK_COMPLETION_DELAY * 1000, useNativeDriver: false });
    animRef.current.start();
    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - now) / 1000;
      const remaining = Math.max(0, TASK_COMPLETION_DELAY - elapsed);
      setCountdown(Math.ceil(remaining));
      if (remaining <= 0) { clearInterval(timerRef.current); setCanClaim(true); }
    }, 1000);
    try {
      if (await InAppBrowser.isAvailable()) {
        await InAppBrowser.open(rawUrl, { toolbarColor: '#0A0A0F', navigationBarColor: '#0A0A0F', showTitle: true, enableUrlBarHiding: true, enableDefaultShare: false });
      } else { await Linking.openURL(rawUrl); }
    } catch (e) { try { await Linking.openURL('https://www.youtube.com'); } catch (_) {} }
  };

  const handleClaim = async () => {
    if (!canClaim || !activeTask || claiming) return;
    setClaiming(true);
    try {
      const deviceId = await getDeviceId();
      const result = await api.verifyTask(activeTask.id, startedAt, deviceId);
      await refreshUser();
      setActiveTask(null);
      startedAtRef.current = null;
      setTasks(prev => prev.map(tk => tk.id === activeTask.id ? { ...tk, already_completed: true, remaining_slots: tk.remaining_slots - 1 } : tk));
      const bonusMsg = result.comment_verified
        ? `\n💬 ${t('earn.commentBonusEarned')}: +${result.bonus_coins} ${t('common.coins')}!`
        : (activeTask.task_type === 'like_comment' ? `\n${t('earn.noCommentDetected')}` : '');
      Alert.alert(t('earn.coinsEarned'), `${result.message}${bonusMsg}\n\n${t('earn.balance')}: ${result.new_balance} 🪙`);
    } catch (err) {
      const d = err.data || {};
      if (d.verified === false) { Alert.alert(t('earn.notDetectedYet'), d.error); setClaiming(false); return; }
      if (d.code === 'NO_YOUTUBE_ACCESS' || d.code === 'YOUTUBE_REAUTH') { Alert.alert(t('earn.reconnectNeeded'), t('earn.reconnectMessage')); setActiveTask(null); startedAtRef.current = null; setClaiming(false); return; }
      if (d.code === 'VERIFY_RETRY') { Alert.alert(t('common.retry'), t('earn.tryAgainMessage')); setClaiming(false); return; }
      if (d.code === 'BANNED') { Alert.alert(t('earn.accountSuspended'), d.error); setActiveTask(null); startedAtRef.current = null; setClaiming(false); return; }
      if (d.code === 'CAMPAIGN_FULL') { Alert.alert(t('earn.slotTaken'), t('earn.slotTakenMessage')); setActiveTask(null); startedAtRef.current = null; loadTasks(); setClaiming(false); return; }
      if (d.code === 'CAMPAIGN_PAUSED') { Alert.alert(t('earn.campaignPaused'), t('earn.campaignPausedMessage')); setActiveTask(null); startedAtRef.current = null; loadTasks(); setClaiming(false); return; }
      if (d.code === 'CAMPAIGN_CANCELLED') { Alert.alert(t('earn.campaignCancelled'), t('earn.campaignCancelledMessage')); setActiveTask(null); startedAtRef.current = null; loadTasks(); setClaiming(false); return; }
      Alert.alert(t('common.error'), err.message || t('common.retry'));
    } finally { setClaiming(false); }
  };

  const handleDismiss = () => { clearInterval(timerRef.current); if (animRef.current) animRef.current.stop(); startedAtRef.current = null; setActiveTask(null); setCanClaim(false); };
  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const taskMeta = activeTask ? TASK_DESCRIPTIONS[activeTask.task_type] : null;
  const warningAction = activeTask?.task_type === 'subscribe' ? t('earn.subscription') : t('earn.like');

  if (loading) return <LoadingSpinner message={t('common.loading')} />;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.warningBanner}>
        <Text style={styles.warningText}>{WARNINGS.earnScreenBanner}</Text>
      </View>
      <View style={styles.header}>
        <Text style={styles.title}>{t('earn.title')}</Text>
        <Text style={styles.subtitle}>{t('earn.subtitle')}</Text>
      </View>

      <SectionList
        sections={toSections(tasks, t)}
        keyExtractor={item => item.id.toString()}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionLabel, { color: section.color }]}>{section.title}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <View>
            <TaskCard task={item} onPress={() => !item.already_completed && showWarningThenOpen(item)} disabled={item.already_completed} />
            {!item.already_completed && (
              <Text style={styles.taskReminder}>{WARNINGS.taskFooterReminder(item.task_type)}</Text>
            )}
          </View>
        )}
        contentContainerStyle={styles.list}
        onRefresh={() => { setRefreshing(true); loadTasks(); }}
        refreshing={refreshing}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={<EmptyState emoji="🎯" title={t('earn.noTasks')} subtitle={t('earn.noTasksSubtitle')} />}
        showsVerticalScrollIndicator={false}
      />

      <Modal visible={!!activeTask} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalEmoji}>{taskMeta?.emoji || '⏳'}</Text>
            <Text style={styles.modalTitle}>{canClaim ? t('earn.readyToVerify') : `${taskMeta?.label || 'Task'} ${t('earn.inProgress')}`}</Text>
            <Text style={styles.modalChannel}>{activeTask?.channel_name}</Text>
            {activeTask?.task_type === 'like_comment' && (
              <View style={styles.bonusHint}>
                <Text style={styles.bonusHintText}>{t('earn.commentBonus')}</Text>
              </View>
            )}
            <Text style={styles.modalInstruction}>
              {canClaim ? t('earn.tapToVerify') : t('earn.keepActive')}
            </Text>
            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressFill, { width: progressWidth, backgroundColor: canClaim ? '#06D6A0' : '#6C63FF' }]} />
            </View>
            <Text style={styles.countdown}>{canClaim ? '✓ Done!' : `${countdown}${t('earn.secondsRemaining')}`}</Text>
            <TouchableOpacity
              style={[styles.claimBtn, !canClaim && styles.claimBtnDisabled, claiming && styles.claimBtnLoading]}
              onPress={handleClaim} disabled={!canClaim || claiming}
            >
              <Text style={styles.claimBtnText}>
                {claiming ? t('earn.verifying') : canClaim ? `🪙 ${t('earn.verifyClaim')} +${activeTask?.reward}` : t('earn.pleaseWait')}
              </Text>
            </TouchableOpacity>
            <View style={styles.warningInModal}>
              <Text style={styles.warningInModalText}>
                {t('earn.warningModal', { action: warningAction })}
              </Text>
            </View>
            <TouchableOpacity style={styles.dismissBtn} onPress={handleDismiss}>
              <Text style={styles.dismissText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A0A0F' },
  warningBanner: { backgroundColor: 'rgba(255,183,3,0.1)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,183,3,0.3)', paddingHorizontal: 16, paddingVertical: 8 },
  warningText: { fontSize: 11, color: '#FFB703', lineHeight: 16 },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 26, fontWeight: '800', color: '#FFFFFF' },
  subtitle: { fontSize: 12, color: '#555570', marginTop: 2 },
  list: { paddingHorizontal: 16, paddingBottom: 80 },
  sectionHeader: { paddingTop: 12, paddingBottom: 4 },
  sectionLabel: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  taskReminder: { fontSize: 11, color: '#555570', marginTop: -6, marginBottom: 8, paddingHorizontal: 4, fontStyle: 'italic' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#13131A', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, gap: 12, borderTopWidth: 1, borderColor: '#2A2A3A', alignItems: 'center' },
  modalEmoji: { fontSize: 36 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  modalChannel: { fontSize: 15, fontWeight: '700', color: '#6C63FF' },
  bonusHint: { backgroundColor: 'rgba(6,214,160,0.1)', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: 'rgba(6,214,160,0.3)', width: '100%' },
  bonusHintText: { fontSize: 12, color: '#06D6A0', textAlign: 'center', fontWeight: '600' },
  modalInstruction: { fontSize: 13, color: '#9999BB', textAlign: 'center' },
  progressTrack: { width: '100%', height: 8, backgroundColor: '#1C1C26', borderRadius: 99, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 99 },
  countdown: { fontSize: 15, fontWeight: '700', color: '#9999BB' },
  claimBtn: { width: '100%', backgroundColor: '#6C63FF', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  claimBtnDisabled: { backgroundColor: '#1C1C26' },
  claimBtnLoading: { opacity: 0.7 },
  claimBtnText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  warningInModal: { backgroundColor: 'rgba(239,71,111,0.08)', borderRadius: 8, padding: 10, width: '100%', borderWidth: 1, borderColor: 'rgba(239,71,111,0.2)' },
  warningInModalText: { fontSize: 11, color: '#EF476F', textAlign: 'center' },
  dismissBtn: { paddingVertical: 8 },
  dismissText: { fontSize: 13, color: '#555570' },
});

export default EarnScreen;