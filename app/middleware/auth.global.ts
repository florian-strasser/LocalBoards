export default defineNuxtRouteMiddleware(async (to) => {
  const runtimeConfig = useRuntimeConfig();
  const allowSignup =
    runtimeConfig.public.signup === true
      ? true
      : runtimeConfig.public.signup === "true"
        ? true
        : false;
  // Pattern to match reset-password URLs with a token (UUID format)
  const resetPasswordPattern =
    /^\/reset-password\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
  // An invitation link carries a token, and the whole point of it is that it
  // works on an instance that takes no public signups — so `signup: false` must
  // not bounce it to the front page before the form can look the token up. Only
  // the shape is checked here; whether the token is real, unused and unexpired
  // is the server's answer, and an invalid one lands on the form with a message
  // rather than on a redirect with none.
  const invitePattern = /^[a-f0-9]{64}$/;
  const hasInvite = invitePattern.test(String(to.query.invite || ""));
  // Check if the path matches the pattern /edit-user/:id
  if (
    to.path !== "/" &&
    !to.path.startsWith("/sign-up") &&
    !to.path.startsWith("/lost-password") &&
    !to.path.startsWith("/sign-up") &&
    !to.path.startsWith("/api") &&
    !resetPasswordPattern.test(to.path)
  ) {
    // Redirect to dashboard
    const { data: session } = await useFetch("/api/auth/get-session");

    if (!session.value) {
      return navigateTo("/");
    } else if (session.value.data.user.role !== "admin") {
      if (
        to.path.startsWith("/new-user") ||
        to.path.startsWith("/users") ||
        to.path.startsWith("/edit-user")
      ) {
        return navigateTo("/dashboard/");
      }
    }
  } else if (to.path.startsWith("/sign-up") && !allowSignup && !hasInvite) {
    return navigateTo("/");
  } else {
    // Redirect to dashboard
    const { data: session } = await useFetch("/api/auth/get-session");

    if (session.value) {
      return navigateTo("/dashboard/");
    }
  }
});
