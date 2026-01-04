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

const I18nContext = createContext({
  lang: DEFAULT_LANG,
  setLang: () => {},
  t: (key) => key,
});

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
  const [lang, setLang] = useState(initialLang || DEFAULT_LANG);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
    }
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

  const value = useMemo(() => ({ lang, setLang, t }), [lang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => useContext(I18nContext);
