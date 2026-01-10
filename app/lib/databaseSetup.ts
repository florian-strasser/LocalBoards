import { createPool } from "mysql2/promise";
const runtimeConfig = useRuntimeConfig();
const mysqlHost = runtimeConfig.mysqlHost;
const mysqlUser = runtimeConfig.mysqlUser;
const mysqlPassword = runtimeConfig.mysqlPassword;
const mysqlDatabase = runtimeConfig.mysqlDatabase;

const db = createPool({
  host: mysqlHost,
  user: mysqlUser,
  password: mysqlPassword,
  database: mysqlDatabase,
  timezone: "Z", // Important to ensure consistent timezone values
});

export function setupDatabase() {
  // Create better-auth tables
  // Create better-auth tables
  db.execute(`CREATE TABLE IF NOT EXISTS \`account\` (
      \`id\` varchar(36) NOT NULL,
      \`accountId\` text NOT NULL,
      \`providerId\` text NOT NULL,
      \`userId\` varchar(36) NOT NULL,
      \`accessToken\` text,
      \`refreshToken\` text,
      \`idToken\` text,
      \`accessTokenExpiresAt\` timestamp(3) NULL DEFAULT NULL,
      \`refreshTokenExpiresAt\` timestamp(3) NULL DEFAULT NULL,
      \`scope\` text,
      \`password\` text,
      \`createdAt\` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` timestamp(3) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`);

  // Create the session table for better-auth
  db.execute(`CREATE TABLE IF NOT EXISTS \`session\` (
      \`id\` varchar(36) NOT NULL,
      \`expiresAt\` timestamp(3) NOT NULL,
      \`token\` varchar(255) NOT NULL,
      \`createdAt\` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` timestamp(3) NOT NULL,
      \`ipAddress\` text,
      \`userAgent\` text,
      \`userId\` varchar(36) NOT NULL,
      \`impersonatedBy\` text
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`);

  // Create the user table for better-auth
  db.execute(`CREATE TABLE IF NOT EXISTS \`user\` (
      \`id\` varchar(36) NOT NULL,
      \`name\` varchar(255) NOT NULL,
      \`email\` varchar(255) NOT NULL,
      \`emailVerified\` tinyint(1) NOT NULL,
      \`image\` text,
      \`createdAt\` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`role\` text,
      \`banned\` tinyint(1) DEFAULT NULL,
      \`banReason\` text,
      \`banExpires\` timestamp(3) NULL DEFAULT NULL,
      \`username\` varchar(255) DEFAULT NULL,
      \`displayUsername\` text
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`);

  // Create the verification table for better-auth
  db.execute(`CREATE TABLE IF NOT EXISTS \`verification\` (
      \`id\` varchar(36) NOT NULL,
      \`identifier\` varchar(255) NOT NULL,
      \`value\` text NOT NULL,
      \`expiresAt\` timestamp(3) NOT NULL,
      \`createdAt\` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;`);

  // Create tables in the correct order for foreign key constraints
  // 1. Boards (no dependencies)
  db.execute(`
    CREATE TABLE IF NOT EXISTS boards (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      style ENUM('kanban', 'todo') DEFAULT 'kanban',
      status ENUM('private', 'public') DEFAULT 'private'
    );
  `);

  // 2. Areas (depends on boards)
  db.execute(`
    CREATE TABLE IF NOT EXISTS areas (
      id INT PRIMARY KEY AUTO_INCREMENT,
      board INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      sort INT DEFAULT 0,
      FOREIGN KEY (board) REFERENCES boards(id)
    );
  `);

  // 3. Cards (depends on areas)
  db.execute(`
    CREATE TABLE IF NOT EXISTS cards (
      id INT PRIMARY KEY AUTO_INCREMENT,
      area INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      sort INT DEFAULT 0,
      content LONGTEXT,
      status BOOLEAN DEFAULT FALSE,
      FOREIGN KEY (area) REFERENCES areas(id)
    );
  `);

  // 4. Comments (depends on cards)
  db.execute(`
    CREATE TABLE IF NOT EXISTS comments (
      id INT PRIMARY KEY AUTO_INCREMENT,
      card INT NOT NULL,
      user VARCHAR(255) NOT NULL,
      content LONGTEXT,
      date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (card) REFERENCES cards(id)
    );
  `);

  // 5. Invitations (depends on boards)
  db.execute(`
    CREATE TABLE IF NOT EXISTS invitations (
      id INT PRIMARY KEY AUTO_INCREMENT,
      board INT NOT NULL,
      user VARCHAR(255) NOT NULL,
      permission ENUM('read', 'edit') DEFAULT 'read',
      date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (board) REFERENCES boards(id)
    );
  `);
  // 6. Notifications (depends on boards and cards)
  db.execute(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT PRIMARY KEY AUTO_INCREMENT,
        userId VARCHAR(255) NOT NULL,
        type ENUM('invitation', 'comment', 'card_created') NOT NULL,
        boardId INT,
        cardId INT,
        message TEXT,
        isRead BOOLEAN DEFAULT FALSE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (boardId) REFERENCES boards(id),
        FOREIGN KEY (cardId) REFERENCES cards(id)
      );
  `);
  return db;
}
