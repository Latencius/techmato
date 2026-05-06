import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import type { BroadcastSegment } from "@techmato/types";
import { err, ok, type Result } from "neverthrow";
import { buildSubtitleCues } from "../captions/buildCaptions.js";
import type { SubtitleCue } from "../captions/captions.js";
import type { TtsCue, TtsManifest } from "../tts/tts.js";

export type SegmentMetadata = {
  title: string;
  url: string;
  source: string;
};

export type MergeOptions = {
  manifest: TtsManifest;
  segmentMetadata: SegmentMetadata[];
  outputDir: string;
  outputFileName?: string;
  gapMs?: number;
  ffmpegPath?: string;
};

export type MergeResult = {
  audioPath: string;
  totalDurationSec: number;
  segments: BroadcastSegment[];
  subtitleCues: SubtitleCue[];
};

export type MergeError =
  | { type: "ffmpeg_not_found"; message: string }
  | {
      type: "ffmpeg_failed";
      exitCode: number | null;
      stderr: string;
      stage: "silence" | "concat";
    }
  | { type: "metadata_mismatch"; expected: number; actual: number }
  | { type: "write_failed"; filePath: string; message: string; cause?: unknown };

export type FfmpegRunner = (
  ffmpegPath: string,
  args: string[],
) => Promise<{ exitCode: number | null; stderr: string }>;

const DEFAULT_OUTPUT_FILE_NAME = "broadcast.wav";
const DEFAULT_GAP_MS = 300;
const DEFAULT_FFMPEG_PATH = "ffmpeg";
const STDERR_LIMIT = 2000;

export async function mergeBroadcast(
  options: MergeOptions,
  runner: FfmpegRunner = defaultFfmpegRunner,
): Promise<Result<MergeResult, MergeError>> {
  const segmentCues = options.manifest.cues.filter((cue) => cue.kind === "segment");

  if (segmentCues.length !== options.segmentMetadata.length) {
    return err({
      type: "metadata_mismatch",
      expected: segmentCues.length,
      actual: options.segmentMetadata.length,
    });
  }

  const outputFileName = options.outputFileName ?? DEFAULT_OUTPUT_FILE_NAME;
  const gapSec = (options.gapMs ?? DEFAULT_GAP_MS) / 1000;
  const ffmpegPath = options.ffmpegPath ?? DEFAULT_FFMPEG_PATH;
  const silencePath = join(options.outputDir, "silence.wav");
  const concatListPath = join(options.outputDir, "concat.txt");
  const audioPath = join(options.outputDir, outputFileName);

  try {
    await mkdir(options.outputDir, { recursive: true });
  } catch (cause) {
    return err({
      type: "write_failed",
      filePath: options.outputDir,
      message: cause instanceof Error ? cause.message : "Failed to create output directory",
      cause,
    });
  }

  const silenceResult = await runFfmpeg(
    runner,
    ffmpegPath,
    silenceArgs(silencePath, gapSec),
    "silence",
  );

  if (silenceResult.isErr()) {
    return err(silenceResult.error);
  }

  try {
    await writeFile(concatListPath, concatList(options.manifest.cues), "utf8");
  } catch (cause) {
    return err({
      type: "write_failed",
      filePath: concatListPath,
      message: cause instanceof Error ? cause.message : "Failed to write concat list",
      cause,
    });
  }

  const concatResult = await runFfmpeg(
    runner,
    ffmpegPath,
    concatArgs(concatListPath, audioPath),
    "concat",
  );

  if (concatResult.isErr()) {
    return err(concatResult.error);
  }

  return ok({
    audioPath,
    totalDurationSec: totalDuration(options.manifest.cues, gapSec),
    segments: buildSegments(options.manifest.cues, options.segmentMetadata, gapSec),
    subtitleCues: buildSubtitleCues(options.manifest.cues, gapSec),
  });
}

function silenceArgs(silencePath: string, gapSec: number): string[] {
  return [
    "-y",
    "-f",
    "lavfi",
    "-i",
    "anullsrc=channel_layout=mono:sample_rate=24000",
    "-t",
    String(gapSec),
    "-c:a",
    "pcm_s16le",
    silencePath,
  ];
}

function concatArgs(concatListPath: string, audioPath: string): string[] {
  return ["-y", "-f", "concat", "-safe", "0", "-i", concatListPath, "-c", "copy", audioPath];
}

async function runFfmpeg(
  runner: FfmpegRunner,
  ffmpegPath: string,
  args: string[],
  stage: "silence" | "concat",
): Promise<Result<void, MergeError>> {
  let result: { exitCode: number | null; stderr: string };

  try {
    result = await runner(ffmpegPath, args);
  } catch (cause) {
    if (isEnoent(cause)) {
      return err({
        type: "ffmpeg_not_found",
        message: cause instanceof Error ? cause.message : "ffmpeg was not found",
      });
    }

    return err({
      type: "ffmpeg_failed",
      exitCode: null,
      stderr: cause instanceof Error ? cause.message : String(cause),
      stage,
    });
  }

  if (result.exitCode !== 0) {
    return err({
      type: "ffmpeg_failed",
      exitCode: result.exitCode,
      stderr: result.stderr.slice(0, STDERR_LIMIT),
      stage,
    });
  }

  return ok(undefined);
}

function concatList(cues: TtsCue[]): string {
  return cues
    .flatMap((cue, index) => {
      const lines = [`file '${escapeConcatPath(basename(cue.filePath))}'`];

      if (index < cues.length - 1) {
        lines.push("file 'silence.wav'");
      }

      return lines;
    })
    .join("\n");
}

function escapeConcatPath(path: string): string {
  return path.replaceAll("'", "'\\''");
}

function buildSegments(
  cues: TtsCue[],
  segmentMetadata: SegmentMetadata[],
  gapSec: number,
): BroadcastSegment[] {
  const segments: BroadcastSegment[] = [];
  let cumulative = 0;
  let metadataIndex = 0;

  for (const [index, cue] of cues.entries()) {
    const startSec = cumulative;
    const endSec = cumulative + cue.durationSec;

    if (cue.kind === "segment") {
      const metadata = segmentMetadata[metadataIndex];

      if (metadata) {
        segments.push({
          ...metadata,
          startSec,
          endSec,
        });
      }

      metadataIndex += 1;
    }

    cumulative = endSec;

    if (index < cues.length - 1) {
      cumulative += gapSec;
    }
  }

  return segments;
}

function totalDuration(cues: TtsCue[], gapSec: number): number {
  const cueDuration = cues.reduce((sum, cue) => sum + cue.durationSec, 0);
  const gapDuration = Math.max(cues.length - 1, 0) * gapSec;

  return cueDuration + gapDuration;
}

function defaultFfmpegRunner(
  ffmpegPath: string,
  args: string[],
): Promise<{ exitCode: number | null; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, args, {
      windowsHide: true,
    });
    let stderr = "";

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", reject);
    child.on("close", (exitCode) => {
      resolve({
        exitCode,
        stderr,
      });
    });
  });
}

function isEnoent(cause: unknown): boolean {
  return (
    typeof cause === "object" &&
    cause !== null &&
    "code" in cause &&
    (cause as { code?: unknown }).code === "ENOENT"
  );
}
