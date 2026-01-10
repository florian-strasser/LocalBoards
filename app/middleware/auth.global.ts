export default defineNuxtRouteMiddleware(async (to) => {
  // Pattern to match reset-password URLs with a token
  const resetPasswordPattern = /^\/reset-password\/[a-zA-Z0-9]+$/;
  // Check if the path matches the pattern /edit-user/:id
  if (
    to.path !== "/" &&
    !to.path.startsWith("/sign-up") &&
    !to.path.startsWith("/lost-password") &&
    !to.path.startsWith("/sign-up") &&
    !resetPasswordPattern.test(to.path)
  ) {
    // Redirect to dashboard
    const result = await useFetch("/api/auth/get-session");
    if (!result.data.value) {
      return navigateTo("/");
    } else if (result.data.value.user.role !== "admin") {
      if (
        to.path.startsWith("/new-user") ||
        to.path.startsWith("/users") ||
        to.path.startsWith("/edit-user")
      ) {
        return navigateTo("/dashboard/");
      }
    }
  } else {
    // Redirect to dashboard
    const result = await useFetch("/api/auth/get-session");

    if (result.data.value) {
      return navigateTo("/dashboard/");
    }
  }
});
