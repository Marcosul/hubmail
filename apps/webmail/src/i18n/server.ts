import { cookies, headers } from "next/headers";

import { DEFAULT_LOCALE, LOCALE_COOKIE_NAME, type AppLocale, normalizeLocale } from "@/i18n/config";

export async function getServerLocale(): Promise<AppLocale> {
  const cookieStore = await cookies();
  const cookieLocale = normalizeLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value);
  if (cookieLocale) return cookieLocale;

  const hdrs = await headers();
  const acceptLanguage = hdrs.get("accept-language");
  if (acceptLanguage) {
    const candidates = acceptLanguage
      .split(",")
      .map((part) => part.split(";")[0]?.trim())
      .filter(Boolean);

    for (const candidate of candidates) {
      const normalized = normalizeLocale(candidate);
      if (normalized) return normalized;
    }
  }

  return DEFAULT_LOCALE;
}
