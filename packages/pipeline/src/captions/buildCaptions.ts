import type { TtsCue } from "../tts/tts.js";
import type { SubtitleCue } from "./captions.js";

export function buildSubtitleCues(cues: TtsCue[], gapSec: number): SubtitleCue[] {
  const subtitleCues: SubtitleCue[] = [];
  let cursor = 0;

  for (const [index, cue] of cues.entries()) {
    let chunkCursor = cursor;
    const chunks =
      cue.chunks && cue.chunks.length > 0
        ? cue.chunks
        : [{ text: cue.text, durationSec: cue.durationSec }];

    for (const chunk of chunks) {
      const startSec = chunkCursor;
      const endSec = startSec + chunk.durationSec;
      subtitleCues.push({
        text: chunk.text,
        startSec,
        endSec,
      });
      chunkCursor = endSec;
    }

    cursor += cue.durationSec;

    if (index < cues.length - 1) {
      cursor += gapSec;
    }
  }

  return subtitleCues;
}
