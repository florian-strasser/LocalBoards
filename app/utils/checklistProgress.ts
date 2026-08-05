// Counts the task-list items in a card description.
//
// Descriptions are stored as Markdown, so a checklist is just lines like
// `- [ ] item` / `- [x] item`. Deriving the progress from the content the board
// already loads means there is nothing extra to keep in sync: whenever a card's
// content changes — edited here, ticked in the read view, or arriving over the
// socket from someone else — the count follows automatically.
export type ChecklistProgress = { done: number; total: number };

// GitHub-flavoured task items: a bullet or ordered marker, then [ ], [x] or [X].
// Leading whitespace allows nested lists.
const TASK_ITEM = /^[ \t]*(?:[-*+]|\d+[.)])[ \t]+\[([ xX])\][ \t]/;

export function checklistProgress(
  markdown?: string | null,
): ChecklistProgress {
  if (!markdown) return { done: 0, total: 0 };

  // A fenced code block can contain lines that look exactly like task items
  // (documentation about Markdown, for one), and those aren't checkboxes.
  const withoutCode = markdown.replace(/^[ \t]*```[\s\S]*?^[ \t]*```/gm, "");

  let done = 0;
  let total = 0;
  for (const line of withoutCode.split("\n")) {
    const match = line.match(TASK_ITEM);
    if (!match) continue;
    total += 1;
    if (match[1] !== " ") done += 1;
  }
  return { done, total };
}
