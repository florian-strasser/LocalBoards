import { createPool } from "mysql2/promise";
const runtimeConfig = useRuntimeConfig();
const mysqlHost = runtimeConfig.mysqlHost;
const mysqlUser = runtimeConfig.mysqlUser;
const mysqlPassword = runtimeConfig.mysqlPassword;
const mysqlDatabase = runtimeConfig.mysqlDatabase;

// Enable TLS when the database server requires it (e.g. managed/external MySQL
// such as Mittwald). Opt-in via NUXT_MYSQL_SSL=true so local/compose MySQL
// without TLS keeps working. Certificate verification stays on by default;
// set NUXT_MYSQL_SSL_REJECT_UNAUTHORIZED=false only if the server presents a
// certificate that can't be verified against a public CA.
const mysqlSsl = String(runtimeConfig.mysqlSsl).toLowerCase() === "true";
const mysqlSslRejectUnauthorized =
  String(runtimeConfig.mysqlSslRejectUnauthorized).toLowerCase() !== "false";

const db = createPool({
  host: mysqlHost,
  user: mysqlUser,
  password: mysqlPassword,
  database: mysqlDatabase,
  timezone: "Z", // Important to ensure consistent timezone values
  ...(mysqlSsl
    ? { ssl: { rejectUnauthorized: mysqlSslRejectUnauthorized } }
    : {}),
});

export function setupDatabase() {
  // Create account table
  db.execute(`CREATE TABLE IF NOT EXISTS \`account\` (
    \`id\` varchar(36) NOT NULL,
    \`accountId\` text NOT NULL,
    \`providerId\` text NOT NULL,
    \`userId\` varchar(36) NOT NULL,
    \`password\` text,
    \`createdAt\` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updatedAt\` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`);

  // Create apikey table
  db.execute(`CREATE TABLE IF NOT EXISTS \`apikey\` (
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

  // Create boards table
  db.execute(`CREATE TABLE IF NOT EXISTS \`boards\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`user\` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
    \`name\` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
    \`style\` enum('kanban','todo','notices') COLLATE utf8mb4_general_ci DEFAULT 'kanban',
    \`status\` enum('private','public') COLLATE utf8mb4_general_ci DEFAULT 'private',
    \`image\` longtext COLLATE utf8mb4_general_ci,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;`);

  // Create areas table
  db.execute(`CREATE TABLE IF NOT EXISTS \`areas\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`board\` int NOT NULL,
    \`name\` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
    \`sort\` int DEFAULT '0',
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;`);

  // Create cards table
  db.execute(`CREATE TABLE IF NOT EXISTS \`cards\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`area\` int NOT NULL,
    \`name\` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
    \`sort\` int DEFAULT '0',
    \`content\` longtext COLLATE utf8mb4_general_ci,
    \`status\` tinyint(1) DEFAULT '0',
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;`);

  // Create attachments table
  db.execute(`CREATE TABLE IF NOT EXISTS \`attachments\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`card\` int NOT NULL,
    \`filename\` varchar(255) NOT NULL,
    \`filetype\` varchar(100) NOT NULL,
    \`filesize\` int NOT NULL,
    \`filedata\` longtext NOT NULL,
    \`createdAt\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`);

  // Create comments table
  db.execute(`CREATE TABLE IF NOT EXISTS \`comments\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`card\` int NOT NULL,
    \`user\` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
    \`content\` longtext COLLATE utf8mb4_general_ci,
    \`date\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;`);

  // Create invitations table
  db.execute(`CREATE TABLE IF NOT EXISTS \`invitations\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`board\` int NOT NULL,
    \`user\` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
    \`permission\` enum('read','edit') COLLATE utf8mb4_general_ci DEFAULT 'read',
    \`date\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;`);

  // Create notifications table
  db.execute(`CREATE TABLE IF NOT EXISTS \`notifications\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`userId\` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
    \`type\` enum('invitation','comment','card_created','card_moved','card_status_changed') COLLATE utf8mb4_general_ci NOT NULL,
    \`boardId\` int DEFAULT NULL,
    \`cardId\` int DEFAULT NULL,
    \`message\` longtext COLLATE utf8mb4_general_ci,
    \`isRead\` tinyint(1) DEFAULT '0',
    \`createdAt\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;`);

  // Create session table
  db.execute(`CREATE TABLE IF NOT EXISTS \`session\` (
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

  // Create user table
  db.execute(`CREATE TABLE IF NOT EXISTS \`user\` (
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

  // Create verification table
  db.execute(`CREATE TABLE IF NOT EXISTS \`verification\` (
    \`id\` varchar(36) NOT NULL,
    \`identifier\` varchar(255) NOT NULL,
    \`value\` text NOT NULL,
    \`expiresAt\` timestamp(3) NOT NULL,
    \`createdAt\` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updatedAt\` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`);

  return db;
}
