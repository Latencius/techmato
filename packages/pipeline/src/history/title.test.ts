import { describe, expect, it } from "vitest";
import { buildTitle } from "./title.js";

describe("buildTitle", () => {
  it("uses the only story title as-is", () => {
    expect(buildTitle([{ title: "Aの記事" }])).toBe("Aの記事");
  });

  it("adds the remaining story count for two stories", () => {
    expect(buildTitle([{ title: "Aの記事" }, { title: "Bの記事" }])).toBe("Aの記事 ほか1件");
  });

  it("adds the remaining story count for four stories", () => {
    expect(
      buildTitle([
        { title: "Aの記事" },
        { title: "Bの記事" },
        { title: "Cの記事" },
        { title: "Dの記事" },
      ]),
    ).toBe("Aの記事 ほか3件");
  });

  it("truncates the first title to 40 characters before adding the count", () => {
    const title = "1234567890123456789012345678901234567890ABCDEFGHIJ";

    expect(buildTitle([{ title }, { title: "B" }])).toBe(
      "1234567890123456789012345678901234567890... ほか1件",
    );
  });

  it("returns an untitled fallback when there are no stories", () => {
    expect(buildTitle([])).toBe("(無題)");
  });
});
