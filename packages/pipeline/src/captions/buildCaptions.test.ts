import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { TtsCue } from "../tts/tts.js";
import { buildSubtitleCues } from "./buildCaptions.js";

describe("buildSubtitleCues", () => {
  it("turns TTS cue chunks into absolute subtitle times with gaps between cues", () => {
    const cues = buildSubtitleCues(
      [
        cue(0, "opening", 2, [
          { text: "開幕です。", durationSec: 1 },
          { text: "続きです。", durationSec: 1 },
        ]),
        cue(1, "segment", 2, [
          { text: "記事です。", durationSec: 0.75 },
          { text: "詳しくです。", durationSec: 1.25 },
        ]),
      ],
      0.3,
    );

    expect(cues).toEqual([
      { text: "開幕です。", startSec: 0, endSec: 1 },
      { text: "続きです。", startSec: 1, endSec: 2 },
      { text: "記事です。", startSec: 2.3, endSec: 3.05 },
      { text: "詳しくです。", startSec: 3.05, endSec: 4.3 },
    ]);
  });

  it("falls back to cue text when chunk metadata is missing or empty", () => {
    expect(buildSubtitleCues([cue(0, "opening", 1.5, [])], 0)).toEqual([
      { text: "opening text", startSec: 0, endSec: 1.5 },
    ]);
  });
});

function cue(
  index: number,
  kind: TtsCue["kind"],
  durationSec: number,
  chunks?: TtsCue["chunks"],
): TtsCue {
  return {
    index,
    kind,
    text: `${kind} text`,
    filePath: join("tmp", `voice-${index + 1}.wav`),
    durationSec,
    ...(chunks ? { chunks } : {}),
  };
}
