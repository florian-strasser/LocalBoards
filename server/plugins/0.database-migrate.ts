import { runMigrations } from "../../app/lib/databaseSetup";

// Run database migrations once at server startup, before requests are served.
// The `0.` filename prefix makes this plugin run before the others. Nitro awaits
// async plugins during initialisation, so the schema is ready by the time the
// server starts handling requests.
export default defineNitroPlugin(async () => {
  try {
    await runMigrations();
  } catch (err) {
    // Fail fast: don't serve traffic against a database with an unknown schema.
    logger.error("Database migration failed:", err);
    throw err;
  }
});
