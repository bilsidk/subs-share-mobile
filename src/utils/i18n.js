import { I18nManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as RNLocalize from 'react-native-localize';

// Supported languages
export const SUPPORTED_LANGUAGES = {
  en:      { name: 'English',              nativeName: 'English',        rtl: false, flag: '🇬🇧' },
  ar:      { name: 'Arabic',               nativeName: 'العربية',         rtl: true,  flag: '🇸🇦' },
  fr:      { name: 'French',               nativeName: 'Français',        rtl: false, flag: '🇫🇷' },
  es:      { name: 'Spanish',              nativeName: 'Español',         rtl: false, flag: '🇪🇸' },
  pt:      { name: 'Portuguese',           nativeName: 'Português',       rtl: false, flag: '🇧🇷' },
  tr:      { name: 'Turkish',              nativeName: 'Türkçe',          rtl: false, flag: '🇹🇷' },
  id:      { name: 'Indonesian',           nativeName: 'Bahasa Indonesia', rtl: false, flag: '🇮🇩' },
  hi:      { name: 'Hindi',               nativeName: 'हिन्दी',            rtl: false, flag: '🇮🇳' },
  ru:      { name: 'Russian',              nativeName: 'Русский',         rtl: false, flag: '🇷🇺' },
  de:      { name: 'German',               nativeName: 'Deutsch',         rtl: false, flag: '🇩🇪' },
  'zh-CN': { name: 'Chinese (Simplified)', nativeName: '简体中文',          rtl: false, flag: '🇨🇳' },
  'zh-TW': { name: 'Chinese (Traditional)',nativeName: '繁體中文',          rtl: false, flag: '🇹🇼' },
  bn:      { name: 'Bengali',              nativeName: 'বাংলা',            rtl: false, flag: '🇧🇩' },
  ja:      { name: 'Japanese',             nativeName: '日本語',            rtl: false, flag: '🇯🇵' },
  ko:      { name: 'Korean',               nativeName: '한국어',            rtl: false, flag: '🇰🇷' },
};

const STORAGE_KEY = '@subsshare_language';
const DEFAULT_LANG = 'en';

// Load all translation files
const translations = {
  en:      require('./locales/en').default,
  ar:      require('./locales/ar').default,
  fr:      require('./locales/fr').default,
  es:      require('./locales/es').default,
  pt:      require('./locales/pt').default,
  tr:      require('./locales/tr').default,
  id:      require('./locales/id').default,
  hi:      require('./locales/hi').default,
  ru:      require('./locales/ru').default,
  de:      require('./locales/de').default,
  'zh-CN': require('./locales/zh-CN').default,
  'zh-TW': require('./locales/zh-TW').default,
  bn:      require('./locales/bn').default,
  ja:      require('./locales/ja').default,
  ko:      require('./locales/ko').default,
};

let currentLang = DEFAULT_LANG;
let currentTranslations = translations[DEFAULT_LANG];
let listeners = [];

/**
 * Detect best language from device settings.
 * Falls back to English if device language isn't supported.
 */
function detectDeviceLanguage() {
  try {
    const locales = RNLocalize.getLocales();
    for (const locale of locales) {
      const tag = locale.languageTag; // e.g. "zh-CN", "en-US", "ar"
      const lang = locale.languageCode; // e.g. "zh", "en", "ar"

      // Try exact match first (e.g. zh-CN, zh-TW)
      if (translations[tag]) return tag;
      // Try language code match (e.g. en, ar, fr)
      if (translations[lang]) return lang;
      // Chinese special case
      if (lang === 'zh') {
        const region = locale.countryCode;
        return ['TW', 'HK', 'MO'].includes(region) ? 'zh-TW' : 'zh-CN';
      }
    }
  } catch (_) { /* ignore */
  }
  return DEFAULT_LANG;
}

/**
 * Initialize i18n — called once at app startup.
 * Loads saved preference or auto-detects from device.
 */
export async function initI18n() {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    const lang = saved && translations[saved] ? saved : detectDeviceLanguage();
    await setLanguage(lang, false); // false = don't persist (already persisted or auto)
    if (!saved) await AsyncStorage.setItem(STORAGE_KEY, lang); // persist auto-detected
  } catch (_) { /* ignore */
  }
}

/**
 * Switch language. Persists the choice. Updates RTL layout.
 */
export async function setLanguage(lang, persist = true) {
  if (!translations[lang]) lang = DEFAULT_LANG;
  currentLang = lang;
  currentTranslations = translations[lang];

  // Handle RTL layout
  const isRTL = SUPPORTED_LANGUAGES[lang]?.rtl || false;
  if (I18nManager.isRTL !== isRTL) {
    I18nManager.forceRTL(isRTL);
    // Note: RTL change requires app restart to fully take effect
  }

  if (persist) {
    await AsyncStorage.setItem(STORAGE_KEY, lang);
  }

  // Notify listeners
  listeners.forEach(fn => fn(lang));
}

export function getCurrentLanguage() { return currentLang; }
export function isRTL() { return SUPPORTED_LANGUAGES[currentLang]?.rtl || false; }

export function addLanguageListener(fn) {
  listeners.push(fn);
  return () => { listeners = listeners.filter(l => l !== fn); };
}

/**
 * Translate a key like 'earn.title' with optional interpolation.
 * Falls back to English, then to the key itself.
 * Supports {{variable}} interpolation.
 */
export function t(key, vars = {}) {
  const keys = key.split('.');
  let value = getNestedValue(currentTranslations, keys)
            || getNestedValue(translations[DEFAULT_LANG], keys)
            || key;

  if (typeof value === 'string' && Object.keys(vars).length) {
    value = value.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '');
  }
  return value;
}

function getNestedValue(obj, keys) {
  return keys.reduce((o, k) => (o && o[k] !== undefined ? o[k] : null), obj);
}
