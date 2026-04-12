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
  } else if (to.path.startsWith("/sign-up") && !allowSignup) {
    return navigateTo("/");
  } else {
    // Redirect to dashboard
    const { data: session } = await useFetch("/api/auth/get-session");

    if (session.value) {
      return navigateTo("/dashboard/");
    }
  }
});
