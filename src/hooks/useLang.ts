import { useState, useEffect, useCallback } from 'react';
import { type Lang, translations, getLang, setLang as persistLang } from '../lib/i18n';
import { pageTranslations } from '../lib/page-i18n';

export function useLang() {
  const [lang, setLangState] = useState<Lang>('en');

  useEffect(() => {
    setLangState(getLang());
    const handler = () => setLangState(getLang());
    window.addEventListener('jfo-lang-change', handler);
    return () => window.removeEventListener('jfo-lang-change', handler);
  }, []);

  const changeLang = useCallback((l: Lang) => {
    persistLang(l);
    setLangState(l);
    window.dispatchEvent(new Event('jfo-lang-change'));
  }, []);

  const tr = useCallback((key: keyof typeof translations['en']): string => {
    return translations[lang]?.[key] ?? pageTranslations[lang]?.[key] ?? translations['en'][key] ?? pageTranslations.en[key] ?? key;
  }, [lang]);

  return { lang, changeLang, tr };
}
