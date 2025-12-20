import Database from "better-sqlite3";

export function setupDatabase(dbPath: string) {
  const db = new Database(dbPath);

  // Create boards table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS boards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user TEXT NOT NULL,
      name TEXT NOT NULL,
      style TEXT CHECK(style IN ('kanban', 'todo')) DEFAULT 'kanban',
      status TEXT CHECK(status IN ('private', 'public')) DEFAULT 'private'
    );
  `);

  // Create areas table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS areas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      board INTEGER NOT NULL,
      name TEXT NOT NULL,
      sort INTEGER DEFAULT 0,
      FOREIGN KEY (board) REFERENCES boards(id)
    );
  `);

  // Create cards table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      area INTEGER NOT NULL,
      name TEXT NOT NULL,
      sort INTEGER DEFAULT 0,
      content TEXT,
      status BOOLEAN DEFAULT FALSE,
      FOREIGN KEY (area) REFERENCES areas(id)
    );
  `);

  // Create comments table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card INTEGER NOT NULL,
      user TEXT NOT NULL,
      content TEXT,
      date TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (card) REFERENCES cards(id)
    );
  `);

  // Create invitations table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS invitations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      board INTEGER NOT NULL,
      user TEXT NOT NULL,
      date TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (board) REFERENCES boards(id)
    );
  `);

  return db;
}
