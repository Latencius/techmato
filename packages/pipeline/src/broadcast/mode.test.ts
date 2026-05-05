import { describe, expect, it } from "vitest";
import { BROADCAST_MODES } from "./mode.js";

describe("BROADCAST_MODES", () => {
  it("defines short and long broadcast mode defaults", () => {
    expect(BROADCAST_MODES.short).toMatchObject({
      mode: "short",
      maxStories: 4,
      scriptMin: 250,
      scriptMax: 450,
      selectPromptKey: "1. 記事選定プロンプト",
      scriptPromptKey: "2. 台本生成プロンプト",
      shortenPromptKey: "3. 短縮再生成プロンプト",
    });
    expect(BROADCAST_MODES.long).toMatchObject({
      mode: "long",
      maxStories: 3,
      scriptMin: 1700,
      scriptMax: 2200,
      selectPromptKey: "4. 長尺記事選定プロンプト",
      scriptPromptKey: "5. 長尺台本生成プロンプト",
      shortenPromptKey: "6. 長尺短縮再生成プロンプト",
    });
  });
});
