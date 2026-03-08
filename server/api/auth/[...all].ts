import { auth } from "~/lib/auth"; // import your auth config
const runtimeConfig = useRuntimeConfig();
const allowSignup = runtimeConfig.public.signup;

export default defineEventHandler((event) => {
  if (!allowSignup && event._path === "/api/auth/sign-up/email") {
    return false;
  } else {
    return auth.handler(toWebRequest(event));
  }
  return auth.handler(toWebRequest(event));
});
