// Which language the code examples are shown in, shared by every example on the
// page and remembered between pages.
//
// `useState` is what makes them switch together — one piece of app-wide state
// rather than a ref per component. The cookie is what makes the choice survive a
// reload and, more importantly, be known during server rendering: read from
// `localStorage` instead and the page would render cURL and then visibly swap to
// the reader's language on hydration.
export const CODE_LANGUAGES = [
  { id: "curl", label: "cURL" },
  { id: "js", label: "JavaScript" },
  { id: "vue", label: "Vue" },
  { id: "react", label: "React" },
  { id: "php", label: "PHP" },
] as const;

export const useCodeLanguage = () => {
  const cookie = useCookie<string>("lb-code-language", {
    default: () => "curl",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  const language = useState<string>("code-language", () => cookie.value);

  // Written back on every change, so the next page and the next visit open on
  // the language that was picked.
  watch(language, (value) => {
    cookie.value = value;
  });

  return language;
};
