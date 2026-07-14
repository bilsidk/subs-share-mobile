import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, RefreshControl, TextInput, Switch,
} from 'react-native';
import { Alert } from '../components/ThemedAlert';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../services/api';
import { spacing, radius } from '../theme';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { LoadingSpinner } from '../components';
import ThemeToggle from '../components/ThemeToggle';
import { useTranslation } from '../hooks/useTranslation';

const TASK_TYPE_KEYS = ['subscribe', 'like', 'like_comment', 'subscribe_like', 'watch'];

const Section = ({ title, children }) => {
  const styles = useThemedStyles(makeStyles);
  return (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.sectionCard}>{children}</View>
  </View>
  );
};

const SettingRow = ({ label, value, onSave, hint }) => {
  const { t } = useTranslation();
  const styles = useThemedStyles(makeStyles);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const handleSave = () => {
    const num = parseInt(draft, 10);
    if (isNaN(num) || num < 0) { Alert.alert(t('common.error'), t('admin.validNumber')); return; }
    onSave(num); setEditing(false);
  };
  return (
    <View style={styles.settingRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.settingLabel}>{label}</Text>
        {hint && <Text style={styles.settingHint}>{hint}</Text>}
      </View>
      {editing ? (
        <View style={styles.editRow}>
          <TextInput style={styles.editInput} value={draft} onChangeText={setDraft} keyboardType="number-pad" autoFocus />
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}><Text style={styles.saveBtnText}>✓</Text></TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => { setEditing(false); setDraft(String(value)); }}><Text style={styles.cancelBtnText}>✕</Text></TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.valueBtn} onPress={() => { setDraft(String(value)); setEditing(true); }}>
          <Text style={styles.valueText}>{value}</Text>
          <Text style={styles.editIcon}>✏️</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const StatRow = ({ label, value, color }) => {
  const styles = useThemedStyles(makeStyles);
  return (
  <View style={styles.statRow}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={[styles.statValue, color && { color }]}>{value}</Text>
  </View>
  );
};

const AdminScreen = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [status, setStatus] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [promoteEmail, setPromoteEmail] = useState('');
  const [demoteEmail, setDemoteEmail] = useState('');
  const [maintenanceDraft, setMaintenanceDraft] = useState('');
  const [annMsg, setAnnMsg] = useState('');
  const [annLink, setAnnLink] = useState('');
  const [annPlatform, setAnnPlatform] = useState('both');
  const [userQuery, setUserQuery] = useState('');
  const [userResults, setUserResults] = useState([]);
  const [coinDrafts, setCoinDrafts] = useState({});

  const loadData = async () => {
    try {
      const [data, stats] = await Promise.all([api.getAdminStatus(), api.getAdminStats().catch(() => null)]);
      setStatus(data); setSettings(data.settings);
      setMaintenanceDraft(data.settings?.maintenance_message || '');
      setAnnMsg(data.settings?.announcement_message || '');
      setAnnLink(data.settings?.announcement_link || '');
      setAnnPlatform(data.settings?.announcement_platform || 'both');
      if (stats) setDashboard(stats);
    }
    catch (e) { Alert.alert(t('common.error'), e.message); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const toggleType = (type) => {
    const cur = settings?.disabled_task_types || [];
    const next = cur.includes(type) ? cur.filter((x) => x !== type) : [...cur, type];
    updateSetting('disabled_task_types', next);
  };
  const setCap = (type, v) => {
    const caps = { ...(settings?.daily_cap_by_type || {}) };
    if (v > 0) caps[type] = v; else delete caps[type];
    updateSetting('daily_cap_by_type', caps);
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const updateSetting = async (key, value) => {
    setSaving(true);
    try { const updated = await api.updateAdminSettings({ [key]: value }); setSettings(updated.settings); }
    catch (e) { Alert.alert(t('common.error'), e.message); }
    finally { setSaving(false); }
  };

  const toggleMode = () => {
    const newMode = status?.api_mode === 'live' ? 'degraded' : 'live';
    Alert.alert(
      newMode === 'degraded' ? t('admin.switchToDegraded') : t('admin.switchToLive'),
      newMode === 'degraded' ? t('admin.degradedDesc') : t('admin.liveDesc'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.confirm'), onPress: async () => { try { await api.setAdminMode(newMode); setStatus(prev => ({ ...prev, api_mode: newMode })); } catch (e) { Alert.alert(t('common.error'), e.message); } } },
      ]
    );
  };

  const promoteUser = async () => {
    const email = promoteEmail.trim();
    if (!email) return Alert.alert(t('common.error'), t('admin.enterEmail'));
    try { await api.promoteUser(email, 'premium'); Alert.alert(t('admin.premiumGranted'), t('admin.premiumGrantedMsg', { email })); setPromoteEmail(''); }
    catch (e) { Alert.alert(t('common.error'), e.message); }
  };

  const demoteUser = async () => {
    const email = demoteEmail.trim();
    if (!email) return Alert.alert(t('common.error'), t('admin.enterEmail'));
    try { await api.promoteUser(email, 'user'); Alert.alert(t('admin.premiumGranted'), t('admin.premiumRemovedMsg', { email })); setDemoteEmail(''); }
    catch (e) { Alert.alert(t('common.error'), e.message); }
  };

  const saveAnnouncement = async () => {
    setSaving(true);
    try {
      const updated = await api.updateAdminSettings({
        announcement_message: annMsg.trim(),
        announcement_link: annLink.trim(),
        announcement_platform: annPlatform,
      });
      setSettings(updated.settings);
      Alert.alert('✓', 'Announcement saved.');
    } catch (e) { Alert.alert(t('common.error'), e.message); }
    finally { setSaving(false); }
  };

  const searchUsers = async () => {
    try { const r = await api.adminUsers({ email: userQuery.trim() }); setUserResults(r.users || []); }
    catch (e) { Alert.alert(t('common.error'), e.message); }
  };

  const addCoins = async (email, userId) => {
    const amt = parseInt(coinDrafts[userId], 10);
    if (!Number.isInteger(amt) || amt === 0) return Alert.alert(t('common.error'), 'Enter a non-zero amount (e.g. 100 or -50).');
    try {
      const r = await api.adminAddCoins(email, amt);
      setUserResults((prev) => prev.map((u) => u.email === email ? { ...u, coins: r.user.coins } : u));
      setCoinDrafts((prev) => ({ ...prev, [userId]: '' }));
      Alert.alert('✓', `${r.applied >= 0 ? 'Added' : 'Removed'} ${Math.abs(r.applied)} coins. Now 🪙${r.user.coins}.`);
    } catch (e) { Alert.alert(t('common.error'), e.message); }
  };

  if (loading) return <LoadingSpinner message={t('common.loading')} />;

  const stats = status?.stats || {};
  const isLive = status?.api_mode === 'live';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={colors.primary} />}
      >
        <Text style={styles.title}>{t('admin.panel')}</Text>
        {saving && <Text style={styles.savingText}>{t('admin.saving')}</Text>}

        <Section title={t('admin.apiMode')}>
          <View style={styles.modeRow}>
            <View>
              <Text style={styles.settingLabel}>{t('admin.youtubeVerification')}</Text>
              <Text style={[styles.modeStatus, { color: isLive ? colors.success : colors.danger }]}>
                {isLive ? t('admin.liveActive') : t('admin.degradedHonor')}
              </Text>
              {status?.degraded_reason && <Text style={styles.settingHint}>{status.degraded_reason}</Text>}
            </View>
            <Switch value={isLive} onValueChange={toggleMode} trackColor={{ false: colors.danger, true: colors.success }} thumbColor="#fff" />
          </View>
        </Section>

        <Section title={t('admin.liveStats')}>
          <StatRow label={t('admin.totalUsers')} value={stats.users} />
          <StatRow label={t('admin.premiumUsers')} value={stats.premium_users} color={colors.gold} />
          <StatRow label={t('admin.bannedUsers')} value={stats.banned_users} color={colors.danger} />
          <StatRow label={t('admin.activeCampaigns')} value={stats.active_tasks} color={colors.primary} />
          <StatRow label={t('admin.verifiedCompletions')} value={stats.verified_completions} color={colors.success} />
          <StatRow label={t('admin.pendingCompletions')} value={stats.pending_completions} color={colors.warning} />
          <StatRow label={t('admin.reclaimedCompletions')} value={stats.reclaimed_completions} color={colors.danger} />
          <StatRow label={t('admin.coinsInCirculation')} value={stats.total_coins_in_circulation} color={colors.gold} />
        </Section>

        {dashboard && (
          <Section title={t('admin.dashboard')}>
            <StatRow label={t('admin.newToday')} value={dashboard.users?.new_today ?? 0} color={colors.success} />
            <StatRow label={t('admin.activeWeek')} value={dashboard.users?.active_week ?? 0} color={colors.primary} />
            <StatRow label={t('admin.earnedToday')} value={dashboard.economy?.earned_today ?? 0} color={colors.gold} />
            <StatRow label={t('admin.spentToday')} value={dashboard.economy?.spent_today ?? 0} color={colors.primary} />
            <StatRow label={t('admin.purchasesTotal')} value={dashboard.economy?.purchases_total ?? 0} />
            {(dashboard.campaigns_by_type || []).map((c) => (
              <StatRow key={c.task_type} label={`${t('admin.type_' + c.task_type)}`} value={`${c.active} · ${c.remaining_slots} ${t('admin.slotsLeft')}`} color={colors.textPrimary} />
            ))}
          </Section>
        )}

        {settings && (
          <Section title={t('admin.dailyLimits')}>
            <SettingRow label={t('admin.regularUsers')} value={settings.daily_limit_user} onSave={(v) => updateSetting('daily_limit_user', v)} hint={t('admin.tasksPerDay')} />
            <SettingRow label={t('admin.premiumUsersLimit')} value={settings.daily_limit_premium} onSave={(v) => updateSetting('daily_limit_premium', v)} hint={t('admin.tasksPerDayPremium')} />
          </Section>
        )}

        {settings && (
          <Section title={t('admin.coinsPerTask')}>
            <SettingRow label={t('admin.subscribe')} value={settings.coins_subscribe} onSave={(v) => updateSetting('coins_subscribe', v)} hint={t('admin.verifiedByApi')} />
            <SettingRow label={t('admin.like')} value={settings.coins_like} onSave={(v) => updateSetting('coins_like', v)} hint={t('admin.verifiedByApi')} />
            <SettingRow label={t('admin.commentBonus')} value={settings.comment_bonus} onSave={(v) => updateSetting('comment_bonus', v)} hint={t('admin.extraCoinsIfComment')} />
            <SettingRow label={t('admin.watchVideo')} value={settings.coins_watch} onSave={(v) => updateSetting('coins_watch', v)} hint={t('admin.timerBased')} />
            {/* Economy redesign (2026-07-11): Like+Comment and Sub+Like rewards are now
                DERIVED (sum of atoms) — no longer independently admin-settable, so their
                inputs were removed (backend allow-list drops coins_like_comment/coins_subscribe_like). */}
          </Section>
        )}

        {settings && (
          <Section title={t('admin.campaignEconomy')}>
            {/* House margin is now a % (was flat coins) — owner cost = ceil(earn × (1 + margin/100)).
                Stored server-side as a 0-1 fraction (margin_pct); shown/edited here as a whole percent. */}
            <SettingRow
              label={t('admin.marginPct')}
              value={Math.round((settings.margin_pct ?? 0.25) * 100)}
              onSave={(v) => updateSetting('margin_pct', Math.max(0, v) / 100)}
              hint={t('admin.marginPctHint')}
            />
            <SettingRow label={t('admin.maxActiveCampaigns')} value={settings.max_campaigns_per_user} onSave={(v) => updateSetting('max_campaigns_per_user', v)} hint={t('admin.maxActiveHint')} />
            <SettingRow label={t('admin.completionDelay')} value={settings.completion_delay_seconds} onSave={(v) => updateSetting('completion_delay_seconds', v)} hint={t('admin.completionDelayHint')} />
            <SettingRow label={t('admin.maxWatchPerDay')} value={settings.max_watch_per_day ?? 100} onSave={(v) => updateSetting('max_watch_per_day', v)} hint={t('admin.maxWatchPerDayHint')} />
          </Section>
        )}

        {settings && (
          <Section title={t('admin.taskTypeControls')}>
            {TASK_TYPE_KEYS.map((type) => {
              const enabled = !(settings.disabled_task_types || []).includes(type);
              return (
                <View key={type} style={styles.settingRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.settingLabel}>{t('admin.type_' + type)}</Text>
                    <Text style={[styles.settingHint, { color: enabled ? colors.success : colors.danger }]}>
                      {enabled ? t('admin.typeEnabled') : t('admin.typeDisabled')}
                    </Text>
                  </View>
                  <Switch value={enabled} onValueChange={() => toggleType(type)} trackColor={{ false: colors.danger, true: colors.success }} thumbColor="#fff" />
                </View>
              );
            })}
          </Section>
        )}

        {settings && (
          <Section title={t('admin.dailyCapByType')}>
            {TASK_TYPE_KEYS.map((type) => (
              <SettingRow key={type} label={t('admin.type_' + type)} value={(settings.daily_cap_by_type || {})[type] || 0} onSave={(v) => setCap(type, v)} hint={t('admin.capHint')} />
            ))}
          </Section>
        )}

        {settings && (
          <Section title={t('admin.maintenance')}>
            <View style={styles.userActionRow}>
              <TextInput
                style={[styles.userActionInput, { minHeight: 60, textAlignVertical: 'top' }]}
                placeholder={t('admin.maintenancePlaceholder')}
                placeholderTextColor={colors.textMuted}
                value={maintenanceDraft}
                onChangeText={setMaintenanceDraft}
                multiline
              />
              <TouchableOpacity style={styles.actionBtn} onPress={() => updateSetting('maintenance_message', maintenanceDraft.trim())}>
                <Text style={styles.actionBtnText}>{t('admin.saveMaintenance')}</Text>
              </TouchableOpacity>
            </View>
          </Section>
        )}

        {settings && (
          <Section title="🔔 Announcement popup">
            <View style={styles.userActionRow}>
              <TextInput
                style={[styles.userActionInput, { minHeight: 60, textAlignVertical: 'top' }]}
                placeholder="Shown once when a user opens the app (empty = none)"
                placeholderTextColor={colors.textMuted}
                value={annMsg} onChangeText={setAnnMsg} multiline
              />
              <TextInput
                style={styles.userActionInput}
                placeholder="Optional link (https://…)"
                placeholderTextColor={colors.textMuted}
                value={annLink} onChangeText={setAnnLink} autoCapitalize="none" keyboardType="url"
              />
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {['both', 'web', 'mobile'].map((p) => (
                  <TouchableOpacity key={p} onPress={() => setAnnPlatform(p)} style={[styles.platChip, annPlatform === p && styles.platChipActive]}>
                    <Text style={[styles.platChipText, annPlatform === p && { color: '#fff' }]}>{p === 'both' ? '📱+🌐 Both' : p === 'web' ? '🌐 Web' : '📱 Mobile'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={styles.actionBtn} onPress={saveAnnouncement}>
                <Text style={styles.actionBtnText}>Save announcement</Text>
              </TouchableOpacity>
            </View>
          </Section>
        )}

        <Section title={t('admin.userManagement')}>
          <View style={styles.userActionRow}>
            <TextInput
              style={styles.userActionInput}
              placeholder={t('admin.emailPlaceholder')}
              placeholderTextColor={colors.textMuted}
              value={promoteEmail}
              onChangeText={setPromoteEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TouchableOpacity style={styles.actionBtn} onPress={promoteUser}>
              <Text style={styles.actionBtnText}>{t('admin.grantPremium')}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.userActionRow}>
            <TextInput
              style={styles.userActionInput}
              placeholder={t('admin.emailPlaceholder')}
              placeholderTextColor={colors.textMuted}
              value={demoteEmail}
              onChangeText={setDemoteEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={demoteUser}>
              <Text style={styles.actionBtnText}>{t('admin.removePremium')}</Text>
            </TouchableOpacity>
          </View>
        </Section>

        <Section title="Find user · adjust coins">
          <View style={styles.userActionRow}>
            <TextInput
              style={styles.userActionInput}
              placeholder="Search email or name…"
              placeholderTextColor={colors.textMuted}
              value={userQuery} onChangeText={setUserQuery} autoCapitalize="none"
            />
            <TouchableOpacity style={styles.actionBtn} onPress={searchUsers}>
              <Text style={styles.actionBtnText}>Search</Text>
            </TouchableOpacity>
          </View>
          {userResults.map((u) => (
            <View key={u.id} style={styles.userCard}>
              <Text style={styles.settingLabel}>{u.name || u.email}</Text>
              <Text style={styles.settingHint}>{u.email} · {u.role} · 🪙{u.coins}{u.is_banned ? ' · ⛔' : ''}</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, alignItems: 'center' }}>
                <TextInput
                  style={[styles.userActionInput, { flex: 1 }]}
                  placeholder="± coins"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numbers-and-punctuation"
                  value={coinDrafts[u.id] || ''}
                  onChangeText={(v) => setCoinDrafts((prev) => ({ ...prev, [u.id]: v }))}
                />
                <TouchableOpacity style={[styles.actionBtn, { paddingHorizontal: 18 }]} onPress={() => addCoins(u.email, u.id)}>
                  <Text style={styles.actionBtnText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </Section>
      </ScrollView>
      <ThemeToggle style={{ position: 'absolute', top: 12, right: 14, zIndex: 20 }} />
    </SafeAreaView>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: 80 },
  title: { fontSize: 26, fontWeight: '800', color: colors.textPrimary },
  savingText: { fontSize: 12, color: colors.primary, textAlign: 'center' },
  section: { gap: spacing.sm },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  sectionCard: { backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  modeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
  modeStatus: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  statLabel: { fontSize: 14, color: colors.textSecondary },
  statValue: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  settingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing.sm },
  settingLabel: { fontSize: 14, color: colors.textPrimary, fontWeight: '600' },
  settingHint: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  editInput: { backgroundColor: colors.bgInput, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 6, color: colors.textPrimary, fontSize: 15, fontWeight: '700', width: 70, borderWidth: 1, borderColor: colors.primary, textAlign: 'center' },
  saveBtn: { backgroundColor: colors.success, borderRadius: radius.sm, padding: 8 },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  cancelBtn: { backgroundColor: colors.bgElevated, borderRadius: radius.sm, padding: 8 },
  cancelBtnText: { color: colors.textMuted, fontWeight: '800', fontSize: 14 },
  valueBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.bgElevated, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.sm },
  valueText: { fontSize: 16, fontWeight: '800', color: colors.primary },
  editIcon: { fontSize: 12 },
  userActionRow: { gap: spacing.sm, margin: spacing.sm },
  userActionInput: { backgroundColor: colors.bgInput, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 10, color: colors.textPrimary, fontSize: 14, borderWidth: 1, borderColor: colors.border },
  actionBtn: { backgroundColor: colors.primaryGlow, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.primary },
  actionBtnDanger: { backgroundColor: 'rgba(239,71,111,0.1)', borderColor: colors.danger },
  actionBtnText: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  platChip: { flex: 1, paddingVertical: 8, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, alignItems: 'center', backgroundColor: colors.bgElevated },
  platChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  platChipText: { fontSize: 12, fontWeight: '700', color: colors.textPrimary },
  userCard: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
});

export default AdminScreen;
