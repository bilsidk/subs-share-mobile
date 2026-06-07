import { useState, useEffect } from 'react';
import { t, getCurrentLanguage, addLanguageListener } from '../utils/i18n';

/**
 * Hook that provides translation function and re-renders on language change.
 * Usage: const { t } = useTranslation();
 */
export function useTranslation() {
  const [lang, setLang] = useState(getCurrentLanguage());

  useEffect(() => {
    const remove = addLanguageListener((newLang) => setLang(newLang));
    return remove;
  }, []);

  return { t, lang };
}
