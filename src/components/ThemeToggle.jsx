import React, { useRef, useEffect } from 'react';
import { TouchableOpacity, Animated, StyleSheet, Text } from 'react-native';
import { useTheme } from '../context/ThemeContext';

// Sun/moon pill toggle that matches the app theme. The thumb slides between the
// sun (light) and moon (dark) sides, coloured with the theme's gold/primary.
const ThemeToggle = ({ style }) => {
  const { mode, colors, toggleTheme } = useTheme();
  const isDark = mode === 'dark';
  const anim = useRef(new Animated.Value(isDark ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, { toValue: isDark ? 1 : 0, duration: 200, useNativeDriver: true }).start();
  }, [isDark, anim]);

  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [2, 32] });

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={toggleTheme}
      accessibilityRole="switch"
      accessibilityState={{ checked: isDark }}
      style={[styles.track, { backgroundColor: colors.bgCard, borderColor: colors.border }, style]}
    >
      {/* Faint icon on the inactive side for context */}
      <Text style={[styles.ghost, styles.ghostLeft]}>☀️</Text>
      <Text style={[styles.ghost, styles.ghostRight]}>🌙</Text>
      <Animated.View
        style={[
          styles.thumb,
          { backgroundColor: isDark ? colors.primary : colors.gold, transform: [{ translateX }] },
        ]}
      >
        <Text style={styles.thumbIcon}>{isDark ? '🌙' : '☀️'}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  track: { width: 58, height: 30, borderRadius: 15, borderWidth: 1, justifyContent: 'center' },
  thumb: { position: 'absolute', width: 24, height: 24, borderRadius: 12, top: 2, alignItems: 'center', justifyContent: 'center' },
  thumbIcon: { fontSize: 13 },
  ghost: { position: 'absolute', fontSize: 11, top: 8, opacity: 0.35 },
  ghostLeft: { left: 8 },
  ghostRight: { right: 8 },
});

export default ThemeToggle;
