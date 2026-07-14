import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, SectionList, TouchableOpacity,
  SafeAreaView, Linking, Modal, Animated, AppState,
} from 'react-native';
import { Alert } from '../components/ThemedAlert';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { spacing, radius } from '../theme';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import TaskCard from '../components/TaskCard';
import { LoadingSpinner, EmptyState } from '../components';
import ThemeToggle from '../components/ThemeToggle';
import { TASK_COMPLETION_DELAY, MIN_COMMENT_WORDS } from '../utils/constants';
import { getCurrentLanguage } from '../utils/i18n';
import { getWarnings, getTaskDescriptions } from '../utils/warnings';
import { getDeviceId } from '../utils/device';
import { getIntegrityToken } from '../services/integrity';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import { useTranslation } from '../hooks/useTranslation';

// Only ever open real YouTube URLs. Campaign URLs come from other users, so an
// unvalidated value could point the in-app browser at a phishing page. Anything
// that isn't https + a youtube host is refused (we fall back to youtube.com).
function safeYouTubeUrl(raw) {
  if (typeof raw !== 'string') return null;
  const m = raw.match(/^https:\/\/([a-z0-9.-]+)(?:[/?#]|$)/i);
  if (!m) return null;
  const host = m[1].toLowerCase();
  const ok = host === 'youtu.be' || host === 'youtube.com' || host.endsWith('.youtube.com');
  return ok ? raw : null;
}

function toSections(tasks, t, colors) {
  const TIER_META = {
    1: { label: t('earn.tierFeatured'), color: colors.gold },
    2: { label: t('earn.tierPremium'),  color: colors.primary },
    3: { label: t('earn.tierCommunity'), color: colors.textSecondary },
  };
  const buckets = { 1: [], 2: [], 3: [] };
  for (const task of tasks) buckets[task.tier || 3].push(task);
  return [1, 2, 3]
    .filter(tier => buckets[tier].length)
    .map(tier => ({ tier, title: TIER_META[tier].label, color: TIER_META[tier].color, data: buckets[tier] }));
}

const EarnScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { refreshUser } = useAuth();
  const { t, lang } = useTranslation();
  const navigation = useNavigation();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTask, setActiveTask] = useState(null);
  const [startedAt, setStartedAt] = useState(null);
  const [countdown, setCountdown] = useState(TASK_COMPLETION_DELAY);
  const [canClaim, setCanClaim] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [warningTask, setWarningTask] = useState(null); // task pending the start confirmation modal
  const [commentHelp, setCommentHelp] = useState(null); // {ai_example, template_ids, min_words} for like_comment
  const [maintenance, setMaintenance] = useState(''); // admin maintenance banner text (empty = none)
  const [startingTaskId, setStartingTaskId] = useState(null); // task.id whose blocking /start call is in flight — busy indicator, blocks double-tap
  const timerRef = useRef(null);
  const startedAtRef = useRef(null);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const animRef = useRef(null);

  // Memoized so they aren't rebuilt every second during the countdown timer
  // Depend on `lang` (which changes on a live language switch), NOT `t` — `t` is a stable
  // module-level reference that never changes, so `[t]` would freeze these at mount-time
  // language and only update on app restart (the like_comment labels stayed French bug).
  const WARNINGS = useMemo(() => getWarnings(t), [lang]);
  const TASK_DESCRIPTIONS = useMemo(() => getTaskDescriptions(t), [lang]);

  const loadTasks = async () => {
    try { setTasks(await api.getAvailableTasks()); setError(null); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); setRefreshing(false); }
    // Runtime flags (maintenance banner). Best-effort — never blocks the feed.
    api.getClientConfig(getCurrentLanguage()).then((c) => setMaintenance(c?.maintenance_message || '')).catch(() => {});
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

  useEffect(() => () => { clearInterval(timerRef.current); if (animRef.current) animRef.current.stop(); }, []);

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

  // Watch tasks play inside the app (in-app YouTube player with a real-playback
  // timer). Everything else keeps the themed confirm → open-YouTube flow.
  const showWarningThenOpen = (task) => {
    if (task.task_type === 'watch') { navigation.navigate('WatchPlayer', { task }); return; }
    setCommentHelp(null);
    setWarningTask(task);
    // For like+comment, pull what-to-comment help (owner templates + optional AI example).
    if (task.task_type === 'like_comment') {
      api.getCommentHelp(task.id, getCurrentLanguage()).then(setCommentHelp).catch(() => {});
    }
  };
  const confirmWarning = () => {
    const task = warningTask;
    if (!task || startingTaskId) return; // a /start call is already in flight — ignore a stray re-tap
    setWarningTask(null);
    setStartingTaskId(task.id); // busy state the instant the user confirms, before the awaited /start call below
    openAndStartTimer(task);
  };

  // (Re)start the completion countdown from a given base time. Reused by the
  // initial open and by the NOT_STARTED path (when the server hadn't stamped a
  // start yet and asks the user to wait the full delay).
  const startCountdown = (baseMs) => {
    startedAtRef.current = baseMs;
    setStartedAt(baseMs);
    setCountdown(TASK_COMPLETION_DELAY);
    setCanClaim(false);
    progressAnim.setValue(0);
    if (animRef.current) animRef.current.stop();
    animRef.current = Animated.timing(progressAnim, { toValue: 1, duration: TASK_COMPLETION_DELAY * 1000, useNativeDriver: false });
    animRef.current.start();
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - baseMs) / 1000;
      const remaining = Math.max(0, TASK_COMPLETION_DELAY - elapsed);
      setCountdown(Math.ceil(remaining));
      if (remaining <= 0) { clearInterval(timerRef.current); setCanClaim(true); }
    }, 1000);
  };

  const openAndStartTimer = async (task) => {
    // startingTaskId (set by confirmWarning, cleared below in `finally`) is the busy
    // indicator covering this whole flow — it must not be cleared until every exit
    // path (server-rejected start, transient error, or success) has resolved.
    try {
      // Confirm eligibility server-side BEFORE opening YouTube. If the target was already
      // earned (e.g. this video's like was done in another campaign, still shown on a stale
      // feed), stop here so the user never does unpaid work. Transient/other errors fall
      // through — the server auto-stamps the start at verify (NOT_STARTED path).
      try {
        await api.startTask(task.id); // server records the real start time
      } catch (err) {
        const code = (err.data || {}).code;
        if (code) {
          // Server rejected the start (already earned, or campaign paused/cancelled/full).
          // Stop BEFORE the user does any real work and refresh the (stale) list.
          Alert.alert(
            code === 'ALREADY_EARNED' ? t('earn.alreadyEarnedTitle') : t('common.error'),
            code === 'ALREADY_EARNED' ? t('earn.alreadyEarnedMessage') : (err.message || '')
          );
          loadTasks();
          return;
        }
        // No code → transient network error; proceed (verify auto-stamps via NOT_STARTED).
      }
      const candidate = (task.task_type !== 'subscribe' && task.target_video_url)
        ? task.target_video_url
        : task.channel_url;
      const rawUrl = safeYouTubeUrl(candidate) || 'https://www.youtube.com';
      setActiveTask(task);
      startCountdown(Date.now());
      try {
        if (await InAppBrowser.isAvailable()) {
          await InAppBrowser.open(rawUrl, { toolbarColor: colors.bg, navigationBarColor: colors.bg, showTitle: true, enableUrlBarHiding: true, enableDefaultShare: false });
        } else { await Linking.openURL(rawUrl); }
      } catch (e) { try { await Linking.openURL('https://www.youtube.com'); } catch (_) {} }
    } finally {
      setStartingTaskId(null); // clear busy state — success and every error path land here
    }
  };

  const handleClaim = async () => {
    if (!canClaim || !activeTask || claiming) return;
    setClaiming(true);
    try {
      const deviceId = await getDeviceId();
      const integrityToken = await getIntegrityToken(); // best-effort; null if unavailable
      const result = await api.verifyTask(activeTask.id, startedAt, deviceId, integrityToken);
      await refreshUser();
      setActiveTask(null);
      startedAtRef.current = null;
      setTasks(prev => prev.map(tk => tk.id === activeTask.id ? { ...tk, already_completed: true } : tk));
      const bonusMsg = result.comment_verified
        ? `\n💬 ${t('earn.commentBonusEarned')}: +${result.bonus_coins} ${t('common.coins')}!`
        : (activeTask.task_type === 'like_comment' ? `\n${t('earn.noCommentDetected')}` : '');
      Alert.alert(t('earn.coinsEarned'), `${result.message}${bonusMsg}\n\n${t('earn.balance')}: ${result.new_balance} 🪙`);
    } catch (err) {
      const d = err.data || {};
      const closeAndReload = () => { setActiveTask(null); startedAtRef.current = null; clearInterval(timerRef.current); loadTasks(); setClaiming(false); };
      if (d.code === 'NO_CHANNEL') { Alert.alert(t('earn.noChannelTitle'), t('earn.noChannelMessage')); setClaiming(false); return; }
      if (d.code === 'COMMENTS_DISABLED') { Alert.alert(t('earn.commentsDisabledTitle'), t('earn.commentsDisabledMessage')); closeAndReload(); return; }
      if (d.code === 'COMMENT_TOO_SHORT') { Alert.alert(t('earn.commentTooShortTitle'), t('earn.commentTooShortMessage', { min: d.min_words || MIN_COMMENT_WORDS })); setClaiming(false); return; }
      if (d.code === 'TYPE_DAILY_LIMIT') { Alert.alert(t('earn.typeLimitTitle'), t('earn.typeLimitMessage')); closeAndReload(); return; }
      if (d.code === 'TASK_TYPE_DISABLED') { Alert.alert(t('earn.typeUnavailableTitle'), t('earn.typeUnavailableMessage')); closeAndReload(); return; }
      if (d.verified === false) { Alert.alert(t('earn.notDetectedYet'), d.error); setClaiming(false); return; }
      if (d.code === 'NO_YOUTUBE_ACCESS' || d.code === 'YOUTUBE_REAUTH') { Alert.alert(t('earn.reconnectNeeded'), t('earn.reconnectMessage')); setActiveTask(null); startedAtRef.current = null; clearInterval(timerRef.current); setClaiming(false); return; }
      if (d.code === 'VERIFY_RETRY') { Alert.alert(t('common.retry'), t('earn.tryAgainMessage')); setClaiming(false); return; }
      // Server hadn't stamped a start yet (e.g. /start was dropped). It stamped one
      // now and wants the full delay — restart the countdown instead of erroring.
      if (d.code === 'NOT_STARTED') { setClaiming(false); startCountdown(Date.now()); Alert.alert(t('earn.notReadyTitle'), t('earn.notReadyMessage')); return; }
      if (d.code === 'DEVICE_REQUIRED') { Alert.alert(t('earn.deviceRequiredTitle'), t('earn.deviceRequiredMessage')); setClaiming(false); return; }
      if (d.code === 'WATCH_DAILY_LIMIT') { Alert.alert(t('earn.watchLimitTitle'), t('earn.watchLimitMessage')); closeAndReload(); return; }
      if (d.code === 'ALREADY_EARNED' || d.code === 'ALREADY_COMPLETED') { Alert.alert(t('earn.alreadyEarnedTitle'), t('earn.alreadyEarnedMessage')); closeAndReload(); return; }
      if (d.code === 'BANNED') { Alert.alert(t('earn.accountSuspended'), d.error); setActiveTask(null); startedAtRef.current = null; clearInterval(timerRef.current); setClaiming(false); return; }
      if (d.code === 'CAMPAIGN_FULL') { Alert.alert(t('earn.slotTaken'), t('earn.slotTakenMessage')); closeAndReload(); return; }
      if (d.code === 'CAMPAIGN_PAUSED') { Alert.alert(t('earn.campaignPaused'), t('earn.campaignPausedMessage')); closeAndReload(); return; }
      if (d.code === 'CAMPAIGN_CANCELLED') { Alert.alert(t('earn.campaignCancelled'), t('earn.campaignCancelledMessage')); closeAndReload(); return; }
      if (d.code === 'CAMPAIGN_UNAVAILABLE') { Alert.alert(t('earn.campaignUnavailable'), t('earn.campaignUnavailableMessage')); closeAndReload(); return; }
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
      {!!maintenance && (
        <View style={styles.maintenanceBanner}><Text style={styles.maintenanceText}>🚧 {maintenance}</Text></View>
      )}
      {error && (
        <View style={styles.errorBanner}><Text style={styles.errorText}>{error}</Text></View>
      )}
      <View style={styles.warningBanner}>
        <Text style={styles.warningText}>{WARNINGS.earnScreenBanner}</Text>
      </View>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t('earn.title')}</Text>
          <Text style={styles.subtitle}>{t('earn.subtitle')}</Text>
        </View>
        <ThemeToggle />
      </View>

      <SectionList
        sections={toSections(tasks, t, colors)}
        keyExtractor={item => item.id.toString()}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionDot, { backgroundColor: section.color }]} />
            <Text style={styles.sectionLabel}>{section.title}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <View>
            <TaskCard
              task={item}
              onPress={() => !item.already_completed && !startingTaskId && showWarningThenOpen(item)}
              disabled={item.already_completed || item.id === startingTaskId}
            />
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

      {/* Themed start-task confirmation (replaces the native Alert) */}
      <Modal visible={!!warningTask} transparent animationType="fade" onRequestClose={() => setWarningTask(null)}>
        <View style={styles.warnOverlay}>
          <View style={styles.warnCard}>
            <View style={styles.warnIconWrap}>
              <Text style={styles.warnIcon}>{warningTask ? (TASK_DESCRIPTIONS[warningTask.task_type]?.emoji || '⚠️') : '⚠️'}</Text>
            </View>
            <Text style={styles.warnTitle}>{warningTask ? getWarning(warningTask).title : ''}</Text>
            <Text style={styles.warnMessage}>{warningTask ? getWarning(warningTask).message : ''}</Text>

            {warningTask?.task_type === 'like_comment' && (
              <View style={styles.exBox}>
                <Text style={styles.exTitle}>{t('earn.commentExamplesTitle')}</Text>
                <Text style={styles.exHint}>{t('earn.commentExamplesHint', { min: commentHelp?.min_words || MIN_COMMENT_WORDS })}</Text>
                {!!commentHelp?.ai_example && (
                  <View style={styles.exAiBox}>
                    <Text style={styles.exAiLabel}>{t('earn.commentAiSuggestion')}</Text>
                    <Text style={styles.exAi}>“{commentHelp.ai_example}”</Text>
                  </View>
                )}
                {(commentHelp?.template_ids || []).map((id) => {
                  const arr = t('earn.commentExamples');
                  const s = Array.isArray(arr) ? arr[id] : null;
                  return s ? <Text key={id} style={styles.exItem}>• {s}</Text> : null;
                })}
              </View>
            )}

            <Text style={styles.warnClawback}>{t('earn.clawbackWarning')}</Text>
            <TouchableOpacity style={styles.warnConfirm} onPress={confirmWarning} activeOpacity={0.85}>
              <Text style={styles.warnConfirmText}>{warningTask ? getWarning(warningTask).confirmText : ''}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.warnCancel} onPress={() => setWarningTask(null)} activeOpacity={0.7}>
              <Text style={styles.warnCancelText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={!!activeTask} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalEmoji}>{taskMeta?.emoji || '⏳'}</Text>
            <Text style={styles.modalTitle}>{canClaim ? t('earn.readyToVerify') : `${taskMeta?.label || t('common.task')} ${t('earn.inProgress')}`}</Text>
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
              <Animated.View style={[styles.progressFill, { width: progressWidth, backgroundColor: canClaim ? colors.success : colors.primary }]} />
            </View>
            <Text style={styles.countdown}>{canClaim ? t('earn.done') : `${countdown}${t('earn.secondsRemaining')}`}</Text>
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

const makeStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  warningBanner: { backgroundColor: 'rgba(255,183,3,0.1)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,183,3,0.3)', paddingHorizontal: 16, paddingVertical: 8 },
  warningText: { fontSize: 11, color: colors.warning, lineHeight: 16 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 26, fontWeight: '800', color: colors.textPrimary },
  subtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  list: { paddingHorizontal: 16, paddingBottom: 80 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: spacing.md, paddingBottom: spacing.xs },
  sectionDot: { width: 8, height: 8, borderRadius: radius.full },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1 },
  taskReminder: { fontSize: 11, color: colors.textMuted, marginTop: -6, marginBottom: 8, paddingHorizontal: 4, fontStyle: 'italic' },
  warnOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  warnCard: { width: '100%', maxWidth: 400, backgroundColor: colors.bgCard, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: colors.border, alignItems: 'center', gap: 14 },
  warnIconWrap: { width: 64, height: 64, borderRadius: 20, backgroundColor: colors.primary + '1A', borderWidth: 1, borderColor: colors.primary + '33', alignItems: 'center', justifyContent: 'center' },
  warnIcon: { fontSize: 30 },
  warnTitle: { fontSize: 19, fontWeight: '800', color: colors.textPrimary, textAlign: 'center' },
  warnMessage: { fontSize: 14, color: colors.textSecondary, textAlign: 'left', lineHeight: 21, alignSelf: 'stretch' },
  warnClawback: { fontSize: 12, color: colors.gold, textAlign: 'left', lineHeight: 18, alignSelf: 'stretch', backgroundColor: 'rgba(245,196,81,0.1)', borderRadius: 10, padding: 10 },
  exBox: { alignSelf: 'stretch', backgroundColor: colors.bgCard, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border, gap: 4 },
  exTitle: { fontSize: 14, fontWeight: '800', color: colors.textPrimary },
  exHint: { fontSize: 12, color: colors.textSecondary, lineHeight: 17, marginBottom: 4 },
  exAiBox: { backgroundColor: 'rgba(99,102,241,0.1)', borderRadius: 8, padding: 8, marginBottom: 4 },
  exAiLabel: { fontSize: 11, fontWeight: '700', color: colors.primary },
  exAi: { fontSize: 13, color: colors.textPrimary, fontStyle: 'italic', lineHeight: 18 },
  exItem: { fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
  maintenanceBanner: { backgroundColor: 'rgba(245,196,81,0.15)', paddingHorizontal: spacing.md, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.gold },
  maintenanceText: { fontSize: 13, color: colors.gold, fontWeight: '700', textAlign: 'center' },
  warnConfirm: { width: '100%', backgroundColor: colors.primary, paddingVertical: 15, borderRadius: 14, alignItems: 'center', marginTop: 4 },
  warnConfirmText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  warnCancel: { width: '100%', paddingVertical: 12, alignItems: 'center' },
  warnCancelText: { color: colors.textMuted, fontWeight: '600', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.bgCard, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, gap: 12, borderTopWidth: 1, borderColor: colors.border, alignItems: 'center' },
  modalEmoji: { fontSize: 36 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  modalChannel: { fontSize: 15, fontWeight: '700', color: colors.primary },
  bonusHint: { backgroundColor: 'rgba(6,214,160,0.1)', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: 'rgba(6,214,160,0.3)', width: '100%' },
  bonusHintText: { fontSize: 12, color: colors.success, textAlign: 'center', fontWeight: '600' },
  modalInstruction: { fontSize: 13, color: colors.textSecondary, textAlign: 'center' },
  progressTrack: { width: '100%', height: 8, backgroundColor: colors.bgElevated, borderRadius: 99, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 99 },
  countdown: { fontSize: 15, fontWeight: '700', color: colors.textSecondary },
  claimBtn: { width: '100%', backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  claimBtnDisabled: { backgroundColor: colors.bgElevated },
  claimBtnLoading: { opacity: 0.7 },
  claimBtnText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  warningInModal: { backgroundColor: 'rgba(239,71,111,0.08)', borderRadius: 8, padding: 10, width: '100%', borderWidth: 1, borderColor: 'rgba(239,71,111,0.2)' },
  warningInModalText: { fontSize: 11, color: colors.danger, textAlign: 'center' },
  dismissBtn: { paddingVertical: 8 },
  dismissText: { fontSize: 13, color: colors.textMuted },
  errorBanner: { backgroundColor: '#E53935', padding: 12, alignItems: 'center' },
  errorText: { color: '#FFFFFF', fontSize: 13 },
});

export default EarnScreen;