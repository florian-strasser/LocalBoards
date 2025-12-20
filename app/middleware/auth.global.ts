export default defineNuxtRouteMiddleware(async (to) => {
  // Pattern to match reset-password URLs with a token
  const resetPasswordPattern = /^\/reset-password\/[a-zA-Z0-9]+$/;
  // Check if the path matches the pattern /edit-user/:id
  if (
    to.path !== "/" &&
    to.path !== "/sign-up/" &&
    to.path !== "/lost-password/" &&
    to.path !== "/sign-up/" &&
    !resetPasswordPattern.test(to.path)
  ) {
    const result = await useFetch("/api/auth/get-session");

    if (!result.data.value) {
      return navigateTo("/");
    }
  } else {
    // Redirect to dashboard
    const result = await useFetch("/api/auth/get-session");

    if (result.data.value) {
      return navigateTo("/dashboard/");
    }
  }
});
