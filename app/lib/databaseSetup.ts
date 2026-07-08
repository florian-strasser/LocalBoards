import { createPool } from "mysql2/promise";
import { logger } from "../../server/utils/logger";

// Read DB config from Nuxt's runtimeConfig at runtime, falling back to
// process.env when it isn't available (e.g. integration tests that import this
// module outside the Nuxt/nitro context). `typeof` guards the auto-imported
// global so referencing it in a plain Node test doesn't throw.
const runtimeConfig: any =
  typeof useRuntimeConfig !== "undefined" ? useRuntimeConfig() : null;

const mysqlHost = runtimeConfig?.mysqlHost ?? process.env.NUXT_MYSQL_HOST;
const mysqlUser = runtimeConfig?.mysqlUser ?? process.env.NUXT_MYSQL_USER;
const mysqlPassword =
  runtimeConfig?.mysqlPassword ?? process.env.NUXT_MYSQL_PASSWORD;
const mysqlDatabase =
  runtimeConfig?.mysqlDatabase ?? process.env.NUXT_MYSQL_DATABASE;

// Enable TLS when the database server requires it (e.g. managed/external MySQL
// such as Mittwald). Opt-in via NUXT_MYSQL_SSL=true so local/compose MySQL
// without TLS keeps working. Certificate verification stays on by default;
// set NUXT_MYSQL_SSL_REJECT_UNAUTHORIZED=false only if the server presents a
// certificate that can't be verified against a public CA.
const mysqlSsl =
  String(runtimeConfig?.mysqlSsl ?? process.env.NUXT_MYSQL_SSL).toLowerCase() ===
  "true";
const mysqlSslRejectUnauthorized =
  String(
    runtimeConfig?.mysqlSslRejectUnauthorized ??
      process.env.NUXT_MYSQL_SSL_REJECT_UNAUTHORIZED,
  ).toLowerCase() !== "false";

const db = createPool({
  host: mysqlHost,
  user: mysqlUser,
  password: mysqlPassword,
  database: mysqlDatabase,
  timezone: "Z", // mysql2 parses returned DATETIME/TIMESTAMP values as UTC
  ...(mysqlSsl
    ? { ssl: { rejectUnauthorized: mysqlSslRejectUnauthorized } }
    : {}),
});

// Force every pooled connection to UTC. The pool reads timestamps as UTC
// (`timezone: "Z"` above), so the MySQL session must also be UTC — otherwise the
// server's local session timezone (e.g. CEST) makes `CURRENT_TIMESTAMP`/`NOW()`
// return local time that mysql2 then reinterprets as UTC, shifting every stored
// timestamp (e.g. a comment posted at 00:56 showing as 02:56). `+00:00` is a
// fixed offset, so it works without MySQL's named-timezone tables being loaded.
db.on("connection", (connection: any) => {
  connection.query("SET time_zone = '+00:00';");
});

/**
 * Return the shared MySQL connection pool.
 *
 * The schema is created and kept up to date once at startup by `runMigrations()`
 * (invoked from the `server/plugins/0.database-migrate.ts` Nitro plugin), so
 * request handlers just grab the pool here instead of re-issuing DDL on every
 * call as this function used to.
 */
export function setupDatabase() {
  return db;
}

// --- Schema migrations -------------------------------------------------------

interface Migration {
  // Stable, ordered identifier. Never change an id once it has shipped.
  id: string;
  up: (db: any) => Promise<void>;
}

// Ordered list of migrations. To evolve the schema, append a new entry — never
// edit or remove an existing one (it may already be applied in the wild).
const migrations: Migration[] = [
  {
    // Baseline schema. Uses CREATE TABLE IF NOT EXISTS so it is safe to run
    // against databases that already contain these tables (existing
    // deployments): it records the baseline as applied without altering them.
    id: "0001_baseline_schema",
    up: async (db) => {
      // account
      await db.execute(`CREATE TABLE IF NOT EXISTS \`account\` (
        \`id\` varchar(36) NOT NULL,
        \`accountId\` text NOT NULL,
        \`providerId\` text NOT NULL,
        \`userId\` varchar(36) NOT NULL,
        \`password\` text,
        \`createdAt\` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`);

      // apikey
      await db.execute(`CREATE TABLE IF NOT EXISTS \`apikey\` (
        \`id\` varchar(36) NOT NULL,
        \`name\` text,
        \`start\` text,
        \`prefix\` text,
        \`key\` varchar(255) NOT NULL,
        \`refillInterval\` int DEFAULT NULL,
        \`refillAmount\` int DEFAULT NULL,
        \`lastRefillAt\` timestamp(3) NULL DEFAULT NULL,
        \`enabled\` tinyint(1) DEFAULT NULL,
        \`rateLimitEnabled\` tinyint(1) DEFAULT NULL,
        \`rateLimitTimeWindow\` int DEFAULT NULL,
        \`rateLimitMax\` int DEFAULT NULL,
        \`requestCount\` int DEFAULT NULL,
        \`remaining\` int DEFAULT NULL,
        \`lastRequest\` timestamp(3) NULL DEFAULT NULL,
        \`expiresAt\` timestamp(3) NULL DEFAULT NULL,
        \`createdAt\` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`permissions\` text,
        \`metadata\` text,
        \`configId\` varchar(255) NOT NULL DEFAULT 'default',
        \`referenceId\` varchar(255) NOT NULL,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`);

      // boards
      await db.execute(`CREATE TABLE IF NOT EXISTS \`boards\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`user\` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
        \`name\` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
        \`style\` enum('kanban','todo','notices') COLLATE utf8mb4_general_ci DEFAULT 'kanban',
        \`status\` enum('private','public') COLLATE utf8mb4_general_ci DEFAULT 'private',
        \`image\` longtext COLLATE utf8mb4_general_ci,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;`);

      // areas
      await db.execute(`CREATE TABLE IF NOT EXISTS \`areas\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`board\` int NOT NULL,
        \`name\` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
        \`sort\` int DEFAULT '0',
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;`);

      // cards
      await db.execute(`CREATE TABLE IF NOT EXISTS \`cards\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`area\` int NOT NULL,
        \`name\` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
        \`sort\` int DEFAULT '0',
        \`content\` longtext COLLATE utf8mb4_general_ci,
        \`status\` tinyint(1) DEFAULT '0',
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;`);

      // attachments
      await db.execute(`CREATE TABLE IF NOT EXISTS \`attachments\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`card\` int NOT NULL,
        \`filename\` varchar(255) NOT NULL,
        \`filetype\` varchar(100) NOT NULL,
        \`filesize\` int NOT NULL,
        \`filedata\` longtext NOT NULL,
        \`createdAt\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`);

      // comments
      await db.execute(`CREATE TABLE IF NOT EXISTS \`comments\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`card\` int NOT NULL,
        \`user\` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
        \`content\` longtext COLLATE utf8mb4_general_ci,
        \`date\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;`);

      // invitations
      await db.execute(`CREATE TABLE IF NOT EXISTS \`invitations\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`board\` int NOT NULL,
        \`user\` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
        \`permission\` enum('read','edit') COLLATE utf8mb4_general_ci DEFAULT 'read',
        \`date\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;`);

      // notifications
      await db.execute(`CREATE TABLE IF NOT EXISTS \`notifications\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`userId\` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
        \`type\` enum('invitation','comment','card_created','card_moved','card_status_changed') COLLATE utf8mb4_general_ci NOT NULL,
        \`boardId\` int DEFAULT NULL,
        \`cardId\` int DEFAULT NULL,
        \`message\` longtext COLLATE utf8mb4_general_ci,
        \`isRead\` tinyint(1) DEFAULT '0',
        \`notified\` tinyint(1) NOT NULL DEFAULT '0',
        \`createdAt\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;`);

      // session
      await db.execute(`CREATE TABLE IF NOT EXISTS \`session\` (
        \`id\` varchar(36) NOT NULL,
        \`expiresAt\` timestamp(3) NOT NULL,
        \`token\` varchar(255) NOT NULL,
        \`createdAt\` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`ipAddress\` text,
        \`userAgent\` text,
        \`userId\` varchar(36) NOT NULL,
        \`impersonatedBy\` text,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`);

      // user
      await db.execute(`CREATE TABLE IF NOT EXISTS \`user\` (
        \`id\` varchar(36) NOT NULL,
        \`name\` varchar(255) NOT NULL,
        \`email\` varchar(255) NOT NULL,
        \`emailVerified\` tinyint(1) NOT NULL,
        \`image\` longtext,
        \`createdAt\` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`role\` varchar(5) NOT NULL DEFAULT 'user',
        \`banned\` tinyint(1) DEFAULT NULL,
        \`banReason\` text,
        \`banExpires\` timestamp(3) NULL DEFAULT NULL,
        \`displayUsername\` text,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`);

      // verification
      await db.execute(`CREATE TABLE IF NOT EXISTS \`verification\` (
        \`id\` varchar(36) NOT NULL,
        \`identifier\` varchar(255) NOT NULL,
        \`value\` text NOT NULL,
        \`expiresAt\` timestamp(3) NOT NULL,
        \`createdAt\` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`);
    },
  },

  {
    // Hash any API keys still stored in plaintext so the on-verify plaintext
    // fallback can be removed. Plaintext keys are 32-char tokens; SHA-256
    // digests are 64 hex chars, so LENGTH = 32 selects exactly the legacy rows.
    // MySQL's SHA2(x, 256) yields the same lowercase-hex digest as Node's
    // createHash('sha256') (see server/utils/apiKey.ts) for these ASCII tokens,
    // so migrated keys match what verifyApiKey computes. The `start` column
    // (first 8 plaintext chars, for display) is intentionally left untouched.
    id: "0002_hash_legacy_api_keys",
    up: async (db) => {
      await db.execute(
        "UPDATE `apikey` SET `key` = SHA2(`key`, 256) WHERE LENGTH(`key`) = 32",
      );
    },
  },

  {
    // Card due dates, assignment, and per-card reminder schedule.
    id: "0003_card_due_dates_and_assignment",
    up: async (db) => {
      await db.execute(
        "ALTER TABLE `cards` ADD COLUMN `dueDate` timestamp NULL DEFAULT NULL, ADD COLUMN `assignee` varchar(255) COLLATE utf8mb4_0900_ai_ci DEFAULT NULL",
      );
      await db.execute(`CREATE TABLE IF NOT EXISTS \`card_reminders\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`card\` int NOT NULL,
        \`minutesBefore\` int NOT NULL,
        \`notified\` tinyint(1) NOT NULL DEFAULT '0',
        PRIMARY KEY (\`id\`),
        KEY \`card\` (\`card\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;`);
      // Extend the notification type enum with the two new kinds.
      await db.execute(
        "ALTER TABLE `notifications` MODIFY COLUMN `type` enum('invitation','comment','card_created','card_moved','card_status_changed','card_due','card_assigned') COLLATE utf8mb4_general_ci NOT NULL",
      );
    },
  },

  {
    // First-run onboarding flag. Existing users are marked as already
    // onboarded, so only brand-new accounts see the guided tour.
    id: "0004_user_onboarded",
    up: async (db) => {
      await db.execute(
        "ALTER TABLE `user` ADD COLUMN `onboarded` tinyint(1) NOT NULL DEFAULT '0'",
      );
      await db.execute("UPDATE `user` SET `onboarded` = 1");
    },
  },

  {
    // Split "emailed" from "read" on notifications. Previously the hourly email
    // task set `isRead = TRUE` after sending, which doubled as the unread
    // indicator — so notifications self-cleared within an hour regardless of
    // whether the user had seen them. `notified` now tracks email dedup, leaving
    // `isRead` to mean "the user has actually viewed it" (opened the card, or the
    // board for non-card notifications). Existing already-emailed notifications
    // are marked notified so they aren't re-sent.
    id: "0005_notifications_notified_flag",
    up: async (db) => {
      await db.execute(
        "ALTER TABLE `notifications` ADD COLUMN `notified` tinyint(1) NOT NULL DEFAULT '0'",
      );
      await db.execute(
        "UPDATE `notifications` SET `notified` = 1 WHERE `isRead` = 1",
      );
    },
  },

  // To add a further schema change, append a new migration here, e.g.:
  // {
  //   id: "0006_add_x",
  //   up: async (db) => {
  //     await db.execute("ALTER TABLE `cards` ADD COLUMN `x` int NULL");
  //   },
  // },
];

let migrationPromise: Promise<void> | null = null;

/**
 * Apply any not-yet-applied migrations, once. Safe to call repeatedly — the work
 * happens a single time per process. Called at server startup; the server should
 * not begin serving requests until this resolves.
 */
export function runMigrations(): Promise<void> {
  if (!migrationPromise) {
    migrationPromise = applyMigrations().catch((err) => {
      // Allow a later call to retry after a transient failure.
      migrationPromise = null;
      throw err;
    });
  }
  return migrationPromise;
}

async function applyMigrations(): Promise<void> {
  // Tracks which migrations have run.
  await db.execute(`CREATE TABLE IF NOT EXISTS \`migrations\` (
    \`id\` varchar(191) NOT NULL,
    \`appliedAt\` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`);

  const [rows]: any = await db.execute("SELECT `id` FROM `migrations`");
  const applied = new Set((rows as any[]).map((r) => r.id));

  for (const migration of migrations) {
    if (applied.has(migration.id)) continue;
    await migration.up(db);
    await db.execute("INSERT INTO `migrations` (`id`) VALUES (?)", [
      migration.id,
    ]);
    logger.info(`Applied database migration: ${migration.id}`);
  }
}
