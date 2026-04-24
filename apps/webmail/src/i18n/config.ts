export const SUPPORTED_LOCALES = ["pt-BR", "en-US", "es-ES"] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "pt-BR";
export const LOCALE_COOKIE_NAME = "hubmail_locale";
export const LOCALE_STORAGE_KEY = "hubmail-locale";

const LOCALE_ALIASES: Record<string, AppLocale> = {
  pt: "pt-BR",
  "pt-br": "pt-BR",
  en: "en-US",
  "en-us": "en-US",
  es: "es-ES",
  "es-es": "es-ES",
};

export function isSupportedLocale(value: string): value is AppLocale {
  return SUPPORTED_LOCALES.includes(value as AppLocale);
}

export function normalizeLocale(input: string | null | undefined): AppLocale | null {
  if (!input) return null;

  const normalized = input.trim();
  if (!normalized) return null;

  if (isSupportedLocale(normalized)) return normalized;

  return LOCALE_ALIASES[normalized.toLowerCase()] ?? null;
}

export function resolveBrowserLocale(languages: readonly string[]): AppLocale {
  for (const raw of languages) {
    const normalized = normalizeLocale(raw);
    if (normalized) return normalized;
  }
  return DEFAULT_LOCALE;
}
