import { describe, it, expect, beforeAll } from "vitest";
import { migrate, db, resetData } from "./db";
import { convertContentColumnsToMarkdown } from "../../app/lib/contentMarkdownMigration";

// Verifies the HTML->Markdown content migration (migration 0007) against a real
// MySQL: it converts card/comment content in place and keeps the original HTML
// in a backup table.
describe("content markdown migration", () => {
  beforeAll(async () => {
    await migrate();
  });

  it("converts card + comment HTML to Markdown and backs up the original", async () => {
    const pool = db();
    await resetData();

    const cardHtml =
      '<p>Hello <strong>world</strong></p>' +
      '<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked><span></span></label><div><p>done</p></div></li></ul>';
    const commentHtml = "<p>Nice <em>work</em></p>";

    await pool.execute(
      "INSERT INTO `boards` (id, user, name, status) VALUES (1, 'u1', 'B', 'private')",
    );
    await pool.execute(
      "INSERT INTO `areas` (id, board, name, sort) VALUES (1, 1, 'A', 0)",
    );
    await pool.execute(
      "INSERT INTO `cards` (id, area, name, sort, content) VALUES (1, 1, 'C', 0, ?)",
      [cardHtml],
    );
    await pool.execute(
      "INSERT INTO `comments` (id, card, content) VALUES (1, 1, ?)",
      [commentHtml],
    );

    await convertContentColumnsToMarkdown(pool);

    const [[card]]: any = await pool.query(
      "SELECT content FROM `cards` WHERE id = 1",
    );
    expect(card.content).toContain("Hello **world**");
    expect(card.content).toContain("- [x] done");
    expect(card.content).not.toContain("<p>");
    expect(card.content).not.toContain("data-type");

    const [[comment]]: any = await pool.query(
      "SELECT content FROM `comments` WHERE id = 1",
    );
    expect(comment.content).toBe("Nice _work_");

    // Original HTML preserved in the backup tables.
    const [[cardBackup]]: any = await pool.query(
      "SELECT content FROM `cards_content_html_backup` WHERE id = 1",
    );
    expect(cardBackup.content).toBe(cardHtml);
    const [[commentBackup]]: any = await pool.query(
      "SELECT content FROM `comments_content_html_backup` WHERE id = 1",
    );
    expect(commentBackup.content).toBe(commentHtml);
  });

  // The migration id is only recorded after the row loop finishes, so a crash
  // partway through re-runs the whole thing. A second pass must be a no-op:
  // htmlToMarkdown is NOT idempotent (Turndown parses its input as HTML, so
  // Markdown fed back in collapses to one line with every metacharacter
  // escaped), and the backup must never be overwritten with converted content.
  it("is safe to run twice: content and backup are unchanged", async () => {
    const pool = db();
    await resetData();

    const cardHtml =
      "<h1>Heading</h1><ul><li>item one</li><li>item two</li></ul>" +
      "<p><strong>bold</strong> and 100 * 3</p>";
    const commentHtml = "<p>Nice <em>work</em></p>";

    await pool.execute(
      "INSERT INTO `boards` (id, user, name, status) VALUES (1, 'u1', 'B', 'private')",
    );
    await pool.execute(
      "INSERT INTO `areas` (id, board, name, sort) VALUES (1, 1, 'A', 0)",
    );
    await pool.execute(
      "INSERT INTO `cards` (id, area, name, sort, content) VALUES (1, 1, 'C', 0, ?)",
      [cardHtml],
    );
    await pool.execute(
      "INSERT INTO `comments` (id, card, content) VALUES (1, 1, ?)",
      [commentHtml],
    );

    await convertContentColumnsToMarkdown(pool);
    const [[afterFirst]]: any = await pool.query(
      "SELECT content FROM `cards` WHERE id = 1",
    );

    await convertContentColumnsToMarkdown(pool);
    const [[afterSecond]]: any = await pool.query(
      "SELECT content FROM `cards` WHERE id = 1",
    );

    // Byte-identical, and still structured Markdown rather than the single
    // backslash-escaped line a second conversion pass would produce.
    expect(afterSecond.content).toBe(afterFirst.content);
    expect(afterSecond.content).toContain("# Heading");
    expect(afterSecond.content).toContain("\n"); // not flattened to one line
    expect(afterSecond.content).not.toContain("\\#"); // heading not re-escaped
    expect(afterSecond.content).not.toContain("\\*\\*bold"); // bold not re-escaped

    // The pristine HTML backup survives the second pass, so rollback is still
    // possible — this is what makes a resumed migration recoverable.
    const [[cardBackup]]: any = await pool.query(
      "SELECT content FROM `cards_content_html_backup` WHERE id = 1",
    );
    expect(cardBackup.content).toBe(cardHtml);
    const [[commentBackup]]: any = await pool.query(
      "SELECT content FROM `comments_content_html_backup` WHERE id = 1",
    );
    expect(commentBackup.content).toBe(commentHtml);
  });
});
