import { createPool } from "mysql2/promise";

const mysqlHost =
  process.env.MYSQL_HOST || "mysql-psrpqd.pg-s-d693st.db.project.host";
const mysqlUser = process.env.MYSQL_USER || "dbu_psrpqd_1";
const mysqlPassword = process.env.MYSQL_PASSWORD || "suj#HH8y9PfbWswS";
const mysqlDatabase = process.env.MYSQL_DATABASE || "mysql_psrpqd";

export function setupDatabase() {
  const db = createPool({
    host: mysqlHost,
    user: mysqlUser,
    password: mysqlPassword,
    database: mysqlDatabase,
    timezone: "Z", // Important to ensure consistent timezone values
  });

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
      date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (board) REFERENCES boards(id)
    );
  `);

  return db;
}
