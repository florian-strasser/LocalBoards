import { htmlToMarkdown } from "../utils/markdown";

// Converts the legacy HTML in `cards.content` and `comments.content` to
// Markdown in place, backing up the original HTML into
// `<table>_content_html_backup` first so the change is reversible.
//
// Crash-safety matters more here than anywhere else in the schema: the row loop
// is not transactional and the migration id is only recorded once `up()`
// returns, so a crash partway through means this runs again from the top. Two
// rules make that harmless:
//
//   1. The backup is written with INSERT IGNORE, so the pristine HTML for a row
//      is captured exactly once and can never be overwritten by a later pass.
//   2. Conversion reads from the backup (the original HTML) and marks the row
//      `convertedAt`, so no row is ever converted twice.
//
// Both matter because htmlToMarkdown is NOT a no-op on Markdown — Turndown
// parses its input as HTML, so a second pass over converted content would
// flatten it to one line and backslash-escape every metacharacter.
// Used by migration 0007 and covered by unit + integration tests.
export async function convertContentColumnsToMarkdown(db: any): Promise<void> {
  const backupAndConvert = async (table: string) => {
    const backup = `${table}_content_html_backup`;
    await db.execute(
      `CREATE TABLE IF NOT EXISTS \`${backup}\` (\`id\` int NOT NULL, \`content\` longtext, \`convertedAt\` datetime DEFAULT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    );

    // A backup table left behind by an earlier build predates `convertedAt`,
    // and MySQL has no ADD COLUMN IF NOT EXISTS — check the catalogue first.
    const [columns]: any = await db.execute(
      "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = 'convertedAt'",
      [backup],
    );
    if (columns.length === 0) {
      await db.execute(
        `ALTER TABLE \`${backup}\` ADD COLUMN \`convertedAt\` datetime DEFAULT NULL`,
      );
    }

    // IGNORE, never "ON DUPLICATE KEY UPDATE": the first capture is the only
    // trustworthy one.
    await db.execute(
      `INSERT IGNORE INTO \`${backup}\` (id, content) SELECT id, content FROM \`${table}\` WHERE content IS NOT NULL AND content <> ''`,
    );

    // Convert from the backup's original HTML rather than from whatever the
    // table currently holds — that is what makes a resumed run correct.
    const [rows]: any = await db.execute(
      `SELECT id, content FROM \`${backup}\` WHERE convertedAt IS NULL AND content IS NOT NULL AND content <> ''`,
    );
    for (const row of rows) {
      const markdown = htmlToMarkdown(row.content);
      await db.execute(`UPDATE \`${table}\` SET content = ? WHERE id = ?`, [
        markdown,
        row.id,
      ]);
      await db.execute(
        `UPDATE \`${backup}\` SET convertedAt = NOW() WHERE id = ?`,
        [row.id],
      );
    }
  };

  await backupAndConvert("cards");
  await backupAndConvert("comments");
}
