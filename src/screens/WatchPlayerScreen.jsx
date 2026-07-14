import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  AppState, ActivityIndicator, Linking, Dimensions, Modal,
} from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { spacing, radius } from '../theme';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { useTranslation } from '../hooks/useTranslation';
import { getDeviceId } from '../utils/device';
import { getIntegrityToken } from '../services/integrity';
import { Alert } from '../components/ThemedAlert';

const { width } = Dimensions.get('window');
const PLAYER_H = Math.round((width - 0) * 9 / 16); // 16:9

// In-app watch player. The completion timer only advances while the video is
// ACTUALLY playing and the app is in the foreground (paused / buffering / ended /
// backgrounded all stop it). The server independently enforces the same watch-time
// floor, so a tampered client still can't claim early.
const WatchPlayerScreen = ({ route, navigation }) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation();
  const { refreshUser } = useAuth();

  const initial = route.params?.task || null;
  const [queue, setQueue] = useState(initial ? [initial] : []);
  const [idx, setIdx] = useState(0);
  const current = queue[idx] || null;

  const requiredSec = current ? Math.max(1, (parseInt(current.watch_minutes, 10) || 1) * 60) : 60;
  const [watchedSec, setWatchedSec] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true); // drives the player's play prop + timer
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [embedError, setEmbedError] = useState(false);
  const [ready, setReady] = useState(false);
  const [autoplay, setAutoplay] = useState(false);
  // Presence-check prompt. null = hidden. 'video' = mid-watch, SAME video (in-video timer
  // check — closes the AFK-autoplay hole the escalating tiered reward would otherwise open
  // on long required watch times). 'advance' = post-claim, about to auto-advance (existing
  // every-N-auto-advanced-videos check).
  const [presenceCheck, setPresenceCheck] = useState(null);
  const autoCountRef = useRef(0);
  const PRESENCE_EVERY = 4; // ask "still watching?" every N auto-advanced videos
  const IN_VIDEO_PRESENCE_SEC = 4 * 60; // "still watching?" every 4 real-watched minutes, SAME video
  const nextPresenceMarkRef = useRef(IN_VIDEO_PRESENCE_SEC);
  const doneRef = useRef(false);
  const done = watchedSec >= requiredSec;
  doneRef.current = done;
  const isPlayingRef = useRef(true); isPlayingRef.current = isPlaying;
  const wasPlayingRef = useRef(false); // whether it was playing when we went to background

  // Build the watch queue so "Next" has somewhere to go.
  useEffect(() => {
    let mounted = true;
    api.getAvailableTasks('watch')
      .then((list) => {
        if (!mounted) return;
        let q = (Array.isArray(list) ? list : []).filter((x) => !x.already_completed);
        if (initial) q = [initial, ...q.filter((x) => x.id !== initial.id)];
        setQueue(q.length ? q : (initial ? [initial] : []));
        setIdx(0);
      })
      .catch(() => { if (mounted && initial) setQueue([initial]); });
    return () => { mounted = false; };
  }, []);

  // Reset per task + stamp the server start (so its wall-clock floor lines up).
  useEffect(() => {
    if (!current) return;
    setWatchedSec(0); setClaimed(false); setEmbedError(false); setReady(false); setIsPlaying(true);
    nextPresenceMarkRef.current = IN_VIDEO_PRESENCE_SEC;
    // Record the start RELIABLY before the user watches: if the fire-and-forget call is
    // dropped, verify later returns NOT_STARTED and the WHOLE watch is wasted. Awaiting it
    // also lets us bail out up front if the target was already earned or the campaign is
    // gone — so the user never sits through a video they can't get paid for.
    let alive = true;
    (async () => {
      try { await api.startTask(current.id); }
      catch (err) {
        if (!alive) return;
        const code = (err.data || {}).code;
        if (code === 'ALREADY_EARNED' || code === 'ALREADY_COMPLETED') { Alert.alert(t('earn.alreadyEarnedTitle'), t('earn.alreadyEarnedMessage')); goNext(); }
        else if (code === 'CAMPAIGN_PAUSED' || code === 'CAMPAIGN_CANCELLED' || code === 'CAMPAIGN_UNAVAILABLE') { Alert.alert(t('common.error'), err.message || ''); goNext(); }
        // transient / no code → leave it; the verify NOT_STARTED path will stamp + wait.
      }
    })();
    return () => { alive = false; };
  }, [current?.id]);

  // Accumulate ONLY real playing seconds.
  useEffect(() => {
    if (!isPlaying || claimed || embedError) return;
    const id = setInterval(() => {
      setWatchedSec((s) => (s < requiredSec ? s + 1 : s));
    }, 1000);
    return () => clearInterval(id);
  }, [isPlaying, claimed, embedError, requiredSec]);

  // Pause the timer + player when the app leaves the foreground; resume on return if
  // it was playing (so the user isn't left with a silently-frozen timer).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      if (st !== 'active') { wasPlayingRef.current = isPlayingRef.current; setIsPlaying(false); }
      else if (wasPlayingRef.current) { wasPlayingRef.current = false; setIsPlaying(true); }
    });
    return () => sub.remove();
  }, []);

  const onState = useCallback((state) => {
    if (state === 'playing') setIsPlaying(true);
    else if (state === 'paused' || state === 'ended' || state === 'buffering' || state === 'unstarted') setIsPlaying(false);
  }, []);

  const onError = useCallback(() => { setEmbedError(true); setIsPlaying(false); }, []);
  const onReady = useCallback(() => setReady(true), []);

  const openExternally = () => {
    if (!current) return;
    const url = current.target_video_url || (current.target_video_id ? `https://www.youtube.com/watch?v=${current.target_video_id}` : null);
    if (url) Linking.openURL(url).catch(() => {});
  };

  const goNext = () => {
    if (idx < queue.length - 1) { setIdx((i) => i + 1); return; }
    // No more watch tasks left in the queue (autoplay ran out, or the user tapped
    // Finish on the last one) — tell them why instead of silently exiting the screen.
    Alert.alert(t('watch.noMoreTitle'), t('watch.noMoreMsg'), [
      { text: t('common.ok'), onPress: () => navigation.goBack() },
    ]);
  };

  const claim = async () => {
    if (claiming || !current || !done) return;
    setClaiming(true);
    try {
      const deviceId = await getDeviceId();
      const integrityToken = await getIntegrityToken();
      const res = await api.verifyTask(current.id, null, deviceId, integrityToken);
      setClaimed(true);
      try { await refreshUser(); } catch (_) {}
      Alert.alert(t('watch.claimedTitle'), t('watch.claimedMsg', { coins: res.coins_earned ?? res.total_coins ?? current.reward }));
    } catch (e) {
      const code = e.data?.code;
      // Auto-play must be turned OFF for every terminal error that does NOT advance the
      // queue (goNext), mark the task claimed, or reset the watch timer — otherwise the
      // auto-claim effect (which re-fires when `claiming` toggles back to false) would
      // re-invoke verify in a tight loop, flooding the server and stacking alerts. Only
      // ALREADY_*, CAMPAIGN_*, and NOT_STARTED change state that breaks the guard on
      // their own; the rest must disable autoplay here.
      if (code === 'WATCH_DAILY_LIMIT') { if (autoplay) setAutoplay(false); Alert.alert(t('earn.watchLimitTitle'), t('earn.watchLimitMessage')); }
      else if (code === 'ALREADY_EARNED' || code === 'ALREADY_COMPLETED') { setClaimed(true); Alert.alert(t('earn.alreadyEarnedTitle'), t('earn.alreadyEarnedMessage')); }
      else if (code === 'BANNED') { if (autoplay) setAutoplay(false); Alert.alert(t('earn.accountSuspended'), e.message || ''); navigation.goBack(); }
      else if (code === 'NO_YOUTUBE_ACCESS' || code === 'YOUTUBE_REAUTH') { if (autoplay) setAutoplay(false); Alert.alert(t('earn.reconnectNeeded'), t('earn.reconnectMessage')); navigation.goBack(); }
      else if (code === 'DEVICE_REQUIRED') { if (autoplay) setAutoplay(false); Alert.alert(t('earn.deviceRequiredTitle'), t('earn.deviceRequiredMessage')); }
      else if (code === 'CAMPAIGN_PAUSED' || code === 'CAMPAIGN_CANCELLED' || code === 'CAMPAIGN_UNAVAILABLE' || code === 'CAMPAIGN_FULL') { Alert.alert(t('common.error'), e.message || ''); goNext(); }
      else if (code === 'NOT_STARTED') { api.startTask(current.id).catch(() => {}); setWatchedSec(0); Alert.alert(t('watch.notDoneTitle'), t('watch.keepWatching')); }
      else if (code === 'WATCH_TOO_SOON') { if (autoplay) setAutoplay(false); Alert.alert(t('watch.notDoneTitle'), e.message || t('watch.keepWatching')); }
      else if (e.data?.remaining) { if (autoplay) setAutoplay(false); Alert.alert(t('watch.notDoneTitle'), t('watch.keepWatching')); }
      else {
        // Network/unknown error after a full watch. Coins aren't lost — the button
        // stays enabled to retry — but if auto-play is on, turn it OFF so the claim
        // effect doesn't hammer in a tight loop while offline.
        if (autoplay) setAutoplay(false);
        Alert.alert(t('common.error'), e.message || t('common.retry'));
      }
    } finally { setClaiming(false); }
  };

  // ── auto-play loop ───────────────────────────────────────────────────────────
  // When ON: auto-claim the instant the FULL required watch time is reached (the
  // server still enforces the floor), then auto-advance. Every few videos it pauses
  // and asks "still watching?" so it can never run unattended.
  useEffect(() => {
    if (autoplay && done && !claimed && !claiming && !embedError && current) claim();
  }, [autoplay, done, claimed, claiming, embedError]); // eslint-disable-line react-hooks/exhaustive-deps

  // In-video presence check — every IN_VIDEO_PRESENCE_SEC of REAL watched time within the
  // SAME video (separate from the every-N-auto-advanced-videos check below, and NOT gated
  // on autoplay — an unattended long watch is the exploit regardless of the autoplay
  // toggle). Pauses the player/timer until confirmed; nothing accrues while paused.
  useEffect(() => {
    if (claimed || done || presenceCheck || !current) return;
    if (watchedSec >= nextPresenceMarkRef.current) {
      nextPresenceMarkRef.current += IN_VIDEO_PRESENCE_SEC;
      setIsPlaying(false);
      setPresenceCheck('video');
    }
  }, [watchedSec, claimed, done, presenceCheck, current]);

  useEffect(() => {
    if (!autoplay || !claimed) return;
    autoCountRef.current += 1;
    if (autoCountRef.current >= PRESENCE_EVERY) { setPresenceCheck('advance'); return; }
    const id = setTimeout(() => goNext(), 1500);
    return () => clearTimeout(id);
  }, [claimed, autoplay]); // eslint-disable-line react-hooks/exhaustive-deps

  // Confirms either presence-check mode: 'advance' resumes the auto-play loop (advances to
  // the next video); 'video' just resumes the SAME video — nothing is skipped or reclaimed.
  const confirmPresence = () => {
    const mode = presenceCheck;
    setPresenceCheck(null);
    if (mode === 'advance') { autoCountRef.current = 0; goNext(); }
    else setIsPlaying(true);
  };

  if (!current) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>🎬</Text>
          <Text style={styles.emptyTitle}>{t('watch.noneTitle')}</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.primaryBtnText}>{t('common.back')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const pct = Math.min(100, Math.round((watchedSec / requiredSec) * 100));
  const remaining = Math.max(0, requiredSec - watchedSec);
  const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}><Text style={styles.closeText}>✕</Text></TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{current.channel_name || current.owner_name}</Text>
        <View style={styles.rewardPill}><Text style={styles.rewardText}>+{current.reward} 🪙</Text></View>
      </View>

      {embedError ? (
        <View style={styles.embedFallback}>
          <Text style={styles.embedEmoji}>🚫</Text>
          <Text style={styles.embedTitle}>{t('watch.embedTitle')}</Text>
          <Text style={styles.embedMsg}>{t('watch.embedMsg')}</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={openExternally}><Text style={styles.primaryBtnText}>{t('watch.openYoutube')}</Text></TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={goNext}><Text style={styles.secondaryBtnText}>{t('watch.skip')}</Text></TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.playerWrap}>
            {!ready && <View style={styles.playerLoading}><ActivityIndicator color="#fff" /></View>}
            <YoutubePlayer
              height={PLAYER_H}
              play={isPlaying}
              videoId={current.target_video_id}
              onChangeState={onState}
              onError={onError}
              onReady={onReady}
              webViewProps={{ allowsInlineMediaPlayback: true }}
              initialPlayerParams={{ controls: true, modestbranding: true, rel: false, preventFullScreen: false }}
            />
          </View>

          <View style={styles.body}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: done ? colors.success : colors.primary }]} />
            </View>
            <Text style={styles.timeText}>{mmss(watchedSec)} / {mmss(requiredSec)}</Text>

            <Text style={[styles.status, done && { color: colors.success }]}>
              {claimed ? t('watch.claimed')
                : done ? t('watch.done')
                : isPlaying ? t('watch.keepWatching')
                : t('watch.paused')}
            </Text>

            {!done && <Text style={styles.hint}>{t('watch.timerHint')}</Text>}

            {claimed ? (
              <TouchableOpacity style={styles.primaryBtn} onPress={goNext} activeOpacity={0.85}>
                <Text style={styles.primaryBtnText}>{idx < queue.length - 1 ? t('watch.nextVideo') : t('watch.finish')}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.primaryBtn, (!done || claiming) && styles.primaryBtnDisabled]} onPress={claim} disabled={!done || claiming} activeOpacity={0.85}>
                {claiming ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>{done ? t('watch.claim') : t('watch.watchMore', { s: remaining })}</Text>}
              </TouchableOpacity>
            )}

            {queue.length > 1 && !claimed && (
              <TouchableOpacity style={styles.skipBtn} onPress={goNext} activeOpacity={0.7}>
                <Text style={styles.skipText}>{t('watch.skipToNext')}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.autoRow} onPress={() => setAutoplay((a) => !a)} activeOpacity={0.8}
              accessibilityRole="switch" accessibilityState={{ checked: autoplay }}>
              <Text style={styles.autoLabel}>{t('watch.autoplay')}</Text>
              <View style={[styles.switchTrack, autoplay && styles.switchTrackOn]}>
                <View style={styles.switchKnob} />
              </View>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Presence check — keeps both autoplay AND a long unattended single watch from
          ever running unattended (see IN_VIDEO_PRESENCE_SEC above) */}
      <Modal visible={!!presenceCheck} transparent animationType="fade" onRequestClose={confirmPresence}>
        <View style={styles.swOverlay}>
          <View style={styles.swCard}>
            <Text style={styles.swEmoji}>👀</Text>
            <Text style={styles.swTitle}>{t('watch.stillTitle')}</Text>
            <Text style={styles.swMsg}>{presenceCheck === 'video' ? t('watch.stillMsgVideo') : t('watch.stillMsg')}</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={confirmPresence} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>{t('watch.continue')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  emptyEmoji: { fontSize: 44 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, textAlign: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.bgCard, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  closeText: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },
  headerTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  rewardPill: { backgroundColor: 'rgba(245,196,81,0.15)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  rewardText: { color: colors.gold, fontWeight: '800', fontSize: 13 },
  playerWrap: { width: '100%', height: PLAYER_H, backgroundColor: '#000', justifyContent: 'center' },
  playerLoading: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  body: { padding: spacing.lg, gap: spacing.md },
  progressTrack: { height: 10, borderRadius: 99, backgroundColor: colors.bgCard, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  progressFill: { height: 10, borderRadius: 99 },
  timeText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', fontWeight: '600' },
  status: { fontSize: 17, fontWeight: '800', color: colors.textPrimary, textAlign: 'center' },
  hint: { fontSize: 12, color: colors.textMuted, textAlign: 'center', lineHeight: 17 },
  primaryBtn: { backgroundColor: colors.primary, paddingVertical: spacing.md, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', height: 52, marginTop: spacing.xs },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  secondaryBtn: { paddingVertical: spacing.sm, alignItems: 'center' },
  secondaryBtnText: { color: colors.textSecondary, fontWeight: '700', fontSize: 14 },
  skipBtn: { paddingVertical: spacing.sm, alignItems: 'center' },
  skipText: { color: colors.textMuted, fontWeight: '600', fontSize: 13 },
  autoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  autoLabel: { color: colors.textPrimary, fontWeight: '700', fontSize: 14, flexShrink: 1, marginRight: 12 },
  switchTrack: { width: 46, height: 28, borderRadius: 14, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 3, justifyContent: 'flex-start' },
  switchTrackOn: { backgroundColor: colors.primary, borderColor: colors.primary, justifyContent: 'flex-end' },
  switchKnob: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
  swOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  swCard: { width: '100%', maxWidth: 380, backgroundColor: colors.bgCard, borderRadius: 22, padding: 24, borderWidth: 1, borderColor: colors.border, alignItems: 'center', gap: 12 },
  swEmoji: { fontSize: 40 },
  swTitle: { fontSize: 19, fontWeight: '800', color: colors.textPrimary, textAlign: 'center' },
  swMsg: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 21, marginBottom: 4 },
  embedFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  embedEmoji: { fontSize: 42 },
  embedTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, textAlign: 'center' },
  embedMsg: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 21 },
});

export default WatchPlayerScreen;
