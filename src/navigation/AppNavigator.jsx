import React, { useState, useEffect } from 'react';
import LanguageScreen from '../screens/LanguageScreen';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';
import { useTranslation } from '../hooks/useTranslation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ONBOARDING_KEY } from '../utils/constants';

// Screens
import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import EarnScreen from '../screens/EarnScreen';
import GetSubscribersScreen from '../screens/GetSubscribersScreen';
import ProfileScreen from '../screens/ProfileScreen';
import MyCampaignsScreen from '../screens/MyCampaignsScreen';
import AdminScreen from '../screens/AdminScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import BuyCoinsScreen from '../screens/BuyCoinsScreen';
import ReferralScreen from '../screens/ReferralScreen';
import WatchPlayerScreen from '../screens/WatchPlayerScreen';
import ThemeToggle from '../components/ThemeToggle';

// Shown in the header of every stack screen so the theme toggle is reachable everywhere.
const headerThemeToggle = () => <ThemeToggle style={{ marginRight: 6 }} />;

const Stack = createNativeStackNavigator();
// Material top-tabs (positioned at the bottom) so users can SWIPE left/right
// between tabs — the bottom-tab navigator has no swipe support.
const Tab = createMaterialTopTabNavigator();

const TAB_META = {
  Home:    { emoji: '🏠', key: 'tabs.home' },
  Earn:    { emoji: '🪙', key: 'tabs.earn' },
  GetSubs: { emoji: '🚀', key: 'tabs.boost' },
  Profile: { emoji: '👤', key: 'tabs.profile' },
  Admin:   { emoji: '⚙️', key: 'tabs.admin' },
};

const TabIcon = ({ label, emoji, focused }) => {
  const [fontSize, setFontSize] = useState(10);
  return (
    <View style={styles.tabItem}>
      <Text style={[styles.tabEmoji, focused && styles.tabEmojiActive]}>{emoji}</Text>
      <Text
        style={[styles.tabLabel, focused && styles.tabLabelActive, { fontSize }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.5}
        onLayout={(e) => {
          const charCount = label.length;
          if (charCount > 8) setFontSize(8);
          else if (charCount > 6) setFontSize(9);
          else setFontSize(10);
        }}
      >
        {label}
      </Text>
    </View>
  );
};

// Custom bottom bar for the swipeable top-tab navigator. Keeps the app's styled
// icons and respects the device bottom inset so it never sits under the system nav.
const BottomTabBar = ({ state, navigation }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.tabBar, { height: 64 + insets.bottom, paddingBottom: Math.max(insets.bottom, 8) }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const meta = TAB_META[route.name] || { emoji: '•', key: route.name };
        const onPress = () => { if (!focused) navigation.navigate(route.name); };
        return (
          <TouchableOpacity key={route.key} style={styles.tabTouch} activeOpacity={0.7} onPress={onPress}>
            <TabIcon label={t(meta.key)} emoji={meta.emoji} focused={focused} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const TabNavigator = ({ isOwner }) => (
  <Tab.Navigator
    tabBarPosition="bottom"
    tabBar={(props) => <BottomTabBar {...props} />}
    // Swipe left/right to move between tabs; stops at the first/last tab (no wrap).
    screenOptions={{ swipeEnabled: true, lazy: true, animationEnabled: true }}
  >
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="Earn" component={EarnScreen} />
    <Tab.Screen name="GetSubs" component={GetSubscribersScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
    {isOwner && <Tab.Screen name="Admin" component={AdminScreen} />}
  </Tab.Navigator>
);

const MainStack = ({ isOwner }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Android 15+/targetSdk 36 forces EDGE-TO-EDGE — content draws under the status bar
          / camera cutout. The tab screens have no native header, and their `SafeAreaView`
          is imported from 'react-native' (a NO-OP on Android), so pad the top ONCE here by
          the real status-bar inset. Fixes the banner/header bleed on every tab screen. */}
      <Stack.Screen name="Tabs">{() => (
        <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: colors.bg }}>
          <TabNavigator isOwner={isOwner} />
        </View>
      )}</Stack.Screen>
      <Stack.Screen
        name="MyCampaigns"
        component={MyCampaignsScreen}
        options={{ headerShown: true, headerTitle: t('campaigns.title'), headerStyle: { backgroundColor: colors.bgCard }, headerTintColor: colors.textPrimary, headerTitleStyle: { fontWeight: '800' }, headerRight: headerThemeToggle }}
      />
      <Stack.Screen
        name="Language"
        component={LanguageScreen}
        options={{ headerShown: true, headerTitle: t('language.title'), headerStyle: { backgroundColor: colors.bgCard }, headerTintColor: colors.textPrimary, headerTitleStyle: { fontWeight: '800' }, headerRight: headerThemeToggle }}
      />
      <Stack.Screen
        name="BuyCoins"
        component={BuyCoinsScreen}
        options={{ headerShown: true, headerTitle: t('buy.title'), headerStyle: { backgroundColor: colors.bgCard }, headerTintColor: colors.textPrimary, headerTitleStyle: { fontWeight: '800' }, headerRight: headerThemeToggle }}
      />
      <Stack.Screen
        name="Referral"
        component={ReferralScreen}
        options={{ headerShown: true, headerTitle: t('referral.title'), headerStyle: { backgroundColor: colors.bgCard }, headerTintColor: colors.textPrimary, headerTitleStyle: { fontWeight: '800' }, headerRight: headerThemeToggle }}
      />
      <Stack.Screen
        name="WatchPlayer"
        component={WatchPlayerScreen}
        options={{ headerShown: false, animation: 'slide_from_bottom' }}
      />
    </Stack.Navigator>
  );
};

const AuthNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
  </Stack.Navigator>
);

export const AppNavigator = () => {
  const { user, loading } = useAuth();
  const [onboarded, setOnboarded] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then(val => {
      setOnboarded(val === 'true');
    });
  }, []);

  if (loading || onboarded === null) return <SplashScreen />;

  // Show onboarding for first-time users before auth
  if (!onboarded) {
    return (
      <OnboardingScreen onDone={() => setOnboarded(true)} />
    );
  }

  const isOwner = user?.role === 'owner';

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <Stack.Screen name="Main">{() => <MainStack isOwner={isOwner} />}</Stack.Screen>
      ) : (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      )}
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: { flexDirection: 'row', backgroundColor: colors.bgCard, borderTopColor: colors.border, borderTopWidth: 1, height: 72, paddingBottom: 8, paddingTop: 8 },
  tabTouch: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabItem: { alignItems: 'center', justifyContent: 'center', gap: 2, width: 60 },
  tabEmoji: { fontSize: 22, opacity: 0.4 },
  tabEmojiActive: { opacity: 1 },
  tabLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '500' },
  tabLabelActive: { color: colors.primary, fontWeight: '700' },
});
