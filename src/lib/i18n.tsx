'use client'; // <-- ADDED: Marks this as a client component

import { createContext, useContext, useState, ReactNode } from 'react';
import enTranslations from '@/locales/en.json';
import urTranslations from '@/locales/ur.json';

type Locale = 'en' | 'ur';
// Use keyof typeof directly on the imported JSON for type safety
type TranslationKeys = keyof typeof enTranslations; 
type TranslationMap = Record<TranslationKeys, string>;

const locales: Record<Locale, TranslationMap> = {
  // Casting is required to tell TypeScript that the structure is guaranteed at runtime
  en: enTranslations as TranslationMap, 
  ur: urTranslations as TranslationMap,
};

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKeys | string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  // Default to English. You can implement logic here to read from storage/cookies.
  const [locale, setLocale] = useState<Locale>('en'); 

  const t = (key: TranslationKeys | string): string => {
    const translations = locales[locale];
    // Check if key exists in the current locale's translations
    if (key in translations) {
        return translations[key as TranslationKeys];
    }
    return key; // Fallback to the key string if translation is missing
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    // Fallback for components rendered outside the provider (or in static builds)
    return {
      t: (key: string) => key,
      locale: 'en',
      setLocale: () => {},
    } as I18nContextType; // Cast to ensure return type matches
  }
  return context;
}