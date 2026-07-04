// First-run guided tour state. Kept in `useState` so it survives client-side
// navigation between the dashboard and the board page. Steps auto-advance when
// the user performs the matching action (see the board page and dashboard).

export const ONBOARDING_STEPS = [
  "create-board",
  "create-areas",
  "add-card",
  "move-card",
  "invite",
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number] | "" | "done";

export function useOnboarding() {
  const active = useState<boolean>("onboardingActive", () => false);
  const step = useState<OnboardingStep>("onboardingStep", () => "");
  const promptVisible = useState<boolean>("onboardingPrompt", () => false);
  // Set once the user starts, skips or finishes — stops the prompt reappearing
  // during this app session (the server flag handles future sessions).
  const dismissed = useState<boolean>("onboardingDismissed", () => false);

  const markDoneOnServer = async () => {
    try {
      await $fetch("/api/auth/onboarding", { method: "POST" });
    } catch {
      // Best-effort — the tour still closes locally if this fails.
    }
  };

  // Offer the tour (only if not already active or dismissed this session).
  const openPrompt = () => {
    if (!active.value && !dismissed.value) promptVisible.value = true;
  };

  const start = () => {
    promptVisible.value = false;
    dismissed.value = true;
    active.value = true;
    step.value = "create-board";
    markDoneOnServer();
  };

  const skip = () => {
    promptVisible.value = false;
    dismissed.value = true;
    markDoneOnServer();
  };

  const cancel = () => {
    active.value = false;
    step.value = "";
    dismissed.value = true;
    markDoneOnServer();
  };

  const finish = () => {
    active.value = false;
    step.value = "done";
  };

  // Advance only if the tour is on the given step (so stray events are ignored).
  const advance = (fromStep: OnboardingStep) => {
    if (!active.value || step.value !== fromStep) return;
    const idx = ONBOARDING_STEPS.indexOf(fromStep as any);
    if (idx === -1) return;
    if (idx >= ONBOARDING_STEPS.length - 1) {
      finish();
    } else {
      step.value = ONBOARDING_STEPS[idx + 1];
    }
  };

  return {
    active,
    step,
    promptVisible,
    dismissed,
    openPrompt,
    start,
    skip,
    cancel,
    finish,
    advance,
  };
}
