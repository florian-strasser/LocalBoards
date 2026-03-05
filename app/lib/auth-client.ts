import { createAuthClient } from "better-auth/vue";
import { adminClient } from "better-auth/client/plugins";
import { apiKeyClient } from "@better-auth/api-key/client";

export const authClient = createAuthClient({
  plugins: [adminClient(), apiKeyClient()],
});
