import { setupDatabase, runMigrations } from "../../app/lib/databaseSetup";

// Data tables to clear between tests (excludes `migrations`, which is left
// intact so the schema is only built once).
const DATA_TABLES = [
  "account",
  "apikey",
  "boards",
  "areas",
  "cards",
  "attachments",
  "comments",
  "invitations",
  "notifications",
  "session",
  "user",
  "verification",
];

export function db() {
  return setupDatabase();
}

// Build the schema once (runs the real migrations against the test database).
export async function migrate() {
  await runMigrations();
}

// Empty all data tables for an isolated test.
export async function resetData() {
  const pool = setupDatabase();
  await pool.query("SET FOREIGN_KEY_CHECKS=0");
  for (const table of DATA_TABLES) {
    await pool.query(`TRUNCATE TABLE \`${table}\``);
  }
  await pool.query("SET FOREIGN_KEY_CHECKS=1");
}

export async function insertUser(
  id: string,
  overrides: { banned?: number; role?: string; email?: string } = {},
) {
  await setupDatabase().execute(
    "INSERT INTO `user` (`id`,`name`,`email`,`emailVerified`,`role`,`banned`) VALUES (?,?,?,?,?,?)",
    [
      id,
      "Test User",
      overrides.email ?? `${id}@example.com`,
      1,
      overrides.role ?? "user",
      overrides.banned ?? null,
    ],
  );
}
