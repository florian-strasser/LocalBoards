import { defineEventHandler } from "h3";
import { setupDatabase } from "../../app/lib/databaseSetup";

// Public health/readiness endpoint for Docker, compose, and orchestrators.
// Verifies the app is up AND can reach its database. Returns 200 when healthy,
// 503 when the database is unreachable. Deliberately leaks no details.
export default defineEventHandler(async (event) => {
  if (event.req.method !== "GET") {
    event.res.statusCode = 405;
    return { error: "Method not allowed" };
  }

  try {
    await setupDatabase().query("SELECT 1");
    return { status: "ok", database: "ok" };
  } catch (error) {
    logger.error("Health check failed:", error);
    event.res.statusCode = 503;
    return { status: "error", database: "unreachable" };
  }
});
