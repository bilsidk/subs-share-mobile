import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Dimensions, Animated, StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { spacing, radius } from '../theme';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { useTranslation } from '../hooks/useTranslation';
import { ONBOARDING_KEY } from '../utils/constants';

const { width } = Dimensions.get('window');

const ACCENTS = ['#7B72FF', '#F5C451', '#06D6A0', '#7B72FF'];

const OnboardingScreen = ({ onDone }) => {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const data = [
    { id: '1', visual: 'loop',     title: t('onboarding.slide1.title'), subtitle: t('onboarding.slide1.subtitle'), accent: ACCENTS[0] },
    { id: '2', visual: 'earn',     title: t('onboarding.slide2.title'), subtitle: t('onboarding.slide2.subtitle'), accent: ACCENTS[1] },
    { id: '3', visual: 'campaign', title: t('onboarding.slide3.title'), subtitle: t('onboarding.slide3.subtitle'), accent: ACCENTS[2] },
    { id: '4', visual: 'start',    title: t('onboarding.slide4.title'), subtitle: t('onboarding.slide4.subtitle'), accent: ACCENTS[3], isLast: true },
  ];

  const goNext = () => {
    if (currentIndex < data.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else { handleDone(); }
  };
  const handleDone = async () => {
    try { await AsyncStorage.setItem(ONBOARDING_KEY, 'true'); } catch (_) {}
    onDone();
  };

  // ── mini mockups (composed views, no image assets) ─────────────────────────
  const Visual = ({ kind, accent }) => {
    if (kind === 'loop') {
      return (
        <View style={styles.loopRow}>
          <View style={styles.loopNode}><Text style={styles.loopEmoji}>👤</Text><Text style={styles.loopLabel}>{t('onboarding.you')}</Text></View>
          <View style={styles.loopArrows}>
            <Text style={[styles.loopArrow, { color: ACCENTS[1] }]}>🪙 →</Text>
            <Text style={[styles.loopArrow, { color: ACCENTS[2] }]}>← 🔔</Text>
          </View>
          <View style={styles.loopNode}><Text style={styles.loopEmoji}>📺</Text><Text style={styles.loopLabel}>{t('onboarding.creators')}</Text></View>
        </View>
      );
    }
    if (kind === 'earn') {
      return (
        <View style={styles.mockCard}>
          <View style={[styles.mockAvatar, { backgroundColor: accent + '33' }]}><Text style={{ fontSize: 20 }}>📺</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.mockName}>{t('onboarding.mockChannel')}</Text>
            <Text style={styles.mockMeta}>{t('taskTypes.subscribe')} · 30 {t('earn.slotsLeft')}</Text>
          </View>
          <View style={[styles.mockReward, { backgroundColor: ACCENTS[1] + '22' }]}><Text style={[styles.mockRewardText, { color: ACCENTS[1] }]}>+12 🪙</Text></View>
        </View>
      );
    }
    if (kind === 'campaign') {
      return (
        <View style={styles.mockCard2}>
          <View style={styles.mockRowBetween}>
            <Text style={styles.mockName}>🔔 {t('taskTypes.subscribe')}</Text>
            <Text style={[styles.mockBadge, { color: ACCENTS[2] }]}>{t('onboarding.mockActive')}</Text>
          </View>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: '45%', backgroundColor: ACCENTS[2] }]} /></View>
          <Text style={styles.mockMeta}>13 / 30 · {t('boost.myCampaigns')}</Text>
        </View>
      );
    }
    // start
    return (
      <View style={styles.startWrap}>
        <View style={[styles.startPill, { borderColor: ACCENTS[1] + '55' }]}><Text style={styles.startPillText}>🪙 +50</Text></View>
        <View style={[styles.startPill, { borderColor: ACCENTS[0] + '55' }]}><Text style={styles.startPillText}>🎁 +150</Text></View>
      </View>
    );
  };

  const renderSlide = ({ item }) => (
    <View style={[styles.slide, { width }]}>
      <View style={[styles.stage, { borderColor: item.accent + '33' }]}>
        <Visual kind={item.visual} accent={item.accent} />
      </View>
      <Text style={[styles.title, { color: item.accent }]}>{item.title}</Text>
      <Text style={styles.subtitle}>{item.subtitle}</Text>
    </View>
  );

  const current = data[currentIndex];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent />
      <TouchableOpacity style={styles.skip} onPress={handleDone}><Text style={styles.skipText}>{t('onboarding.skip')}</Text></TouchableOpacity>

      <Animated.FlatList
        ref={flatListRef}
        data={data}
        renderItem={renderSlide}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        onScrollToIndexFailed={() => {}}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
      />

      <View style={styles.dots}>
        {data.map((_, i) => {
          const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
          const dotWidth = scrollX.interpolate({ inputRange, outputRange: [8, 24, 8], extrapolate: 'clamp' });
          const opacity = scrollX.interpolate({ inputRange, outputRange: [0.3, 1, 0.3], extrapolate: 'clamp' });
          return <Animated.View key={i} style={[styles.dot, { width: dotWidth, opacity, backgroundColor: current.accent }]} />;
        })}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={[styles.btn, { backgroundColor: current.accent }]} onPress={goNext} activeOpacity={0.85}>
          <Text style={styles.btnText}>{current.isLast ? t('onboarding.getStarted') : t('onboarding.next')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: '#07070D', alignItems: 'center' },
  skip: { position: 'absolute', top: 52, right: 24, zIndex: 10, padding: 8 },
  skipText: { fontSize: 14, color: colors.textMuted, fontWeight: '500' },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingTop: 60 },
  stage: { width: '100%', minHeight: 180, borderRadius: 28, borderWidth: 1.5, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center', padding: 20, marginBottom: 36 },
  title: { fontSize: 28, fontWeight: '800', textAlign: 'center', marginBottom: 14, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, color: '#B9B9C6', textAlign: 'center', lineHeight: 24, fontWeight: '300' },

  // loop
  loopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  loopNode: { alignItems: 'center', gap: 6 },
  loopEmoji: { fontSize: 40 },
  loopLabel: { fontSize: 12, color: '#B9B9C6', fontWeight: '600' },
  loopArrows: { alignItems: 'center', gap: 8, flex: 1 },
  loopArrow: { fontSize: 15, fontWeight: '800' },

  // task card mock
  mockCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: 14, width: '100%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  mockAvatar: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  mockName: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  mockMeta: { fontSize: 12, color: '#9A9AA8', marginTop: 2 },
  mockReward: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  mockRewardText: { fontSize: 13, fontWeight: '800' },

  // campaign card mock
  mockCard2: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: 16, width: '100%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 10 },
  mockRowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mockBadge: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  progressTrack: { height: 8, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  progressFill: { height: 8, borderRadius: 99 },

  // start
  startWrap: { flexDirection: 'row', gap: 14 },
  startPill: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 16, borderWidth: 1.5, backgroundColor: 'rgba(255,255,255,0.05)' },
  startPillText: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },

  dots: { flexDirection: 'row', gap: 6, marginBottom: 24 },
  dot: { height: 8, borderRadius: 99 },
  footer: { width: '100%', paddingHorizontal: 24, paddingBottom: 48 },
  btn: { paddingVertical: 18, borderRadius: 16, alignItems: 'center' },
  btnText: { fontSize: 17, fontWeight: '800', color: '#FFFFFF' },
});

export default OnboardingScreen;
