import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Dimensions, Animated, StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, radius } from '../theme';
import { useTranslation } from '../hooks/useTranslation';

const { width, height } = Dimensions.get('window');
const ONBOARDING_KEY = '@subsshare_onboarded';

const slides = (t) => [
  {
    id: '1',
    emoji: '🔄',
    title: t('onboarding.slide1.title'),
    subtitle: t('onboarding.slide1.subtitle'),
    accent: '#6C63FF',
    bg: 'rgba(108,99,255,0.08)',
  },
  {
    id: '2',
    emoji: '🪙',
    title: t('onboarding.slide2.title'),
    subtitle: t('onboarding.slide2.subtitle'),
    accent: '#FFD166',
    bg: 'rgba(255,209,102,0.08)',
  },
  {
    id: '3',
    emoji: '🚀',
    title: t('onboarding.slide3.title'),
    subtitle: t('onboarding.slide3.subtitle'),
    accent: '#06D6A0',
    bg: 'rgba(6,214,160,0.08)',
  },
  {
    id: '4',
    emoji: '🎁',
    title: t('onboarding.slide4.title'),
    subtitle: t('onboarding.slide4.subtitle'),
    accent: '#6C63FF',
    bg: 'rgba(108,99,255,0.08)',
    isLast: true,
  },
];

export const ONBOARDING_KEY_EXPORT = ONBOARDING_KEY;

const OnboardingScreen = ({ onDone }) => {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const data = slides(t);

  const goNext = () => {
    if (currentIndex < data.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      handleDone();
    }
  };

  const handleDone = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    onDone();
  };

  const renderSlide = ({ item }) => (
    <View style={[styles.slide, { width }]}>
      <View style={[styles.iconContainer, { backgroundColor: item.bg, borderColor: item.accent + '44' }]}>
        <Text style={styles.emoji}>{item.emoji}</Text>
      </View>
      <Text style={[styles.title, { color: item.accent }]}>{item.title}</Text>
      <Text style={styles.subtitle}>{item.subtitle}</Text>
    </View>
  );

  const current = data[currentIndex];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#07070D" />

      {/* Skip button */}
      <TouchableOpacity style={styles.skip} onPress={handleDone}>
        <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
      </TouchableOpacity>

      {/* Slides */}
      <Animated.FlatList
        ref={flatListRef}
        data={data}
        renderItem={renderSlide}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
      />

      {/* Dots */}
      <View style={styles.dots}>
        {data.map((_, i) => {
          const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
          const dotWidth = scrollX.interpolate({ inputRange, outputRange: [8, 24, 8], extrapolate: 'clamp' });
          const opacity = scrollX.interpolate({ inputRange, outputRange: [0.3, 1, 0.3], extrapolate: 'clamp' });
          return (
            <Animated.View
              key={i}
              style={[styles.dot, { width: dotWidth, opacity, backgroundColor: current.accent }]}
            />
          );
        })}
      </View>

      {/* Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: current.accent }]}
          onPress={goNext}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>
            {current.isLast ? t('onboarding.getStarted') : t('onboarding.next')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#07070D', alignItems: 'center' },
  skip: { position: 'absolute', top: 52, right: 24, zIndex: 10, padding: 8 },
  skipText: { fontSize: 14, color: '#555570', fontWeight: '500' },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingTop: 60 },
  iconContainer: { width: 140, height: 140, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 40, borderWidth: 1.5 },
  emoji: { fontSize: 64 },
  title: { fontSize: 30, fontWeight: '800', textAlign: 'center', marginBottom: 16, letterSpacing: -0.5 },
  subtitle: { fontSize: 17, color: '#9999BB', textAlign: 'center', lineHeight: 26, fontWeight: '300' },
  dots: { flexDirection: 'row', gap: 6, marginBottom: 24 },
  dot: { height: 8, borderRadius: 99 },
  footer: { width: '100%', paddingHorizontal: 24, paddingBottom: 48 },
  btn: { paddingVertical: 18, borderRadius: 16, alignItems: 'center' },
  btnText: { fontSize: 17, fontWeight: '800', color: '#FFFFFF' },
});

export default OnboardingScreen;
