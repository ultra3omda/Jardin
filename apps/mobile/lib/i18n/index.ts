import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import { I18nManager } from 'react-native';

import fr from './locales/fr.json';
import en from './locales/en.json';
import es from './locales/es.json';
import ar from './locales/ar.json';

const SUPPORTED = ['fr', 'en', 'es', 'ar'] as const;
type SupportedLocale = (typeof SUPPORTED)[number];

const deviceLang = Localization.getLocales()?.[0]?.languageCode ?? 'fr';
const lng: SupportedLocale = (SUPPORTED as readonly string[]).includes(deviceLang)
  ? (deviceLang as SupportedLocale)
  : 'fr';

// Apply RTL for Arabic (best-effort; full layout flip applies after a reload).
const shouldBeRTL = lng === 'ar';
if (I18nManager.isRTL !== shouldBeRTL) {
  I18nManager.allowRTL(shouldBeRTL);
  I18nManager.forceRTL(shouldBeRTL);
}

void i18n.use(initReactI18next).init({
  compatibilityJSON: 'v3',
  lng,
  fallbackLng: 'fr',
  resources: {
    fr: { translation: fr },
    en: { translation: en },
    es: { translation: es },
    ar: { translation: ar },
  },
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
