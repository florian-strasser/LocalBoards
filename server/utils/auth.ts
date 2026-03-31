import { auth } from "~/lib/auth";
import { setupDatabase } from "../../app/lib/databaseSetup";

const db = setupDatabase();

export async function getApiKeyUser(event: H3Event) {
  const authHeader = getHeader(event, "x-api-key");
  if (!authHeader) {
    return null;
  }

  const key = authHeader;
  const result = await auth.api.verifyApiKey({ body: { key } });

  if (!result.valid || !result.key) {
    return null;
  }
  const [users] = await db.execute(
    `SELECT *
     FROM user
     WHERE id = ?`,
    [result.key.referenceId],
  );
  const user = users[0];

  if (!user) {
    return null;
  }
  return { user, apiKey: key };
}
