import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { calcCampaignCost, extractChannelId } from '../utils/helpers';
import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  SafeAreaView, ScrollView, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius } from '../theme';
import { LoadingSpinner } from '../components';
import { getWarnings, getTaskDescriptions } from '../utils/warnings';
import { useTranslation } from '../hooks/useTranslation';

const SLOT_PRESETS  = [10, 25, 50, 100];
const WATCH_PRESETS = [1, 2, 3, 5, 10];
const REQUIRES_CHANNEL = ['subscribe', 'subscribe_like'];

const GetSubscribersScreen = () => {
  const { user, refreshUser } = useAuth();
  const { t } = useTranslation();
  const WARNINGS = useMemo(() => getWarnings(t), [t]);
  const TASK_DESCRIPTIONS = useMemo(() => getTaskDescriptions(t), [t]);
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
  const [creatingCampaign, setCreatingCampaign] = useState(false);

  const needsVideo = taskType !== 'subscribe';
  const needsChannel = REQUIRES_CHANNEL.includes(taskType);
  const isOwner = user?.role === 'owner';
  const cost = calcCampaignCost(parseInt(subsWanted) || 0, taskType, parseInt(watchMinutes) || 1);
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
      return Alert.alert(t('common.error'), 'Please enter both channel name and URL');
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

    const mins = taskType === 'watch' ? parseInt(watchMinutes) || 2 : undefined;
    const costMsg = isOwner ? t('boost.ownerFree') : `${cost} ${t('common.coins')}`;

    Alert.alert(
      t('boost.launchTitle'),
      t('boost.launchMsg', { type: TASK_DESCRIPTIONS[taskType].label, slots: n, cost: costMsg }) +
      (taskType === 'watch' ? t('boost.watchMsg', { minutes: mins }) : '') +
      t('boost.launchConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: '🚀 Launch',
          onPress: async () => {
            setCreatingCampaign(true);
            try {
              await api.createTask({
                channel_id: needsChannel ? selectedChannel?.id : undefined,
                task_type: taskType,
                subscribers_wanted: n,
                target_video_url: needsVideo ? videoUrl.trim() : undefined,
                watch_minutes: mins,
              });
              await refreshUser();
              setSubsWanted(''); setVideoUrl('');
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
            <View>
              <Text style={styles.title}>{t('boost.title')}</Text>
            </View>
            <View style={styles.headerRight}>
              <View style={styles.balancePill}>
                <Text style={styles.balanceText}>{isOwner ? `∞ ${t('common.unlimited')}` : `🪙 ${user?.coins ?? 0}`}</Text>
              </View>
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
            {Object.entries(TASK_DESCRIPTIONS).map(([type, meta]) => (
              <TouchableOpacity
                key={type}
                style={[styles.typeCard, taskType === type && styles.typeCardActive]}
                onPress={() => { setTaskType(type); setVideoUrl(''); setSubsWanted(''); }}
              >
                <Text style={{ fontSize: 22, width: 32 }}>{meta.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.typeLabel, taskType === type && { color: '#6C63FF' }]}>{meta.label}</Text>
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
                  <TextInput style={styles.input} placeholder={t('boost.addChannelName')} placeholderTextColor="#555570" value={channelName} onChangeText={setChannelName} />
                  <TextInput style={styles.input} placeholder={t('boost.addChannelUrl')} placeholderTextColor="#555570" value={channelUrl} onChangeText={setChannelUrl} autoCapitalize="none" keyboardType="url" />
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
                placeholderTextColor="#555570"
                value={videoUrl}
                onChangeText={setVideoUrl}
                autoCapitalize="none"
                keyboardType="url"
              />
              {taskType === 'watch' && (
                <>
                  <Text style={styles.fieldLabel}>{t('boost.requiredWatchTime')}</Text>
                  <View style={styles.presets}>
                    {WATCH_PRESETS.map(m => (
                      <TouchableOpacity key={m} style={[styles.preset, watchMinutes===String(m) && styles.presetActive]} onPress={() => setWatchMinutes(String(m))}>
                        <Text style={[styles.presetText, watchMinutes===String(m) && styles.presetTextActive]}>{m}m</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={styles.watchNote}>
                    <Text style={styles.watchNoteText}>{t('boost.watchNote', { minutes: watchMinutes })}</Text>
                  </View>
                </>
              )}
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
                <TextInput style={styles.input} placeholder={t('boost.customAmount')} placeholderTextColor="#555570" value={subsWanted} onChangeText={setSubsWanted} keyboardType="number-pad" />

                {parseInt(subsWanted) > 0 && (
                  <View style={[styles.costCard, !canAfford && styles.costCardDanger]}>
                    <View style={{ alignItems: 'center' }}>
                      <Text style={styles.costLabel}>{t('boost.cost')}</Text>
                      <Text style={styles.costValue}>{isOwner ? `${t('common.free')} ∞` : `${cost} 🪙`}</Text>
                    </View>
                    <View style={{ width: 1, backgroundColor: '#2A2A3A' }} />
                    <View style={{ alignItems: 'center' }}>
                      <Text style={styles.costLabel}>{t('boost.balance')}</Text>
                      <Text style={[styles.costValue, { color: canAfford ? '#06D6A0' : '#EF476F' }]}>
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A0A0F' },
  content: { padding: 16, gap: 16, paddingBottom: 80 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerRight: { alignItems: 'flex-end', gap: 8 },
  title: { fontSize: 26, fontWeight: '800', color: '#FFFFFF' },
  balancePill: { backgroundColor: 'rgba(255,209,102,0.12)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 99, borderWidth: 1, borderColor: 'rgba(255,209,102,0.3)' },
  balanceText: { fontSize: 13, fontWeight: '700', color: '#FFD166' },
  myCampaignsBtn: { backgroundColor: '#13131A', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, borderWidth: 1, borderColor: '#2A2A3A' },
  myCampaignsBtnText: { fontSize: 12, color: '#9999BB', fontWeight: '600' },
  noticeCard: { backgroundColor: 'rgba(108,99,255,0.08)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(108,99,255,0.2)' },
  noticeText: { fontSize: 12, color: '#9999BB', lineHeight: 18 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#555570', textTransform: 'uppercase', letterSpacing: 1 },
  fieldLabel: { fontSize: 13, color: '#9999BB', fontWeight: '500' },
  input: { backgroundColor: '#1A1A24', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: '#FFFFFF', fontSize: 15, borderWidth: 1, borderColor: '#2A2A3A' },
  presets: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  preset: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#13131A', alignItems: 'center', borderWidth: 1, borderColor: '#2A2A3A', minWidth: 50 },
  presetActive: { backgroundColor: 'rgba(108,99,255,0.2)', borderColor: '#6C63FF' },
  presetText: { fontSize: 14, fontWeight: '700', color: '#9999BB' },
  presetTextActive: { color: '#6C63FF' },
  watchNote: { backgroundColor: 'rgba(255,183,3,0.08)', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: 'rgba(255,183,3,0.25)' },
  watchNoteText: { fontSize: 12, color: '#FFB703' },
  btn: { backgroundColor: '#1C1C26', paddingVertical: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#2A2A3A' },
  btnPrimary: { backgroundColor: '#6C63FF', borderColor: '#6C63FF' },
  btnLoading: { opacity: 0.7 },
  btnDisabled: { opacity: 0.4 },
  btnText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  channelRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#13131A', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#2A2A3A' },
  channelRowSelected: { borderColor: 'rgba(6,214,160,0.5)', backgroundColor: 'rgba(6,214,160,0.05)' },
  channelName: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  channelUrl: { fontSize: 12, color: '#555570', marginTop: 2 },
  addChannelBtn: { backgroundColor: '#13131A', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#2A2A3A', borderStyle: 'dashed' },
  addChannelBtnText: { fontSize: 14, fontWeight: '600', color: '#6C63FF' },
  addChannelForm: { gap: 10, backgroundColor: '#13131A', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#2A2A3A' },
  typeCard: { backgroundColor: '#13131A', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#2A2A3A', flexDirection: 'row', alignItems: 'center', gap: 12 },
  typeCardActive: { borderColor: '#6C63FF', backgroundColor: 'rgba(108,99,255,0.1)' },
  typeLabel: { fontSize: 15, fontWeight: '700', color: '#9999BB' },
  typeVerified: { fontSize: 10, color: '#555570', marginTop: 2 },
  requiresChannelBadge: { fontSize: 10, color: '#555570', backgroundColor: '#1C1C26', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  costCard: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#13131A', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#2A2A3A' },
  costCardDanger: { borderColor: 'rgba(239,71,111,0.4)' },
  costLabel: { fontSize: 11, color: '#555570', textTransform: 'uppercase', letterSpacing: 0.5 },
  costValue: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', marginTop: 2 },
  insufficientText: { fontSize: 13, color: '#EF476F', textAlign: 'center' },
  channelRequiredNote: { backgroundColor: 'rgba(108,99,255,0.08)', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(108,99,255,0.2)' },
  channelRequiredText: { fontSize: 14, color: '#9999BB', textAlign: 'center' },
});

export default GetSubscribersScreen;