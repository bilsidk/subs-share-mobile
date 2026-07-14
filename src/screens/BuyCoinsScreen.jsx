import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, ActivityIndicator,
} from 'react-native';
import { Alert } from '../components/ThemedAlert';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { spacing, radius } from '../theme';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { useTranslation } from '../hooks/useTranslation';
import { initIAP, endIAP, fetchProducts, buy, attachPurchaseListeners, reconcilePurchases } from '../services/iap';

const BuyCoinsScreen = () => {
  const { user, refreshUser } = useAuth();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [loading, setLoading] = useState(true);
  const [packs, setPacks] = useState([]);        // [{ productId, coins, base, bonus, popular, best, price }]
  const [slotCosts, setSlotCosts] = useState({});
  const [busySku, setBusySku] = useState(null);
  const [error, setError] = useState(null);
  const detachRef = useRef(null);

  const stopBusy = useCallback(() => setBusySku(null), []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        await initIAP();
        // Recover any purchase left unconsumed by a dropped verify / killed app,
        // BEFORE showing packs — credits the user and unblocks stuck checkouts.
        reconcilePurchases({
          onCredited: async (result) => {
            try { await refreshUser(); } catch (_) {}
            if (result && !result.already_credited) {
              Alert.alert(t('buy.successTitle'), t('buy.successMsg', { coins: result?.coins_added ?? '' }));
            }
          },
        });
        // Coin amounts come from the server (single source of truth).
        const pricing = await api.getPricing();
        const coinMap = pricing?.google_products || {};
        const skus = Object.keys(coinMap);
        if (mounted) setSlotCosts(pricing?.slot_costs || {});
        if (!skus.length) { if (mounted) { setError(t('buy.unavailable')); setLoading(false); } return; }

        // Localized prices come from Google Play.
        const products = await fetchProducts(skus);
        const priceBySku = {};
        for (const p of products) priceBySku[p.productId] = p.localizedPrice || p.price;

        const merged = skus
          .map(sku => {
            const info = coinMap[sku] || {};
            return {
              productId: sku,
              coins: info.coins,
              base: info.base ?? info.coins,
              bonus: info.bonus ?? 0,
              popular: !!info.popular,
              best: !!info.best,
              price: priceBySku[sku] || null,
            };
          })
          .filter(p => p.price && p.coins)    // only show packs Play returned a price for
          .sort((a, b) => a.coins - b.coins);

        if (mounted) {
          setPacks(merged);
          if (!merged.length) setError(t('buy.unavailable'));
          setLoading(false);
        }
      } catch (e) {
        if (mounted) { setError(t('buy.unavailable')); setLoading(false); }
      }
    })();

    detachRef.current = attachPurchaseListeners({
      onCredited: async (result) => {
        stopBusy();
        try { await refreshUser(); } catch (_) {}
        if (result?.already_credited) {
          Alert.alert(t('buy.title'), t('buy.alreadyCredited'));
        } else {
          Alert.alert(t('buy.successTitle'), t('buy.successMsg', { coins: result?.coins_added ?? '' }));
        }
      },
      onError: (e) => {
        stopBusy();
        Alert.alert(t('common.error'), (e && e.message) || t('buy.failed'));
      },
    });

    return () => {
      mounted = false;
      if (detachRef.current) detachRef.current();
      endIAP();
    };
  }, []);

  const onBuy = async (sku) => {
    if (busySku) return;
    setBusySku(sku);
    try {
      await buy(sku);
      // Result arrives via the purchase listener (onCredited / onError).
    } catch (e) {
      stopBusy();
      if (e?.code !== 'E_USER_CANCELLED') Alert.alert(t('common.error'), (e && e.message) || t('buy.failed'));
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>{t('buy.yourBalance')}</Text>
          <View style={styles.balanceRow}>
            <Text style={styles.coinEmoji}>🪙</Text>
            <Text style={styles.balanceAmount}>{user?.coins ?? 0}</Text>
          </View>
        </View>

        <Text style={styles.subtitle}>{t('buy.subtitle')}</Text>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
        ) : error ? (
          <View style={styles.errorCard}><Text style={styles.errorText}>{error}</Text></View>
        ) : (
          packs.map((p) => {
            const subCost = slotCosts.subscribe || 15;
            const likeCost = slotCosts.like || 9;
            const subs = Math.floor(p.coins / subCost);
            const likes = Math.floor(p.coins / likeCost);
            return (
              <View key={p.productId} style={[styles.pack, (p.best || p.popular) && styles.packHighlight]}>
                {p.best
                  ? <View style={styles.bestBadge}><Text style={styles.bestBadgeText}>{t('buy.bestValue')}</Text></View>
                  : p.popular
                    ? <View style={styles.popularBadge}><Text style={styles.popularBadgeText}>{t('buy.popular')}</Text></View>
                    : null}
                <View style={{ flex: 1 }}>
                  <Text style={styles.packCoins}>
                    🪙 {p.base.toLocaleString()}
                    {p.bonus > 0 && <Text style={styles.packBonus}>  +{p.bonus.toLocaleString()} {t('buy.bonus')}</Text>}
                  </Text>
                  <Text style={styles.packGets}>{t('buy.getsYou', { subs, likes })}</Text>
                  <Text style={styles.packPrice}>{p.price}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.buyBtn, busySku === p.productId && styles.buyBtnBusy]}
                  onPress={() => onBuy(p.productId)}
                  disabled={!!busySku}
                >
                  {busySku === p.productId
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.buyBtnText}>{t('buy.buy')}</Text>}
                </TouchableOpacity>
              </View>
            );
          })
        )}

        <Text style={styles.disclaimer}>{t('buy.disclaimer')}</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: 80 },
  balanceCard: { backgroundColor: colors.bgCard, borderRadius: radius.xl, padding: spacing.lg, gap: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  balanceLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6 },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  coinEmoji: { fontSize: 30 },
  balanceAmount: { fontSize: 38, fontWeight: '800', color: colors.gold, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs },
  pack: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  packHighlight: { borderColor: colors.primary, borderWidth: 2 },
  bestBadge: { position: 'absolute', top: -10, left: spacing.lg, backgroundColor: colors.gold, paddingHorizontal: 10, paddingVertical: 2, borderRadius: radius.full },
  bestBadgeText: { fontSize: 10, fontWeight: '800', color: '#000' },
  popularBadge: { position: 'absolute', top: -10, left: spacing.lg, backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 2, borderRadius: radius.full },
  popularBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  packCoins: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  packBonus: { fontSize: 14, fontWeight: '800', color: colors.success },
  packGets: { fontSize: 12, color: colors.textSecondary, marginTop: 3 },
  packPrice: { fontSize: 14, color: colors.textMuted, marginTop: 3, fontWeight: '600' },
  buyBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.md, minWidth: 90, alignItems: 'center' },
  buyBtnBusy: { opacity: 0.7 },
  buyBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  errorCard: { backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.lg, alignItems: 'center', borderWidth: 1, borderColor: colors.border, marginTop: spacing.md },
  errorText: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
  disclaimer: { fontSize: 11, color: colors.textMuted, textAlign: 'center', marginTop: spacing.md, lineHeight: 16 },
});

export default BuyCoinsScreen;
