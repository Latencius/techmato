import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Article } from "@techmato/types";
import { err, ok, type Result } from "neverthrow";
import type { MergeError } from "../merge/merge.js";
import type { ScriptError } from "../script/script.js";
import type { SelectError, Selection } from "../select/select.js";
import type { TtsError } from "../tts/tts.js";
import type { BroadcastMode } from "./mode.js";
import type { ProgressEvent, ProgressEventStep } from "./progressEvents.js";
import {
  buildSegmentMetadata,
  formatOutputTimestamp,
  formatSegmentsJson,
  formatStoriesJson,
  type MissingArticleMatchError,
  renderScriptText,
} from "./render.js";

export type RunBroadcastOptions = {
  speaker: number;
  maxStories: number;
  voicevox: string;
  gapMs: number;
  outputRoot: string;
  mode?: BroadcastMode;
  broadcastId?: string;
  generatedAt?: Date;
  historyMaxItems?: number;
  onProgress?: (event: ProgressEvent) => void;
};

export type RunBroadcastSuccess = {
  broadcastId: string;
  outputDir: string;
  durationSec: number;
};

export type RunBroadcastError = {
  stage: ProgressEventStep;
  message: string;
  cause?: unknown;
};

const STEPS: ProgressEventStep[] = [
  "fetch",
  "select",
  "extract",
  "script",
  "tts",
  "merge",
  "write",
];
const TOTAL_STEPS = 7;

export async function runBroadcast(
  options: RunBroadcastOptions,
): Promise<Result<RunBroadcastSuccess, RunBroadcastError>> {
  const { extractFullContent } = await import("../extract/extract.js");
  const { mergeBroadcast } = await import("../merge/merge.js");
  const { generateScript } = await import("../script/script.js");
  const { selectArticles } = await import("../select/select.js");
  const { fetchAllSources } = await import("../sources/fetch.js");
  const { synthesizeScript } = await import("../tts/tts.js");
  const generatedAt = options.generatedAt ?? new Date();
  const mode = options.mode ?? "short";
  const broadcastId = options.broadcastId ?? formatOutputTimestamp(generatedAt);
  const outputDir = join(options.outputRoot, broadcastId);

  const start = (step: ProgressEventStep) =>
    options.onProgress?.({
      type: "step_start",
      step,
      stepIndex: stepIndex(step),
      totalSteps: TOTAL_STEPS,
    });
  const complete = (step: ProgressEventStep) =>
    options.onProgress?.({
      type: "step_complete",
      step,
      stepIndex: stepIndex(step),
      totalSteps: TOTAL_STEPS,
    });

  start("fetch");

  try {
    await mkdir(outputDir, { recursive: true });
  } catch (cause) {
    return fail(
      options,
      "write",
      cause instanceof Error ? cause.message : "Failed to create output directory",
      cause,
    );
  }

  const fetchResult = await fetchAllSources(undefined, generatedAt);
  for (const failure of fetchResult.failures) {
    options.onProgress?.({
      type: "warn",
      stage: "fetch",
      message: `fetch skipped ${failure.source}: ${failure.error}`,
    });
  }

  if (fetchResult.articles.length === 0) {
    return fail(options, "fetch", "No articles were fetched");
  }

  complete("fetch");
  start("select");

  const selectionResult = await selectArticles(fetchResult.articles, options.maxStories, mode);
  if (selectionResult.isErr()) {
    return failResult(options, "select", selectionResult.error);
  }
  const selected = selectionResult.value;

  complete("select");
  start("extract");

  const enrichedArticles = await extractFullContent(selected.map((selection) => selection.article));

  complete("extract");
  start("script");

  const scriptResult = await generateScript(
    enrichedArticles,
    generatedAt,
    mode,
    options.onProgress ? { onProgress: options.onProgress } : {},
  );
  if (scriptResult.isErr()) {
    return failResult(options, "script", scriptResult.error);
  }
  const script = scriptResult.value;
  const metadataResult = buildSegmentMetadata(script, enrichedArticles);
  if (!metadataResult.ok) {
    return failResult(options, "script", metadataResult.error);
  }

  complete("script");
  start("tts");

  const ttsResult = await synthesizeScript(script, {
    baseUrl: options.voicevox,
    speaker: options.speaker,
    outputDir,
    onCueComplete: (cueIndex, totalCues) => {
      options.onProgress?.({ type: "cue_complete", cueIndex, totalCues });
    },
  });
  if (ttsResult.isErr()) {
    return failResult(options, "tts", ttsResult.error);
  }

  complete("tts");
  start("merge");

  const mergeResult = await mergeBroadcast({
    manifest: ttsResult.value,
    segmentMetadata: metadataResult.value,
    outputDir,
    gapMs: options.gapMs,
  });
  if (mergeResult.isErr()) {
    return failResult(options, "merge", mergeResult.error);
  }

  complete("merge");
  start("write");

  try {
    await writeArtifacts({
      outputDir,
      broadcastId,
      selected: enrichSelections(selected, enrichedArticles),
      script,
      mergeResult: mergeResult.value,
      generatedAt,
    });
  } catch (cause) {
    return fail(
      options,
      "write",
      cause instanceof Error ? cause.message : "Failed to write artifacts",
      cause,
    );
  }

  complete("write");
  await updateHistory({
    options,
    outputRoot: options.outputRoot,
    broadcastId,
    generatedAt,
    durationSec: mergeResult.value.totalDurationSec,
    selected,
    mode,
  });

  const success = {
    broadcastId,
    outputDir,
    durationSec: mergeResult.value.totalDurationSec,
  };
  options.onProgress?.({
    type: "done",
    ...success,
  });

  return ok(success);
}

async function updateHistory({
  options,
  outputRoot,
  broadcastId,
  generatedAt,
  durationSec,
  selected,
  mode,
}: {
  options: RunBroadcastOptions;
  outputRoot: string;
  broadcastId: string;
  generatedAt: Date;
  durationSec: number;
  selected: Selection[];
  mode: BroadcastMode;
}): Promise<void> {
  const { backfillFromOutputDir } = await import("../history/backfill.js");
  const { createHistoryStore } = await import("../history/historyStore.js");
  const historyStore = createHistoryStore(outputRoot);

  if (!(await historyStore.exists())) {
    const backfillResult = await backfillFromOutputDir(outputRoot, historyStore);
    if (backfillResult.isErr()) {
      console.warn(`History backfill failed: ${backfillResult.error.message}`);
    }
  }

  const addResult = await historyStore.addEntry({
    id: broadcastId,
    mode,
    generatedAt,
    durationSec,
    stories: selected.map((selection) => ({
      title: selection.article.title,
      url: selection.article.url,
    })),
  });

  if (addResult.isErr()) {
    options.onProgress?.({
      type: "warn",
      stage: "write",
      message: `History update failed: ${addResult.error.message}`,
    });
    return;
  }

  const cleanupResult = await historyStore.cleanup(options.historyMaxItems ?? 30);
  if (cleanupResult.isErr()) {
    options.onProgress?.({
      type: "warn",
      stage: "write",
      message: `History cleanup failed: ${cleanupResult.error.message}`,
    });
    return;
  }

  if (cleanupResult.value.skippedIds.length > 0) {
    options.onProgress?.({
      type: "warn",
      stage: "write",
      message: `History cleanup skipped: ${cleanupResult.value.skippedIds.join(", ")}`,
    });
  }
}

async function writeArtifacts({
  outputDir,
  broadcastId,
  selected,
  script,
  mergeResult,
  generatedAt,
}: {
  outputDir: string;
  broadcastId: string;
  selected: Selection[];
  script: Parameters<typeof renderScriptText>[0];
  mergeResult: Parameters<typeof formatSegmentsJson>[1];
  generatedAt: Date;
}): Promise<void> {
  await writeFile(
    join(outputDir, "script.txt"),
    renderScriptText(script, generatedAt, mergeResult.totalDurationSec),
    "utf8",
  );
  await writeFile(
    join(outputDir, "stories.json"),
    `${JSON.stringify(formatStoriesJson(selected, script.segments, generatedAt), null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    join(outputDir, "segments.json"),
    `${JSON.stringify(formatSegmentsJson(broadcastId, mergeResult, generatedAt), null, 2)}\n`,
    "utf8",
  );
}

function enrichSelections(selected: Selection[], enrichedArticles: Article[]): Selection[] {
  const enrichedByUrl = new Map(enrichedArticles.map((article) => [article.url, article]));

  return selected.map((selection) => ({
    ...selection,
    article: enrichedByUrl.get(selection.article.url) ?? selection.article,
  }));
}

function failResult(
  options: RunBroadcastOptions,
  stage: ProgressEventStep,
  error: SelectError | ScriptError | TtsError | MergeError | MissingArticleMatchError,
): Result<RunBroadcastSuccess, RunBroadcastError> {
  if ("type" in error && error.type === "engine_unreachable") {
    return fail(options, stage, `VOICEVOX に接続できません: ${options.voicevox}`, error.cause);
  }

  if ("type" in error && error.type === "ffmpeg_not_found") {
    return fail(
      options,
      stage,
      "ffmpeg コマンドが見つかりません。winget install Gyan.FFmpeg などでインストールしてください",
    );
  }

  if ("type" in error && error.type === "ffmpeg_failed") {
    return fail(options, stage, error.stderr);
  }

  if ("type" in error && error.type === "metadata_mismatch") {
    return fail(
      options,
      stage,
      `Segment metadata count mismatch: expected ${error.expected}, actual ${error.actual}`,
    );
  }

  const message = "message" in error ? error.message : JSON.stringify(error);
  const cause = "cause" in error ? error.cause : undefined;

  return fail(options, stage, message, cause);
}

function fail(
  options: RunBroadcastOptions,
  stage: ProgressEventStep,
  message: string,
  cause?: unknown,
): Result<RunBroadcastSuccess, RunBroadcastError> {
  const error: RunBroadcastError = { stage, message, cause };
  const causeMessage =
    cause instanceof Error ? cause.message : cause === undefined ? undefined : String(cause);
  options.onProgress?.({
    type: "error",
    stage,
    message,
    ...(causeMessage ? { cause: causeMessage } : {}),
  });

  return err(error);
}

function stepIndex(step: ProgressEventStep): number {
  return STEPS.indexOf(step) + 1;
}
