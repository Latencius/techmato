import type { BroadcastSegment } from "@techmato/types";
import { describe, expect, it } from "vitest";
import { computeCurrentSegmentIndex, pairStoriesWithSegments } from "./segmentTimeline.js";

const segments: BroadcastSegment[] = [
  {
    title: "First",
    url: "https://example.com/first",
    source: "Source",
    startSec: 1.8,
    endSec: 3.3,
  },
  {
    title: "Second",
    url: "https://example.com/second",
    source: "Source",
    startSec: 3.6,
    endSec: 5.1,
  },
];

describe("computeCurrentSegmentIndex", () => {
  it("returns null during opening and closing", () => {
    expect(computeCurrentSegmentIndex(1.7, segments)).toBeNull();
    expect(computeCurrentSegmentIndex(5.1, segments)).toBeNull();
  });

  it("returns the segment index inside start-inclusive and end-exclusive ranges", () => {
    expect(computeCurrentSegmentIndex(1.8, segments)).toBe(0);
    expect(computeCurrentSegmentIndex(3.29, segments)).toBe(0);
    expect(computeCurrentSegmentIndex(3.6, segments)).toBe(1);
  });
});

describe("pairStoriesWithSegments", () => {
  it("pairs stories and segments by URL", () => {
    const pairs = pairStoriesWithSegments(
      {
        selectedAt: "2026-05-03T12:00:00+09:00",
        stories: [
          story("Second", "https://example.com/second"),
          story("First", "https://example.com/first"),
        ],
      },
      segments,
    );

    expect(pairs.map((pair) => pair.story?.title)).toEqual(["First", "Second"]);
  });

  it("uses null when a segment has no matching story", () => {
    const pairs = pairStoriesWithSegments(
      {
        selectedAt: "2026-05-03T12:00:00+09:00",
        stories: [story("First", "https://example.com/first")],
      },
      segments,
    );

    expect(pairs[1]?.story).toBeNull();
  });
});

function story(title: string, url: string) {
  return {
    title,
    url,
    source: "Source",
    publishedAt: "2026-05-03T00:00:00.000Z",
    summary: "Summary",
    contentPreview: "Preview",
    selectionReason: "Useful",
    includedInScript: true,
  };
}
