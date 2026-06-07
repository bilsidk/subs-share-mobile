import React, { useState, useEffect } from 'react';
import LanguageScreen from '../screens/LanguageScreen';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';
import { useTranslation } from '../hooks/useTranslation';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const OWNER_EMAIL = 'bilsidk@gmail.com';
const ONBOARDING_KEY = '@subsshare_onboarded';

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

const TabNavigator = ({ isOwner }) => {
  const { t } = useTranslation();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon label={t('tabs.home')} emoji="🏠" focused={focused} /> }} />
      <Tab.Screen name="Earn" component={EarnScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon label={t('tabs.earn')} emoji="🪙" focused={focused} /> }} />
      <Tab.Screen name="GetSubs" component={GetSubscribersScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon label={t('tabs.boost')} emoji="🚀" focused={focused} /> }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon label={t('tabs.profile')} emoji="👤" focused={focused} /> }} />
      {isOwner && (
        <Tab.Screen name="Admin" component={AdminScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon label={t('tabs.admin')} emoji="⚙️" focused={focused} /> }} />
      )}
    </Tab.Navigator>
  );
};

const MainStack = ({ isOwner }) => {
  const { t } = useTranslation();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs">{() => <TabNavigator isOwner={isOwner} />}</Stack.Screen>
      <Stack.Screen
        name="MyCampaigns"
        component={MyCampaignsScreen}
        options={{ headerShown: true, headerTitle: t('campaigns.title'), headerStyle: { backgroundColor: colors.bgCard }, headerTintColor: colors.textPrimary, headerTitleStyle: { fontWeight: '800' } }}
      />
      <Stack.Screen
        name="Language"
        component={LanguageScreen}
        options={{ headerShown: true, headerTitle: t('language.title'), headerStyle: { backgroundColor: colors.bgCard }, headerTintColor: colors.textPrimary, headerTitleStyle: { fontWeight: '800' } }}
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

  const isOwner = user?.email?.toLowerCase() === OWNER_EMAIL || user?.role === 'owner';

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
  tabBar: { backgroundColor: colors.bgCard, borderTopColor: colors.border, borderTopWidth: 1, height: 72, paddingBottom: 8, paddingTop: 8 },
  tabItem: { alignItems: 'center', justifyContent: 'center', gap: 2, width: 60 },
  tabEmoji: { fontSize: 22, opacity: 0.4 },
  tabEmojiActive: { opacity: 1 },
  tabLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '500' },
  tabLabelActive: { color: colors.primary, fontWeight: '700' },
});
