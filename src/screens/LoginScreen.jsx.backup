import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, SafeAreaView, Image, Linking } from 'react-native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius } from '../theme';
import { GOOGLE_CLIENT_ID, PRIVACY_POLICY_URL } from '../utils/constants';
import { useTranslation } from '../hooks/useTranslation';

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
  const [loading, setLoading] = useState(false);

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
    if (!idToken) { Alert.alert(t('common.error'), t('login.noToken')); return; }
    await signIn({ idToken, serverAuthCode, accessToken });
    } catch (err) {
      if (err.code === statusCodes.SIGN_IN_CANCELLED) {
      } else if (err.code === statusCodes.IN_PROGRESS) {
        Alert.alert(t('login.signInFailed'));
      } else if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert(t('login.signInFailed'));
      } else {
        Alert.alert(t('login.signInFailed'), err.message || t('login.tryAgain'));
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
          <Text style={styles.youtubeNote}>{t('login.youtubeNote')}</Text>
          <Text style={styles.terms}>{t('login.terms')}</Text>
          <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_POLICY_URL).catch(() => {})}>
            <Text style={styles.privacyLink}>{t('common.privacyPolicy')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  youtubeNote: { fontSize: 12, color: '#555570', textAlign: 'center', marginTop: 12, lineHeight: 18, paddingHorizontal: 24 },
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
  googleBtn: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: '#FFFFFF', paddingVertical: spacing.md, borderRadius: radius.md, height: 54 },
  googleBtnLoading: { opacity: 0.8 },
  googleIcon: { fontSize: 18, fontWeight: '800', color: '#4285F4' },
  googleText: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  terms: { fontSize: 12, color: colors.textMuted, textAlign: 'center' },
  privacyLink: { fontSize: 12, color: colors.primary, textAlign: 'center', textDecorationLine: 'underline', marginTop: 6 },
});

export default LoginScreen;
