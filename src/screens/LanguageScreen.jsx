import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Alert } from '../components/ThemedAlert';
import { useNavigation } from '@react-navigation/native';
import { SUPPORTED_LANGUAGES, setLanguage, getCurrentLanguage } from '../utils/i18n';
import { useTranslation } from '../hooks/useTranslation';
import { spacing, radius } from '../theme';
import { useThemedStyles } from '../context/ThemeContext';

const LanguageScreen = () => {
  const { t } = useTranslation();
  const styles = useThemedStyles(makeStyles);
  const navigation = useNavigation();
  const [selected, setSelected] = useState(getCurrentLanguage());

  const languages = Object.entries(SUPPORTED_LANGUAGES).map(([code, meta]) => ({
    code, ...meta,
  }));

  const handleSelect = async (code) => {
    setSelected(code);
    await setLanguage(code);
    Alert.alert(
      t('language.changed'),
      t('language.changedMsg'),
      [{ text: t('common.ok'), onPress: () => navigation.goBack() }]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={languages}
        keyExtractor={item => item.code}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Text style={styles.header}>{t('language.select')}</Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.row, item.code === selected && styles.rowSelected]}
            onPress={() => handleSelect(item.code)}
            activeOpacity={0.7}
          >
            <Text style={styles.flag}>{item.flag}</Text>
            <View style={styles.names}>
              <Text style={styles.nativeName}>{item.nativeName}</Text>
              <Text style={styles.englishName}>{item.name}</Text>
            </View>
            <View style={styles.right}>
              {item.rtl && <Text style={styles.rtlBadge}>RTL</Text>}
              {item.code === selected && <Text style={styles.checkmark}>✓</Text>}
            </View>
          </TouchableOpacity>
        )}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const makeStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.lg, paddingBottom: 40 },
  header: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.md },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    padding: spacing.md, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  rowSelected: { borderColor: colors.primary, backgroundColor: colors.primaryGlow },
  flag: { fontSize: 28, width: 40 },
  names: { flex: 1 },
  nativeName: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  englishName: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rtlBadge: { fontSize: 10, fontWeight: '700', color: colors.warning, backgroundColor: 'rgba(255,183,3,0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.sm },
  checkmark: { fontSize: 18, color: colors.primary, fontWeight: '800' },
});

export default LanguageScreen;
