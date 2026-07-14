import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, Share, ActivityIndicator,
} from 'react-native';
import { api } from '../services/api';
import { spacing, radius } from '../theme';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { useTranslation } from '../hooks/useTranslation';

const ReferralScreen = () => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation();
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    api.getReferral()
      .then((d) => { if (mounted) { setInfo(d); setLoading(false); } })
      .catch(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const code = info?.code || '';
  const referrerBonus = info?.referrer_bonus ?? 150;
  const refereeBonus = info?.referee_bonus ?? 100;

  // Play Store link carrying the referral: after a friend installs from it, the app
  // reads the code via the Install Referrer API and auto-applies it at signup.
  const referralLink = code
    ? `https://play.google.com/store/apps/details?id=com.subsshare&referrer=ref%3D${encodeURIComponent(code)}`
    : '';

  const onShare = async () => {
    if (!code) return;
    try { await Share.share({ message: `${t('referral.shareMessage', { code })}\n${referralLink}` }); } catch (_) {}
  };

  if (loading) {
    return <SafeAreaView style={styles.safe}><ActivityIndicator color={colors.primary} style={{ marginTop: 48 }} /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.emoji}>🎁</Text>
        <Text style={styles.title}>{t('referral.title')}</Text>
        <Text style={styles.subtitle}>{t('referral.subtitle', { referrer: referrerBonus, referee: refereeBonus })}</Text>

        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>{t('referral.yourCode')}</Text>
          <Text style={styles.code}>{code || '—'}</Text>
          {code ? (
            <>
              <Text style={styles.linkLabel}>{t('referral.yourLink')}</Text>
              <Text style={styles.linkText} selectable numberOfLines={2}>{referralLink}</Text>
            </>
          ) : null}
        </View>

        <Text style={styles.condition}>{t('referral.condition')}</Text>

        <TouchableOpacity style={styles.shareBtn} onPress={onShare} activeOpacity={0.85} disabled={!code}>
          <Text style={styles.shareBtnText}>{t('referral.share')}</Text>
        </TouchableOpacity>

        <View style={styles.statsRow}>
          <View style={styles.statTile}>
            <Text style={styles.statValue}>{info?.rewarded ?? 0}</Text>
            <Text style={styles.statLabel}>{t('referral.joined')}</Text>
          </View>
          <View style={styles.statTile}>
            <Text style={styles.statValue}>{info?.pending ?? 0}</Text>
            <Text style={styles.statLabel}>{t('referral.pending')}</Text>
          </View>
          <View style={styles.statTile}>
            <Text style={styles.statValue}>{((info?.rewarded ?? 0) * referrerBonus).toLocaleString()}</Text>
            <Text style={styles.statLabel}>{t('referral.earned')}</Text>
          </View>
        </View>

        <Text style={styles.note}>{t('referral.note')}</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, alignItems: 'center', gap: spacing.md, paddingBottom: 80 },
  emoji: { fontSize: 44, marginTop: spacing.sm },
  title: { fontSize: 22, fontWeight: '800', color: colors.textPrimary, textAlign: 'center' },
  subtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  codeCard: { width: '100%', backgroundColor: colors.bgCard, borderRadius: radius.xl, padding: spacing.lg, alignItems: 'center', borderWidth: 1, borderColor: colors.border, marginTop: spacing.sm },
  codeLabel: { fontSize: 12, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 },
  code: { fontSize: 34, fontWeight: '900', color: colors.gold, letterSpacing: 6 },
  linkLabel: { fontSize: 11, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: spacing.md, marginBottom: 4 },
  linkText: { fontSize: 12, color: colors.primary, textAlign: 'center' },
  shareBtn: { width: '100%', backgroundColor: colors.primary, paddingVertical: spacing.md, borderRadius: radius.md, alignItems: 'center', height: 50, justifyContent: 'center' },
  shareBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  statsRow: { flexDirection: 'row', gap: spacing.sm, width: '100%' },
  statTile: { flex: 1, backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.border },
  statValue: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  statLabel: { fontSize: 11, color: colors.textSecondary },
  note: { fontSize: 12, color: colors.textMuted, textAlign: 'center', lineHeight: 18, marginTop: spacing.sm },
  condition: { fontSize: 12.5, color: colors.gold, textAlign: 'center', lineHeight: 18, backgroundColor: 'rgba(245,196,81,0.1)', borderRadius: radius.md, padding: spacing.sm, alignSelf: 'stretch' },
});

export default ReferralScreen;
