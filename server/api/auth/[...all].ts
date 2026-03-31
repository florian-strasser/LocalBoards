import { auth } from "~/lib/auth"; // import your auth config
const runtimeConfig = useRuntimeConfig();
const allowSignup = runtimeConfig.public.signup === "true" ? true : false;

export default defineEventHandler(async (event) => {
  if (!allowSignup && event._path === "/api/auth/sign-up/email") {
    return false;
  } else {
    const response = await auth.handler(toWebRequest(event));
    // Explicitly forward Set-Cookie headers via h3's sendWebResponse
    return sendWebResponse(event, response);
  }
});
