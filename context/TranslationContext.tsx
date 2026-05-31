'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useTransition,
  type ReactNode,
} from 'react';

import en from '@/locales/en.json';
import es from '@/locales/es.json';
import hi from '@/locales/hi.json';
import fr from '@/locales/fr.json';
import zh from '@/locales/zh.json';
import ja from '@/locales/ja.json';
import ko from '@/locales/ko.json';

export type Language = 'en' | 'es' | 'hi' | 'fr' | 'zh' | 'ja' | 'ko';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const translations: Record<Language, any> = {
  en,
  es,
  hi,
  fr,
  zh,
  ja,
  ko,
};

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: 'English',
  es: 'Español',
  hi: 'हिन्दी',
  fr: 'Français',
  zh: '简体中文',
  ja: '日本語',
  ko: '한국어',
};

interface TranslationContextType {
  language: Language;
  changeLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string>) => string;
  isPending: boolean;
}

const TranslationContext = createContext<TranslationContextType | null>(null);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getNestedValue = (obj: any, path: string): string => {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj) || path;
};

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');
  const [mounted, setMounted] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    const storedLang = localStorage.getItem('language') as Language;
    const supportedLangs = Object.keys(translations) as Language[];

    if (storedLang && supportedLangs.includes(storedLang)) {
      setLanguage(storedLang);
    } else {
      const browserLang = navigator.language.split('-')[0] as Language;
      if (supportedLangs.includes(browserLang)) {
        setLanguage(browserLang);
        localStorage.setItem('language', browserLang);
      } else {
        setLanguage('en');
        localStorage.setItem('language', 'en');
      }
    }
  }, []);

  const changeLanguage = (lang: Language) => {
    startTransition(() => {
      setLanguage(lang);
      localStorage.setItem('language', lang);
      // Update HTML lang attribute for accessibility/SEO
      document.documentElement.lang = lang;
    });
  };

  const t = (path: string, params?: Record<string, string>): string => {
    // If not mounted (Server Side Rendering phase), fallback to English
    const currentLang = mounted ? language : 'en';
    const translationSet = translations[currentLang] || translations.en;
    let value = getNestedValue(translationSet, path);

    if (typeof value !== 'string') {
      value = getNestedValue(translations.en, path);
    }

    if (typeof value !== 'string') {
      return path;
    }

    if (params) {
      let resolvedValue = value;
      Object.entries(params).forEach(([key, val]) => {
        resolvedValue = resolvedValue.replace(new RegExp(`{{${key}}}`, 'g'), val);
      });
      return resolvedValue;
    }

    return value;
  };

  return (
    <TranslationContext.Provider value={{ language, changeLanguage, t, isPending }}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(TranslationContext);
  if (!context) {
    return {
      language: 'en' as Language,
      changeLanguage: () => {},
      t: (path: string, params?: Record<string, string>): string => {
        const value = getNestedValue(en, path);
        if (typeof value !== 'string') {
          return path;
        }
        if (params) {
          let resolvedValue = value;
          Object.entries(params).forEach(([key, val]) => {
            resolvedValue = resolvedValue.replace(new RegExp(`{{${key}}}`, 'g'), val);
          });
          return resolvedValue;
        }
        return value;
      },
      isPending: false,
    };
  }
  return context;
}
