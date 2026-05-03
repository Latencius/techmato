import type { StoriesJson } from "@techmato/pipeline/broadcast/render";
import type { BroadcastSegment } from "@techmato/types";

export type StoryEntry = StoriesJson["stories"][number];

export function computeCurrentSegmentIndex(
  currentTime: number,
  segments: BroadcastSegment[],
): number | null {
  const index = segments.findIndex((segment) => {
    return segment.startSec <= currentTime && currentTime < segment.endSec;
  });

  return index >= 0 ? index : null;
}

export function pairStoriesWithSegments(
  stories: StoriesJson,
  segments: BroadcastSegment[],
): Array<{ story: StoryEntry | null; segment: BroadcastSegment }> {
  const storiesByUrl = new Map(
    stories.stories
      .filter((story) => story.includedInScript)
      .map((story) => [story.url, story] as const),
  );

  return segments.map((segment) => ({
    story: storiesByUrl.get(segment.url) ?? null,
    segment,
  }));
}
