import { SupportedLanguageCode, TranslationDictionary } from "../types";
import { en } from "./en";

/**
 * Base translation dictionary.
 * Hardcoded regional translation files have been replaced with the dynamic Google Translator CDN.
 * The application renders English base strings, and the Google Translator CDN translates them in real-time.
 */
export const translations: Record<SupportedLanguageCode, TranslationDictionary> = {
  en,
  hi: en,
  bn: en,
  mr: en,
  gu: en,
  ta: en,
  te: en,
  kn: en,
  pa: en,
};

export { en };
