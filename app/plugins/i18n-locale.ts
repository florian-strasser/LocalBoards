// Selects the active i18n locale at runtime from NUXT_LANGUAGE.
//
// The i18n config is evaluated at build time when env variables aren't
// available, so the language can't be chosen there. All locales are bundled,
// and this plugin switches to the configured one on startup. The value is read
// from the (server-only) runtimeConfig and carried to the client via useState
// so server and client render the same language.
export default defineNuxtPlugin(async (nuxtApp) => {
  const language = useState<string>(
    "language",
    () => (useRuntimeConfig().language as string) || "en",
  );

  const i18n = nuxtApp.$i18n as any;
  if (!i18n || !language.value) return;

  const available = (unref(i18n.locales) ?? []).map((locale: any) =>
    typeof locale === "string" ? locale : locale.code,
  );

  if (
    available.includes(language.value) &&
    unref(i18n.locale) !== language.value
  ) {
    await i18n.setLocale(language.value);
  }
});
