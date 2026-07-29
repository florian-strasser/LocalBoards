// Formats a date in the instance's timezone and configured language.
//
// Deliberately *not* the viewer's: `toLocaleString(undefined, …)` resolves to
// whoever renders — the Node process on the server (en-US/UTC inside the Docker
// image) and the browser on the client — so the same instant produced different
// text on each side and Vue reported "Hydration completed but contains
// mismatches" for every server-rendered date.
//
// Pinning both sides to the instance's own language and timezone fixes that at
// the source: the server can produce exactly the same string the client will,
// so dates render during SSR like everything else, with no placeholder and no
// value appearing after hydration. It also means everyone working on a board
// reads the same wall clock, which is what a self-hosted team tool wants.
//
// The language comes from NUXT_LANGUAGE and the timezone from the server
// process (TZ), both carried to the client via useState — see
// plugins/i18n-locale.ts and plugins/timezone.ts.
const DATE_LOCALES: Record<string, string> = {
  en: "en-US",
  de: "de-DE",
  fr: "fr-FR",
  es: "es-ES",
  it: "it-IT",
  nl: "nl-NL",
  pl: "pl-PL",
};

export const useServerDate = () => {
  const language = useState<string>(
    "language",
    () => (useRuntimeConfig().language as string) || "en",
  );
  const timeZone = useState<string>(
    "timezone",
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
  );

  const formatServerDate = (
    value: string | number | Date | null | undefined,
    options: Intl.DateTimeFormatOptions,
  ): string => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString(DATE_LOCALES[language.value] ?? "en-US", {
      ...options,
      timeZone: timeZone.value,
    });
  };

  return { formatServerDate };
};
