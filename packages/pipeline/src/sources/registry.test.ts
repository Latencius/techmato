import { describe, expect, it } from "vitest";
import { SOURCES } from "./registry.js";

describe("SOURCES", () => {
  it("includes the enabled MVP RSS sources from docs/SOURCES.md", () => {
    expect(SOURCES.filter((source) => source.enabled).map((source) => source.id)).toEqual([
      "hackernews",
      "techcrunch",
      "theverge",
      "arstechnica",
      "github",
      "publickey",
    ]);
  });
});
