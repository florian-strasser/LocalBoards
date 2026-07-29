// Resolves the instance's timezone once, on the server, and carries it to the
// client via useState — the same trick plugins/i18n-locale.ts uses for the
// language. Without this, a component that first renders in the browser (the
// notification panel, say) would initialise the state from the *browser's*
// timezone and disagree with the server-rendered dates around it.
export default defineNuxtPlugin(() => {
  useState<string>(
    "timezone",
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
});
