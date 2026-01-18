import { createAuthClient } from "better-auth/vue";
import { adminClient, apiKeyClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [adminClient(), apiKeyClient()],
});
