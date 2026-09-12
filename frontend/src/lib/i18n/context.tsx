"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import {
  SupportedLanguageCode,
  LanguageInfo,
  TranslationDictionary,
} from "./types";
import {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  getLanguageInfo,
  isSupportedLanguage,
} from "./languages";
import {
  shouldShowLanguageSuggestion,
  savePreferredLanguage,
  dismissLanguageSuggestion,
  getSavedPreferredLanguage,
} from "./detector";
import { translations } from "./locales";

interface GoogleTranslateElementOptions {
  pageLanguage: string;
  includedLanguages?: string;
  autoDisplay?: boolean;
}

interface GoogleTranslateInstance {
  TranslateElement: new (
    options: GoogleTranslateElementOptions,
    elementId: string
  ) => void;
}

declare global {
  interface Window {
    google?: {
      translate?: GoogleTranslateInstance;
    };
    googleTranslateElementInit?: () => void;
  }
}

interface LanguageContextType {
  currentLanguage: SupportedLanguageCode;
  languageInfo: LanguageInfo;
  translations: TranslationDictionary;
  supportedLanguages: LanguageInfo[];
  suggestedLanguage: SupportedLanguageCode | null;
  suggestedLanguageInfo: LanguageInfo | null;
  isSuggestionVisible: boolean;
  setLanguage: (code: SupportedLanguageCode) => void;
  acceptSuggestion: () => void;
  dismissSuggestion: () => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

/**
 * Trigger translation in Google Translate widget by updating cookie & combo element
 */
function applyGoogleTranslation(targetCode: string) {
  if (typeof document === "undefined") return;

  const cookieVal = targetCode === "en" ? "/en/en" : `/en/${targetCode}`;
  document.cookie = `googtrans=${cookieVal}; path=/;`;

  if (typeof window !== "undefined" && window.location.hostname) {
    document.cookie = `googtrans=${cookieVal}; path=/; domain=${window.location.hostname};`;
  }

  // Trigger Google Translate select element if it's already created in the DOM
  const combo = document.querySelector<HTMLSelectElement>(".goog-te-combo");
  if (combo) {
    combo.value = targetCode;
    combo.dispatchEvent(new Event("change"));
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Initialize from saved preference safely
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguageCode>(
    () => {
      if (typeof window !== "undefined") {
        try {
          const saved = getSavedPreferredLanguage();
          if (saved && isSupportedLanguage(saved)) {
            return saved;
          }
        } catch {
          // Fallback to default
        }
      }
      return DEFAULT_LANGUAGE;
    }
  );

  const [suggestedLanguage, setSuggestedLanguage] =
    useState<SupportedLanguageCode | null>(null);
  const [isSuggestionVisible, setIsSuggestionVisible] = useState(false);

  // Initialize Google Translate CDN Script & widget
  useEffect(() => {
    // 1. Define global callback
    window.googleTranslateElementInit = () => {
      try {
        if (window.google?.translate?.TranslateElement) {
          new window.google.translate.TranslateElement(
            {
              pageLanguage: "en",
              includedLanguages:
                "en,hi,bn,mr,gu,ta,te,kn,pa,ur,es,fr,de,ar,zh-CN,ja",
              autoDisplay: false,
            },
            "google_translate_element"
          );

          // If a non-English language is active, trigger Google Translate
          const saved = getSavedPreferredLanguage();
          if (saved && isSupportedLanguage(saved) && saved !== DEFAULT_LANGUAGE) {
            setTimeout(() => {
              applyGoogleTranslation(saved);
            }, 500);
          }
        }
      } catch (err) {
        console.warn("Google Translate initialization notice:", err);
      }
    };

    // 2. Load Google Translate script via CDN if not present
    if (!document.getElementById("google-translate-cdn")) {
      const script = document.createElement("script");
      script.id = "google-translate-cdn";
      script.src =
        "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Check for regional browser language suggestion on first visit
  useEffect(() => {
    try {
      const saved = getSavedPreferredLanguage();

      if (saved && isSupportedLanguage(saved)) {
        applyGoogleTranslation(saved);
      } else {
        const { shouldShow, suggestedLanguage: detected } =
          shouldShowLanguageSuggestion();

        if (shouldShow && detected && detected !== DEFAULT_LANGUAGE) {
          // Defer suggestion state update to avoid cascading effect warning
          queueMicrotask(() => {
            setSuggestedLanguage(detected);
            setIsSuggestionVisible(true);
          });
        }
      }
    } catch (e) {
      console.warn("Language preference initialization warning:", e);
    }
  }, []);

  // Set language manually and trigger Google Translator CDN
  const setLanguage = useCallback((code: SupportedLanguageCode) => {
    if (!isSupportedLanguage(code)) return;
    setCurrentLanguage(code);
    savePreferredLanguage(code);
    setIsSuggestionVisible(false);
    setSuggestedLanguage(null);

    // Apply translation via Google Translate CDN
    applyGoogleTranslation(code);

    // Update html lang attribute
    if (typeof document !== "undefined") {
      document.documentElement.lang = code;
    }
  }, []);

  // Accept suggested language
  const acceptSuggestion = useCallback(() => {
    if (suggestedLanguage && isSupportedLanguage(suggestedLanguage)) {
      setLanguage(suggestedLanguage);
    }
  }, [suggestedLanguage, setLanguage]);

  // Dismiss suggestion
  const dismissSuggestion = useCallback(() => {
    dismissLanguageSuggestion();
    setIsSuggestionVisible(false);
    setSuggestedLanguage(null);
  }, []);

  const languageInfo = useMemo(
    () => getLanguageInfo(currentLanguage),
    [currentLanguage]
  );

  const suggestedLanguageInfo = useMemo(
    () => (suggestedLanguage ? getLanguageInfo(suggestedLanguage) : null),
    [suggestedLanguage]
  );

  // Canonical base strings from en.ts
  const currentTranslations = useMemo(() => {
    return translations[DEFAULT_LANGUAGE];
  }, []);

  const value = useMemo(
    () => ({
      currentLanguage,
      languageInfo,
      translations: currentTranslations,
      supportedLanguages: SUPPORTED_LANGUAGES,
      suggestedLanguage,
      suggestedLanguageInfo,
      isSuggestionVisible,
      setLanguage,
      acceptSuggestion,
      dismissSuggestion,
    }),
    [
      currentLanguage,
      languageInfo,
      currentTranslations,
      suggestedLanguage,
      suggestedLanguageInfo,
      isSuggestionVisible,
      setLanguage,
      acceptSuggestion,
      dismissSuggestion,
    ]
  );

  return (
    <LanguageContext.Provider value={value}>
      {/* Hidden container for Google Translate element */}
      <div
        id="google_translate_element"
        style={{ display: "none" }}
        aria-hidden="true"
      />
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

export function useTranslation() {
  const { translations, currentLanguage, languageInfo } = useLanguage();
  return {
    t: translations,
    currentLanguage,
    languageInfo,
  };
}
