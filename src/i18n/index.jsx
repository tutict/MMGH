import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import zhCN from "./locales/zh-CN";
import enUS from "./locales/en-US";

const DICTS = {
  "zh-CN": zhCN,
  "en-US": enUS,
};

const DEFAULT_LANG = "zh-CN";
const LANG_STORAGE_KEY = "mmgh-lang";
export const LANG_PERSIST_ERROR_EVENT = "mmgh:lang-persist-error";

const I18nContext = createContext({
  lang: DEFAULT_LANG,
  setLang: () => {},
  t: (key) => key,
});

const normalizeLang = (value) => {
  if (!value) {
    return DEFAULT_LANG;
  }

  if (DICTS[value]) {
    return value;
  }

  const base = String(value).toLowerCase();
  if (base.startsWith("zh")) {
    return "zh-CN";
  }
  if (base.startsWith("en")) {
    return "en-US";
  }

  return DEFAULT_LANG;
};

const readStoredLang = () => {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    return window.localStorage.getItem(LANG_STORAGE_KEY) || "";
  } catch (error) {
    console.error("Failed to read language preference", error);
    return "";
  }
};

const persistLang = (lang) => {
  if (typeof window === "undefined") {
    return true;
  }

  try {
    window.localStorage.setItem(LANG_STORAGE_KEY, lang);
    return true;
  } catch (error) {
    console.error("Failed to persist language preference", error);
    window.dispatchEvent(
      new CustomEvent(LANG_PERSIST_ERROR_EVENT, {
        detail: error,
      })
    );
    return false;
  }
};

const getInitialLang = (initialLang) => {
  if (initialLang) {
    return normalizeLang(initialLang);
  }

  const savedLang = readStoredLang();
  if (savedLang) {
    return normalizeLang(savedLang);
  }

  if (typeof navigator !== "undefined") {
    return normalizeLang(navigator.language || navigator.languages?.[0]);
  }

  return DEFAULT_LANG;
};

const formatMessage = (message, vars) => {
  if (!vars) {
    return message;
  }
  return message.replace(/\{(\w+)\}/g, (_, token) => {
    const value = vars[token];
    return value == null ? "" : String(value);
  });
};

export const I18nProvider = ({ children, initialLang }) => {
  const [lang, setLangState] = useState(() => getInitialLang(initialLang));

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  const setLang = useCallback((nextLang) => {
    const resolvedLang =
      typeof nextLang === "function" ? normalizeLang(nextLang(lang)) : normalizeLang(nextLang);
    persistLang(resolvedLang);
    setLangState(resolvedLang);
  }, [lang]);

  const t = useCallback(
    (key, vars) => {
      const dict = DICTS[lang] || DICTS[DEFAULT_LANG];
      const fallback = DICTS[DEFAULT_LANG] || {};
      const message = dict[key] ?? fallback[key] ?? key;
      return formatMessage(message, vars);
    },
    [lang]
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => useContext(I18nContext);
