import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, Alert, RefreshControl, TextInput, Switch,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../services/api';
import { colors, spacing, radius } from '../theme';
import { LoadingSpinner } from '../components';
import { useTranslation } from '../hooks/useTranslation';

const Section = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.sectionCard}>{children}</View>
  </View>
);

const SettingRow = ({ label, value, onSave, hint }) => {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const handleSave = () => {
    const num = parseInt(draft, 10);
    if (isNaN(num) || num < 0) { Alert.alert(t('common.error'), 'Enter a valid number'); return; }
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

const StatRow = ({ label, value, color }) => (
  <View style={styles.statRow}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={[styles.statValue, color && { color }]}>{value}</Text>
  </View>
);

const AdminScreen = () => {
  const { t } = useTranslation();
  const [status, setStatus] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [promoteEmail, setPromoteEmail] = useState('');
  const [demoteEmail, setDemoteEmail] = useState('');

  const loadData = async () => {
    try { const data = await api.getAdminStatus(); setStatus(data); setSettings(data.settings); }
    catch (e) { Alert.alert(t('common.error'), e.message); }
    finally { setLoading(false); setRefreshing(false); }
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
      `Switch to ${newMode}?`,
      newMode === 'degraded' ? 'This disables YouTube API verification. All tasks fall back to honor mode.' : 'This re-enables YouTube API verification.',
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.confirm'), onPress: async () => { try { await api.setAdminMode(newMode); setStatus(prev => ({ ...prev, api_mode: newMode })); } catch (e) { Alert.alert(t('common.error'), e.message); } } },
      ]
    );
  };

  const promoteUser = async () => {
    const email = promoteEmail.trim();
    if (!email) return Alert.alert(t('common.error'), 'Enter an email address');
    try { await api.promoteUser(email, 'premium'); Alert.alert('✅ Done', `${email} is now premium`); setPromoteEmail(''); }
    catch (e) { Alert.alert(t('common.error'), e.message); }
  };

  const demoteUser = async () => {
    const email = demoteEmail.trim();
    if (!email) return Alert.alert(t('common.error'), 'Enter an email address');
    try { await api.promoteUser(email, 'user'); Alert.alert('✅ Done', `${email} is now a regular user`); setDemoteEmail(''); }
    catch (e) { Alert.alert(t('common.error'), e.message); }
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
        <Text style={styles.title}>⚙️ Admin Panel</Text>
        {saving && <Text style={styles.savingText}>Saving...</Text>}

        <Section title="🔌 API Mode">
          <View style={styles.modeRow}>
            <View>
              <Text style={styles.settingLabel}>YouTube Verification</Text>
              <Text style={[styles.modeStatus, { color: isLive ? colors.success : colors.danger }]}>
                {isLive ? '✅ Live — API active' : '⚠️ Degraded — honor mode'}
              </Text>
              {status?.degraded_reason && <Text style={styles.settingHint}>{status.degraded_reason}</Text>}
            </View>
            <Switch value={isLive} onValueChange={toggleMode} trackColor={{ false: colors.danger, true: colors.success }} thumbColor="#fff" />
          </View>
        </Section>

        <Section title="📊 Live Stats">
          <StatRow label="Total Users" value={stats.users} />
          <StatRow label="Premium Users" value={stats.premium_users} color={colors.gold} />
          <StatRow label="Banned Users" value={stats.banned_users} color={colors.danger} />
          <StatRow label="Active Campaigns" value={stats.active_tasks} color={colors.primary} />
          <StatRow label="Verified Completions" value={stats.verified_completions} color={colors.success} />
          <StatRow label="Pending Completions" value={stats.pending_completions} color={colors.warning} />
          <StatRow label="Reclaimed Completions" value={stats.reclaimed_completions} color={colors.danger} />
          <StatRow label="Total Coins in Circulation" value={stats.total_coins_in_circulation} color={colors.gold} />
        </Section>

        {settings && (
          <Section title="📅 Daily Task Limits">
            <SettingRow label="Regular Users" value={settings.daily_limit_user} onSave={(v) => updateSetting('daily_limit_user', v)} hint="Tasks per day for regular users" />
            <SettingRow label="Premium Users" value={settings.daily_limit_premium} onSave={(v) => updateSetting('daily_limit_premium', v)} hint="Tasks per day for premium users" />
          </Section>
        )}

        {settings && (
          <Section title="🪙 Coins Per Task">
            <SettingRow label="Subscribe" value={settings.coins_subscribe} onSave={(v) => updateSetting('coins_subscribe', v)} hint="Fully verified by YouTube API" />
            <SettingRow label="Like" value={settings.coins_like} onSave={(v) => updateSetting('coins_like', v)} hint="Fully verified by YouTube API" />
            <SettingRow label="Like + Comment (base)" value={settings.coins_like_comment} onSave={(v) => updateSetting('coins_like_comment', v)} hint="Like is required, comment gives bonus" />
            <SettingRow label="Comment Bonus" value={settings.comment_bonus} onSave={(v) => updateSetting('comment_bonus', v)} hint="Extra coins if comment is detected" />
            <SettingRow label="Subscribe + Like" value={settings.coins_subscribe_like} onSave={(v) => updateSetting('coins_subscribe_like', v)} hint="Both verified by YouTube API" />
            <SettingRow label="Watch Video" value={settings.coins_watch} onSave={(v) => updateSetting('coins_watch', v)} hint="Timer-based, honor system" />
          </Section>
        )}

        {settings && (
          <Section title="💸 Campaign Economy">
            <SettingRow label="House Margin" value={settings.house_margin ?? 3} onSave={(v) => updateSetting('house_margin', v)} hint="Extra coins added on top of earner reward — owner pays reward + margin" />
            <SettingRow label="Max Active Campaigns" value={settings.max_campaigns_per_user} onSave={(v) => updateSetting('max_campaigns_per_user', v)} hint="Max simultaneous campaigns per regular user" />
            <SettingRow label="Completion Delay (seconds)" value={settings.completion_delay_seconds} onSave={(v) => updateSetting('completion_delay_seconds', v)} hint="How long users must wait before claiming" />
          </Section>
        )}

        <Section title="👥 User Management">
          <View style={styles.userActionRow}>
            <TextInput
              style={styles.userActionInput}
              placeholder="email@example.com"
              placeholderTextColor={colors.textMuted}
              value={promoteEmail}
              onChangeText={setPromoteEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TouchableOpacity style={styles.actionBtn} onPress={promoteUser}>
              <Text style={styles.actionBtnText}>💎 Grant Premium</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.userActionRow}>
            <TextInput
              style={styles.userActionInput}
              placeholder="email@example.com"
              placeholderTextColor={colors.textMuted}
              value={demoteEmail}
              onChangeText={setDemoteEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={demoteUser}>
              <Text style={styles.actionBtnText}>⬇️ Remove Premium</Text>
            </TouchableOpacity>
          </View>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
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
});

export default AdminScreen;
