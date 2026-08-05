import { describe, it, expect } from "vitest";
import { checklistProgress } from "../app/utils/checklistProgress";

describe("checklistProgress", () => {
  it("counts unchecked and checked task items", () => {
    expect(
      checklistProgress("- [ ] one\n- [x] two\n- [ ] three"),
    ).toEqual({ done: 1, total: 3 });
  });

  it("is empty for content without a checklist", () => {
    expect(checklistProgress("# Heading\n\nSome **text** and a - dash")).toEqual(
      { done: 0, total: 0 },
    );
    expect(checklistProgress("")).toEqual({ done: 0, total: 0 });
    expect(checklistProgress(null)).toEqual({ done: 0, total: 0 });
    expect(checklistProgress(undefined)).toEqual({ done: 0, total: 0 });
  });

  it("accepts the other bullet markers, ordered items and uppercase X", () => {
    expect(
      checklistProgress("* [X] a\n+ [ ] b\n1. [x] c\n2) [ ] d"),
    ).toEqual({ done: 2, total: 4 });
  });

  it("counts nested items", () => {
    expect(
      checklistProgress("- [ ] parent\n    - [x] child\n\t- [x] tabbed"),
    ).toEqual({ done: 2, total: 3 });
  });

  it("ignores lines inside fenced code blocks", () => {
    const md = [
      "- [x] real",
      "",
      "```markdown",
      "- [ ] not a real checkbox",
      "- [x] nor this one",
      "```",
      "",
      "- [ ] also real",
    ].join("\n");
    expect(checklistProgress(md)).toEqual({ done: 1, total: 2 });
  });

  it("does not mistake links or plain brackets for task items", () => {
    expect(
      checklistProgress("- [a link](https://example.com)\n- [ ]nospace\n- [] empty"),
    ).toEqual({ done: 0, total: 0 });
  });
});
