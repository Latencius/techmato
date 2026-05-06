import { describe, expect, it } from "vitest";
import { buildVtt } from "./captions.js";

describe("buildVtt", () => {
  it("renders an empty WebVTT document", () => {
    expect(buildVtt([])).toBe("WEBVTT\n\n");
  });

  it("renders one cue with a WebVTT header", () => {
    expect(buildVtt([{ text: "こんにちは。", startSec: 1.5, endSec: 4.2 }])).toBe(
      "WEBVTT\n\n1\n00:00:01.500 --> 00:00:04.200\nこんにちは。\n\n",
    );
  });

  it("renders multiple cues and skips blank text while keeping cue numbers contiguous", () => {
    expect(
      buildVtt([
        { text: "最初です。", startSec: 0, endSec: 1 },
        { text: "   ", startSec: 1, endSec: 2 },
        { text: "次です。", startSec: 3661.234, endSec: 3662.5 },
      ]),
    ).toBe(
      [
        "WEBVTT",
        "",
        "1",
        "00:00:00.000 --> 00:00:01.000",
        "最初です。",
        "",
        "2",
        "01:01:01.234 --> 01:01:02.500",
        "次です。",
        "",
        "",
      ].join("\n"),
    );
  });

  it("rejects cue text containing a WebVTT arrow sequence", () => {
    expect(() => buildVtt([{ text: "A --> B", startSec: 0, endSec: 1 }])).toThrow(
      "cue text contains '-->' sequence",
    );
  });
});
