import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { calcCampaignCost, calcWatchPricing, extractChannelId } from '../utils/helpers';
import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  SafeAreaView, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Alert } from '../components/ThemedAlert';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { spacing, radius } from '../theme';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { LoadingSpinner } from '../components';
import ThemeToggle from '../components/ThemeToggle';
import { getWarnings, getTaskDescriptions } from '../utils/warnings';
import { useTranslation } from '../hooks/useTranslation';

const SLOT_PRESETS  = [10, 25, 50, 100];
const WATCH_PRESETS = [1, 2, 3, 5, 10];
const REQUIRES_CHANNEL = ['subscribe', 'subscribe_like'];
const FULL_LENGTH_CAP_MIN = 15; // "Full length" caps at 15 min — a longer video just requires 15, not the whole thing

const GetSubscribersScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { user, refreshUser } = useAuth();
  const { t, lang } = useTranslation();
  // Depend on `lang` not `t` — `t` is a stable module ref; `[t]` freezes these at mount-time
  // language until app restart (the "labels stayed French on live switch" bug).
  const WARNINGS = useMemo(() => getWarnings(t), [lang]);
  const TASK_DESCRIPTIONS = useMemo(() => getTaskDescriptions(t), [lang]);
  const navigation = useNavigation();
  const [channels, setChannels] = useState([]);
  const [selectedChannelId, setSelectedChannelId] = useState(null);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [showAddChannel, setShowAddChannel] = useState(false);
  const [channelUrl, setChannelUrl] = useState('');
  const [channelName, setChannelName] = useState('');
  const [addingChannel, setAddingChannel] = useState(false);
  const [taskType, setTaskType] = useState('subscribe');
  const [subsWanted, setSubsWanted] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [watchMinutes, setWatchMinutes] = useState('2');
  const [fullLength, setFullLength] = useState(false); // "Full length" watch campaigns (spec 2026-07-11)
  const [exampleIds, setExampleIds] = useState([]); // owner-selected comment templates (max 3)
  const [disabledTypes, setDisabledTypes] = useState([]); // admin-disabled task types (hidden)
  const [creatingCampaign, setCreatingCampaign] = useState(false);

  // Hide task types the admin has temporarily disabled; switch off one if selected.
  useFocusEffect(useCallback(() => {
    api.getClientConfig().then((c) => {
      const dis = Array.isArray(c?.disabled_task_types) ? c.disabled_task_types : [];
      setDisabledTypes(dis);
      setTaskType((cur) => dis.includes(cur) ? (['subscribe', 'like', 'like_comment', 'subscribe_like', 'watch'].find((x) => !dis.includes(x)) || cur) : cur);
    }).catch(() => {});
  }, []));

  const toggleExample = (id) => setExampleIds((cur) =>
    cur.includes(id) ? cur.filter((x) => x !== id) : (cur.length >= 3 ? cur : [...cur, id]));

  const needsVideo = taskType !== 'subscribe';
  const needsChannel = REQUIRES_CHANNEL.includes(taskType);
  const isOwner = user?.role === 'owner';
  // Full length: the actual video duration decides the final minutes server-side (capped
  // at 15) — until then, show the CAP as the live "up to" estimate so the price never
  // understates what the owner might pay.
  const effectiveWatchMinutes = fullLength ? FULL_LENGTH_CAP_MIN : (parseInt(watchMinutes) || 1);
  const watchPreview = useMemo(() => calcWatchPricing(effectiveWatchMinutes), [effectiveWatchMinutes]);
  const cost = calcCampaignCost(parseInt(subsWanted) || 0, taskType, effectiveWatchMinutes);
  const canAfford = isOwner || cost <= (user?.coins ?? 0);
  const hasChannel = channels.length > 0;
  const selectedChannel = channels.find(c => c.id === selectedChannelId) || channels[0];

  useFocusEffect(useCallback(() => { loadChannels(); }, []));

  const loadChannels = async () => {
    try {
      const chs = await api.getMyChannels();
      setChannels(chs);
      if (chs.length > 0 && !selectedChannelId) setSelectedChannelId(chs[0].id);
    }
    catch (e) { Alert.alert(t('common.error'), e.message); }
    finally { setLoadingChannels(false); }
  };

  const handleAddChannel = async () => {
    if (!channelUrl.trim() || !channelName.trim())
      return Alert.alert(t('common.error'), t('boost.enterBoth'));
    setAddingChannel(true);
    try {
      const ch = await api.addChannel({
        youtube_channel_id: extractChannelId(channelUrl),
        channel_name: channelName.trim(),
        channel_url: channelUrl.trim(),
      });
      const updated = [...channels, ch];
      setChannels(updated);
      setSelectedChannelId(ch.id);
      setChannelUrl(''); setChannelName('');
      setShowAddChannel(false);
      Alert.alert(t('boost.channelAdded'), t('boost.channelAddedMsg'));
    } catch (e) { Alert.alert(t('common.error'), e.message); }
    finally { setAddingChannel(false); }
  };

  const handleCreateCampaign = async () => {
    if (needsChannel && !hasChannel)
      return Alert.alert(t('boost.noChannel'), t('boost.noChannelMsg'));
    const n = parseInt(subsWanted);
    if (!n || n < 1) return Alert.alert(t('boost.invalid'), t('boost.invalidSlots'));
    if (needsVideo && !videoUrl.trim()) return Alert.alert(t('boost.missingVideo'), t('boost.missingVideoMsg'));
    if (!canAfford) return Alert.alert(t('boost.insufficientCoins'), t('boost.insufficientMsg', { cost, balance: user?.coins }));

    const mins = taskType === 'watch' && !fullLength ? parseInt(watchMinutes) || 2 : undefined;
    const costMsg = isOwner ? t('boost.ownerFree') : `${cost} ${t('common.coins')}`;

    Alert.alert(
      t('boost.launchTitle'),
      t('boost.launchMsg', { type: TASK_DESCRIPTIONS[taskType].label, slots: n, cost: costMsg }) +
      (taskType === 'watch' ? (fullLength ? t('boost.watchMsgFullLength', { cap: FULL_LENGTH_CAP_MIN }) : t('boost.watchMsg', { minutes: mins })) : '') +
      t('boost.launchConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('boost.launch'),
          onPress: async () => {
            setCreatingCampaign(true);
            try {
              await api.createTask({
                channel_id: needsChannel ? selectedChannel?.id : undefined,
                task_type: taskType,
                subscribers_wanted: n,
                target_video_url: needsVideo ? videoUrl.trim() : undefined,
                watch_minutes: mins,
                full_length: taskType === 'watch' ? fullLength : undefined,
                comment_example_ids: taskType === 'like_comment' ? exampleIds : undefined,
              });
              await refreshUser();
              setSubsWanted(''); setVideoUrl(''); setExampleIds([]); setFullLength(false);
              Alert.alert(t('boost.campaignLive'), `${t('boost.slotsOpened', { slots: n })}\n\n${WARNINGS.campaignFairUse}`);
            } catch (e) {
              Alert.alert(t('boost.campaignError'), e.message || t('common.error'));
            } finally { setCreatingCampaign(false); }
          },
        },
      ]
    );
  };

  const videoStep = needsChannel ? 3 : 2;
  const slotStep = needsVideo ? videoStep + 1 : videoStep;

  if (loadingChannels) return <LoadingSpinner message={t('common.loading')} />;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <ThemeToggle />
              <Text style={styles.title}>{t('boost.title')}</Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.balancePill} activeOpacity={0.8} onPress={() => navigation.navigate('BuyCoins')}>
                <Text style={styles.balanceText}>{isOwner ? `∞ ${t('common.unlimited')}` : `🪙 ${user?.coins ?? 0}  ＋`}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.myCampaignsBtn} onPress={() => navigation.navigate('MyCampaigns')}>
                <Text style={styles.myCampaignsBtnText}>{t('boost.myCampaigns')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.noticeCard}>
            <Text style={styles.noticeText}>{WARNINGS.campaignFairUse}</Text>
          </View>

          {/* Step 1 - Task Type */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('boost.step1')}</Text>
            {Object.entries(TASK_DESCRIPTIONS).filter(([type]) => !disabledTypes.includes(type)).map(([type, meta]) => (
              <TouchableOpacity
                key={type}
                style={[styles.typeCard, taskType === type && styles.typeCardActive]}
                onPress={() => { setTaskType(type); setVideoUrl(''); setSubsWanted(''); setFullLength(false); }}
              >
                <Text style={{ fontSize: 22, width: 32 }}>{meta.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.typeLabel, taskType === type && { color: colors.primary }]}>{meta.label}</Text>
                  <Text style={styles.typeVerified}>{meta.verifiedBy}</Text>
                </View>
                {REQUIRES_CHANNEL.includes(type) && (
                  <Text style={styles.requiresChannelBadge}>{t('boost.needsChannel')}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Step 2 - Channel selector (only for subscribe/subscribe_like) */}
          {needsChannel && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('boost.step2channel')}</Text>

              {/* Existing channels list */}
              {channels.map(ch => (
                <TouchableOpacity
                  key={ch.id}
                  style={[styles.channelRow, selectedChannelId === ch.id && styles.channelRowSelected]}
                  onPress={() => setSelectedChannelId(ch.id)}
                >
                  <Text style={{ fontSize: 20 }}>{selectedChannelId === ch.id ? '✅' : '📺'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.channelName}>{ch.channel_name}</Text>
                    <Text style={styles.channelUrl} numberOfLines={1}>{ch.channel_url}</Text>
                  </View>
                </TouchableOpacity>
              ))}

              {/* Add new channel button / form */}
              {!showAddChannel ? (
                <TouchableOpacity style={styles.addChannelBtn} onPress={() => setShowAddChannel(true)}>
                  <Text style={styles.addChannelBtnText}>+ {t('boost.addChannelBtn')}</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.addChannelForm}>
                  <TextInput style={styles.input} placeholder={t('boost.addChannelName')} placeholderTextColor={colors.textMuted} value={channelName} onChangeText={setChannelName} />
                  <TextInput style={styles.input} placeholder={t('boost.addChannelUrl')} placeholderTextColor={colors.textMuted} value={channelUrl} onChangeText={setChannelUrl} autoCapitalize="none" keyboardType="url" />
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity style={[styles.btn, { flex: 1 }]} onPress={() => { setShowAddChannel(false); setChannelUrl(''); setChannelName(''); }}>
                      <Text style={styles.btnText}>{t('common.cancel')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.btn, styles.btnPrimary, { flex: 1 }, addingChannel && styles.btnLoading]} onPress={handleAddChannel} disabled={addingChannel}>
                      <Text style={styles.btnText}>{addingChannel ? t('boost.adding') : t('common.save')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Show prompt if no channels yet */}
              {!hasChannel && !showAddChannel && (
                <View style={styles.channelRequiredNote}>
                  <Text style={styles.channelRequiredText}>{t('boost.addChannelFirst')}</Text>
                </View>
              )}
            </View>
          )}

          {/* Video URL */}
          {needsVideo && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {taskType === 'watch' ? `${videoStep}. ${t('boost.stepVideo')}` : `${videoStep}. ${t('boost.stepVideoUrl')}`}
              </Text>
              <TextInput
                style={styles.input}
                placeholder={t('boost.videoPlaceholder')}
                placeholderTextColor={colors.textMuted}
                value={videoUrl}
                onChangeText={setVideoUrl}
                autoCapitalize="none"
                keyboardType="url"
              />
              {taskType === 'watch' && (
                <>
                  <Text style={styles.fieldLabel}>{t('boost.requiredWatchTime')}</Text>
                  {!fullLength && (
                    <View style={styles.presets}>
                      {WATCH_PRESETS.map(m => (
                        <TouchableOpacity key={m} style={[styles.preset, watchMinutes===String(m) && styles.presetActive]} onPress={() => setWatchMinutes(String(m))}>
                          <Text style={[styles.presetText, watchMinutes===String(m) && styles.presetTextActive]}>{m}m</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.checkboxRow}
                    onPress={() => setFullLength((v) => !v)}
                    activeOpacity={0.7}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: fullLength }}
                  >
                    <View style={[styles.checkbox, fullLength && styles.checkboxOn]}>
                      {fullLength && <Text style={styles.checkboxMark}>✓</Text>}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.checkboxLabel}>{t('boost.fullLength')}</Text>
                      <Text style={styles.checkboxHint}>{t('boost.fullLengthHint', { cap: FULL_LENGTH_CAP_MIN })}</Text>
                    </View>
                  </TouchableOpacity>

                  <View style={styles.watchNote}>
                    <Text style={styles.watchNoteText}>
                      {fullLength
                        ? t('boost.fullLengthPriceHint', { cost: watchPreview.cost, cap: FULL_LENGTH_CAP_MIN })
                        : t('boost.watchNote', { minutes: watchMinutes })}
                    </Text>
                    <Text style={styles.watchTierHint}>{t('boost.watchTierHint', { earn: watchPreview.earn })}</Text>
                  </View>
                </>
              )}
            </View>
          )}

          {/* Comment example picker (like+comment only) — owner picks up to 3 */}
          {taskType === 'like_comment' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('earn.pickCommentExamples')}</Text>
              <View style={styles.exChips}>
                {(Array.isArray(t('earn.commentExamples')) ? t('earn.commentExamples') : []).map((s, id) => {
                  const on = exampleIds.includes(id);
                  return (
                    <TouchableOpacity key={id} style={[styles.exChip, on && styles.exChipOn]} onPress={() => toggleExample(id)} activeOpacity={0.7}>
                      <Text style={[styles.exChipText, on && styles.exChipTextOn]} numberOfLines={2}>{on ? '✓ ' : ''}{s}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Slot count */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{slotStep}. {t('boost.stepSlots')}</Text>
            {needsChannel && !hasChannel ? (
              <View style={styles.channelRequiredNote}>
                <Text style={styles.channelRequiredText}>{t('boost.addChannelFirst')}</Text>
              </View>
            ) : (
              <>
                <View style={styles.presets}>
                  {SLOT_PRESETS.map(n => (
                    <TouchableOpacity key={n} style={[styles.preset, subsWanted===String(n) && styles.presetActive]} onPress={() => setSubsWanted(String(n))}>
                      <Text style={[styles.presetText, subsWanted===String(n) && styles.presetTextActive]}>{n}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput style={styles.input} placeholder={t('boost.customAmount')} placeholderTextColor={colors.textMuted} value={subsWanted} onChangeText={setSubsWanted} keyboardType="number-pad" />

                {parseInt(subsWanted) > 0 && (
                  <View style={[styles.costCard, !canAfford && styles.costCardDanger]}>
                    <View style={{ alignItems: 'center' }}>
                      <Text style={styles.costLabel}>{t('boost.cost')}</Text>
                      <Text style={styles.costValue}>{isOwner ? `${t('common.free')} ∞` : `${cost} 🪙`}</Text>
                    </View>
                    <View style={{ width: 1, backgroundColor: colors.border }} />
                    <View style={{ alignItems: 'center' }}>
                      <Text style={styles.costLabel}>{t('boost.balance')}</Text>
                      <Text style={[styles.costValue, { color: canAfford ? colors.success : colors.danger }]}>
                        {isOwner ? '∞' : `${user?.coins ?? 0} 🪙`}
                      </Text>
                    </View>
                  </View>
                )}

                {!canAfford && parseInt(subsWanted) > 0 && (
                  <Text style={styles.insufficientText}>{t('boost.needMoreCoins', { amount: cost - (user?.coins ?? 0) })}</Text>
                )}

                <TouchableOpacity
                  style={[styles.btn, styles.btnPrimary, (!canAfford || creatingCampaign || !subsWanted || (needsVideo && !videoUrl)) && styles.btnDisabled]}
                  onPress={handleCreateCampaign}
                  disabled={!canAfford || creatingCampaign || !subsWanted || (needsVideo && !videoUrl)}
                >
                  <Text style={styles.btnText}>{creatingCampaign ? t('boost.launching') : t('boost.launch')}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, gap: spacing.lg, paddingBottom: 80 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerRight: { alignItems: 'flex-end', gap: spacing.sm },
  title: { fontSize: 26, fontWeight: '800', color: colors.textPrimary },
  balancePill: { backgroundColor: colors.bgCard, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border },
  balanceText: { fontSize: 13, fontWeight: '700', color: colors.gold },
  myCampaignsBtn: { backgroundColor: colors.bgCard, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border },
  myCampaignsBtnText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  noticeCard: { backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  noticeText: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
  section: { gap: spacing.sm },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  fieldLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  input: { backgroundColor: colors.bgInput, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: colors.textPrimary, fontSize: 15, borderWidth: 1, borderColor: colors.border },
  presets: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  preset: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: colors.bgCard, alignItems: 'center', borderWidth: 1, borderColor: colors.border, minWidth: 50 },
  presetActive: { borderColor: colors.primary, borderWidth: 2 },
  exChips: { gap: 8 },
  exChip: { backgroundColor: colors.bgCard, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border },
  exChipOn: { borderColor: colors.primary, borderWidth: 2, backgroundColor: 'rgba(99,102,241,0.08)' },
  exChipText: { fontSize: 13, color: colors.textSecondary },
  exChipTextOn: { color: colors.textPrimary, fontWeight: '700' },
  presetText: { fontSize: 14, fontWeight: '700', color: colors.textSecondary },
  presetTextActive: { color: colors.primary },
  watchNote: { backgroundColor: colors.bgCard, borderRadius: radius.sm, padding: 10, borderWidth: 1, borderColor: colors.border, gap: 4 },
  watchNoteText: { fontSize: 12, color: colors.warning },
  watchTierHint: { fontSize: 11, color: colors.textMuted, lineHeight: 15 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.bgCard, borderRadius: radius.md, padding: 12, borderWidth: 1, borderColor: colors.border },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgElevated },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkboxMark: { color: '#fff', fontSize: 13, fontWeight: '800' },
  checkboxLabel: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  checkboxHint: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  btn: { backgroundColor: colors.bgElevated, paddingVertical: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  btnPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
  btnLoading: { opacity: 0.7 },
  btnDisabled: { opacity: 0.4 },
  btnText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  channelRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.bgCard, borderRadius: radius.md, padding: 14, borderWidth: 1, borderColor: colors.border },
  channelRowSelected: { borderColor: colors.primary, borderWidth: 2 },
  channelName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  channelUrl: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  addChannelBtn: { backgroundColor: colors.bgCard, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed' },
  addChannelBtnText: { fontSize: 14, fontWeight: '600', color: colors.primary },
  addChannelForm: { gap: 10, backgroundColor: colors.bgCard, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border },
  typeCard: { backgroundColor: colors.bgCard, borderRadius: radius.md, padding: 14, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 12 },
  typeCardActive: { borderColor: colors.primary, borderWidth: 2 },
  typeLabel: { fontSize: 15, fontWeight: '700', color: colors.textSecondary },
  typeVerified: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  requiresChannelBadge: { fontSize: 10, color: colors.textMuted, backgroundColor: colors.bgElevated, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  costCard: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: colors.bgCard, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border },
  costCardDanger: { borderColor: colors.danger },
  costLabel: { fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  costValue: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, marginTop: 2 },
  insufficientText: { fontSize: 13, color: colors.danger, textAlign: 'center' },
  channelRequiredNote: { backgroundColor: colors.bgCard, borderRadius: radius.md, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  channelRequiredText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
});

export default GetSubscribersScreen;