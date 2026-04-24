"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  LOCALE_STORAGE_KEY,
  type AppLocale,
  normalizeLocale,
} from "@/i18n/config";
import { getMessages } from "@/i18n/messages";

type LocaleContextValue = {
  locale: AppLocale;
  setLocale: (nextLocale: AppLocale) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function persistLocale(locale: AppLocale) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  document.cookie = `${LOCALE_COOKIE_NAME}=${encodeURIComponent(locale)}; path=/; max-age=31536000; samesite=lax`;
}

function readLocaleFromBrowser(): AppLocale | null {
  if (typeof window === "undefined") return null;

  const fromStorage = normalizeLocale(window.localStorage.getItem(LOCALE_STORAGE_KEY));
  if (fromStorage) return fromStorage;

  const fromNavigator = normalizeLocale(window.navigator.language);
  if (fromNavigator) return fromNavigator;

  return null;
}

export function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: AppLocale;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState<AppLocale>(() => readLocaleFromBrowser() ?? initialLocale);

  useEffect(() => {
    persistLocale(locale);
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale: (nextLocale) => {
        setLocaleState(nextLocale);
        persistLocale(nextLocale);
      },
    }),
    [locale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const value = useContext(LocaleContext);
  if (!value) {
    throw new Error("useLocale must be used inside LocaleProvider");
  }
  return value;
}

export function useI18n() {
  const { locale, setLocale } = useLocale();
  const messages = useMemo(() => getMessages(locale), [locale]);
  return { locale, setLocale, messages };
}

export function getLocaleLabel(locale: AppLocale): string {
  if (locale === "en-US") return "English";
  if (locale === "es-ES") return "Español (España)";
  return "Português (Brasil)";
}

export function getLocaleDateFormat(locale: AppLocale): string {
  if (locale === "en-US") return "en-US";
  if (locale === "es-ES") return "es-ES";
  return "pt-BR";
}

export function fallbackLocale(locale?: AppLocale | null): AppLocale {
  return locale ?? DEFAULT_LOCALE;
}
