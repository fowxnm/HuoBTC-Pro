/**
 * i18n — lightweight reactive internationalization for SolidJS
 *
 * Supported locales: en, zh-CN, zh-TW, ja, ko
 */
import { createSignal } from "solid-js";
import en from "./locales/en";
import zhCN from "./locales/zh-CN";
import zhTW from "./locales/zh-TW";
import ja from "./locales/ja";
import ko from "./locales/ko";

export type Locale = "en" | "zh-CN" | "zh-TW" | "ja" | "ko";
export type TranslationDict = Record<string, string>;

const dictionaries: Record<Locale, TranslationDict> = {
  en,
  "zh-CN": zhCN,
  "zh-TW": zhTW,
  ja,
  ko,
};

export const localeLabels: Record<Locale, string> = {
  en: "English",
  "zh-CN": "简体中文",
  "zh-TW": "繁體中文",
  ja: "日本語",
  ko: "한국어",
};

export const localeList: Locale[] = ["en", "zh-CN", "zh-TW", "ja", "ko"];

const STORAGE_KEY = "huobtc_locale";

function detectLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (saved && dictionaries[saved]) return saved;
  } catch { /* */ }

  const nav = navigator.language;
  if (nav.startsWith("zh-TW") || nav.startsWith("zh-Hant")) return "zh-TW";
  if (nav.startsWith("zh")) return "zh-CN";
  if (nav.startsWith("ja")) return "ja";
  if (nav.startsWith("ko")) return "ko";
  return "en";
}

const [locale, setLocaleSignal] = createSignal<Locale>(detectLocale());

export function getLocale() {
  return locale();
}

export function setLocale(l: Locale) {
  setLocaleSignal(l);
  try { localStorage.setItem(STORAGE_KEY, l); } catch { /* */ }
}

export function t(key: string): string {
  const dict = dictionaries[locale()];
  return dict[key] ?? dictionaries["en"][key] ?? key;
}

export { locale };
