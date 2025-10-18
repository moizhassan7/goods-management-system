'use client';

import React, { useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';

/**
 * A client component to dynamically set the lang and dir attributes 
 * on the root <html> tag based on the current locale.
 */
export default function LanguageSetter() {
//   const { getLocaleProps } = useTranslation();
const { locale } = useTranslation();

  const getLocaleProps = () => {
    switch (locale) {
        case 'ur':
            return { lang: 'ur', dir: 'rtl' };
        case 'en':
        default:
            return { lang: 'en', dir: 'ltr' };
    }
    };
    
  const { lang, dir } = getLocaleProps();

  useEffect(() => {
    // Only run in the browser
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('lang', lang);
      document.documentElement.setAttribute('dir', dir);
    }
  }, [lang, dir]);

  return null; // This component renders nothing itself
}