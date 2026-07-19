import { defineMcpTool } from "@nuxtjs/mcp-toolkit/server";
import { setupDatabase } from "../../../app/lib/databaseSetup";
import { requireUserId } from "../../utils/mcpHelpers";

const db = setupDatabase();

export default defineMcpTool({
  name: "whoami",
  title: "Who am I",
  description:
    "Return the account the API key is acting as: userId, name, email, role ('user' or 'admin'), and whether the key is read-only. Call this first to confirm your identity and what you're allowed to do.",
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async () => {
    const userId = requireUserId();
    const [rows]: any = await db.execute(
      "SELECT id, name, email, role, type FROM `user` WHERE id = ?",
      [userId],
    );
    const user = rows[0];
    const event = useEvent();
    const perms = event.context?.apiKeyPermissions as
      string[] | null | undefined;
    const readOnly = Array.isArray(perms) && !perms.includes("write");
    return jsonResult({
      userId,
      name: user?.name ?? null,
      email: user?.email ?? null,
      role: user?.role ?? "user",
      // "artificial" = a dedicated AI-agent account; "human" = a person.
      type: user?.type ?? "human",
      readOnlyKey: readOnly,
    });
  },
});
