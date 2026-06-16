import { describe, expect, it } from "vitest";
import {
  formatUtc,
  pluralize,
  sourceRepoUrl,
  truncSha,
} from "./format";

describe("format", () => {
  it("truncates SHAs to a default 7 chars", () => {
    expect(truncSha("0123456789abcdef")).toBe("0123456");
    expect(truncSha(undefined)).toBe("");
    expect(truncSha(null)).toBe("");
  });

  it("formats ISO timestamps in human-readable UTC", () => {
    expect(formatUtc("2026-06-10T20:46:00Z")).toBe("2026-06-10 20:46 UTC");
    expect(formatUtc(undefined)).toBe("unknown");
  });

  it("builds repo URLs at the right ref and subpath", () => {
    expect(sourceRepoUrl("coder/registry", "main", ".agents/skills/setup")).toBe(
      "https://github.com/coder/registry/tree/main/.agents/skills/setup",
    );
    expect(sourceRepoUrl("coder/registry")).toBe(
      "https://github.com/coder/registry",
    );
  });

  it("pluralizes English nouns", () => {
    expect(pluralize(0, "skill")).toBe("0 skills");
    expect(pluralize(1, "skill")).toBe("1 skill");
    expect(pluralize(7, "person", "people")).toBe("7 people");
  });
});
