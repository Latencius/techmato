export type SubtitleCue = {
  text: string;
  startSec: number;
  endSec: number;
};

export type CaptionsFile = {
  cues: SubtitleCue[];
};

export function buildVtt(cues: SubtitleCue[]): string {
  const lines = ["WEBVTT", ""];
  let cueNumber = 1;

  for (const cue of cues) {
    const text = cue.text.trim();

    if (!text) {
      continue;
    }

    if (text.includes("-->")) {
      throw new Error("cue text contains '-->' sequence");
    }

    lines.push(
      String(cueNumber),
      `${formatTimestamp(cue.startSec)} --> ${formatTimestamp(cue.endSec)}`,
      text,
      "",
    );
    cueNumber += 1;
  }

  return `${lines.join("\n")}\n`;
}

function formatTimestamp(value: number): string {
  const safeValue = Math.max(value, 0);
  const totalMs = Math.round(safeValue * 1000);
  const hours = Math.floor(totalMs / 3_600_000);
  const minutes = Math.floor((totalMs % 3_600_000) / 60_000);
  const seconds = Math.floor((totalMs % 60_000) / 1000);
  const milliseconds = totalMs % 1000;

  return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(seconds, 2)}.${pad(milliseconds, 3)}`;
}

function pad(value: number, length: number): string {
  return String(value).padStart(length, "0");
}
