import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView, Image, Linking, TextInput } from 'react-native';
import { Alert } from '../components/ThemedAlert';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { useAuth } from '../context/AuthContext';
import { spacing, radius } from '../theme';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { GOOGLE_CLIENT_ID, PRIVACY_POLICY_URL } from '../utils/constants';
import { useTranslation } from '../hooks/useTranslation';
import { getReferrerCode } from '../services/installReferrer';

GoogleSignin.configure({
  webClientId: GOOGLE_CLIENT_ID,
  offlineAccess: true,
  scopes: ['https://www.googleapis.com/auth/youtube.readonly'],
  forceCodeForRefreshToken: true,
  accountName: '',
});

const LoginScreen = () => {
  const { signIn } = useAuth();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [loading, setLoading] = useState(false);
  const [referralCode, setReferralCode] = useState('');

  // If the app was installed from a referral link (Play Store &referrer=), auto-fill
  // the code so the user doesn't type it. Only pre-fills when the field is empty.
  useEffect(() => {
    let active = true;
    getReferrerCode().then((code) => {
      if (active && code) setReferralCode((prev) => prev || code);
    });
    return () => { active = false; };
  }, []);

 const handleGoogleSignIn = async () => {
  setLoading(true);
  try {
    await GoogleSignin.hasPlayServices();
    
    // Revoke AND sign out to force fresh consent with YouTube scope
    try { await GoogleSignin.revokeAccess(); } catch (_) {}
    
    const userInfo = await GoogleSignin.signIn();
    const data = userInfo.data || userInfo;
    const idToken = data.idToken;
    const serverAuthCode = data.serverAuthCode;

    let accessToken = null;
    try { const tokens = await GoogleSignin.getTokens(); accessToken = tokens.accessToken; } catch (_) {}
    // Missing idToken here almost always means the user un-ticked the YouTube
    // permission on Google's consent screen. Tell them exactly how to fix it.
    if (!idToken) { Alert.alert(t('login.permissionTitle'), t('login.noToken')); return; }
    await signIn({ idToken, serverAuthCode, accessToken, referralCode: referralCode.trim().toUpperCase() || undefined });
    } catch (err) {
      const msg = String(err?.message || '');
      if (err.code === statusCodes.SIGN_IN_CANCELLED) {
        // User backed out of the Google sheet — not an error, show nothing.
      } else if (err.code === 'NO_YOUTUBE_ACCESS' || err.data?.code === 'NO_YOUTUBE_ACCESS' || /youtube/i.test(msg)) {
        // Backend couldn't get YouTube access — the permission box was left unchecked.
        Alert.alert(t('login.permissionTitle'), t('login.noToken'));
      } else if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert(t('login.playServicesTitle'), t('login.playServicesMsg'));
      } else if (err.code === statusCodes.IN_PROGRESS) {
        Alert.alert(t('login.signInFailed'), t('login.inProgressMsg'));
      } else if (/network|timed out|timeout|connection|unreachable|failed to fetch/i.test(msg)) {
        Alert.alert(t('login.networkTitle'), t('login.networkMsg'));
      } else if (err.code === 'DEVELOPER_ERROR' || /12500|developer_error/i.test(msg)) {
        Alert.alert(t('login.signInFailed'), t('login.configMsg'));
      } else {
        Alert.alert(t('login.signInFailed'), t('login.genericMsg'));
      }
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { emoji: '🪙', text: t('login.feature1') },
    { emoji: '✅', text: t('login.feature2') },
    { emoji: '📈', text: t('login.feature3') },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.hero}>
         <View style={styles.logoRing}>
  <Image source={require('../assets/icon.png')} style={{ width: 64, height: 64 }} resizeMode="contain" />
</View>
          <Text style={styles.title}>{t('login.title')}</Text>
          <Text style={styles.tagline}>{t('login.tagline')}</Text>
        </View>

        <View style={styles.features}>
          {features.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Text style={styles.featureEmoji}>{f.emoji}</Text>
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.welcomeBonus}>{t('login.welcomeBonus')}</Text>
          <TextInput
            style={styles.referralInput}
            value={referralCode}
            onChangeText={(v) => setReferralCode(v.toUpperCase())}
            placeholder={t('login.referralPlaceholder')}
            placeholderTextColor={colors.textMuted}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={12}
            editable={!loading}
          />
          <TouchableOpacity
            style={[styles.googleBtn, loading && styles.googleBtnLoading]}
            onPress={handleGoogleSignIn}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? <ActivityIndicator color={colors.bg} /> : (
              <>
                <Text style={styles.googleIcon}>G</Text>
                <Text style={styles.googleText}>{t('login.continueWithGoogle')}</Text>
              </>
            )}
          </TouchableOpacity>
          <Text style={styles.terms}>{t('login.terms')}</Text>
          <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_POLICY_URL).catch(() => {})}>
            <Text style={styles.privacyLink}>{t('common.privacyPolicy')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, paddingHorizontal: spacing.xl, justifyContent: 'space-between', paddingVertical: spacing.xl },
  hero: { alignItems: 'center', gap: spacing.md, paddingTop: spacing.xl },
  logoRing: { width: 96, height: 96, borderRadius: 28, backgroundColor: 'rgba(108,99,255,0.2)', borderWidth: 1.5, borderColor: '#6C63FF', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  logoEmoji: { fontSize: 48 },
  title: { fontSize: 40, fontWeight: '800', color: colors.textPrimary, letterSpacing: -1.5 },
  tagline: { fontSize: 18, color: colors.textSecondary, textAlign: 'center', lineHeight: 28 },
  features: { gap: spacing.md, backgroundColor: colors.bgCard, borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  featureEmoji: { fontSize: 24, width: 36 },
  featureText: { fontSize: 15, color: colors.textSecondary, flex: 1, lineHeight: 22 },
  footer: { gap: spacing.md, alignItems: 'center' },
  welcomeBonus: { fontSize: 14, color: colors.gold, fontWeight: '600', backgroundColor: 'rgba(255,209,102,0.1)', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full, borderWidth: 1, borderColor: 'rgba(255,209,102,0.25)' },
  referralInput: { width: '100%', backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, color: colors.textPrimary, fontSize: 14, textAlign: 'center', letterSpacing: 2 },
  googleBtn: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: '#FFFFFF', paddingVertical: spacing.md, borderRadius: radius.md, height: 54 },
  googleBtnLoading: { opacity: 0.8 },
  googleIcon: { fontSize: 18, fontWeight: '800', color: '#4285F4' },
  googleText: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  terms: { fontSize: 12, color: colors.textMuted, textAlign: 'center' },
  privacyLink: { fontSize: 12, color: colors.primary, textAlign: 'center', textDecorationLine: 'underline', marginTop: 6 },
});

export default LoginScreen;
