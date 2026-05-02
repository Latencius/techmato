import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  type Article,
  extractFullContent,
  fetchAllSources,
  generateScript,
  type MergeError,
  mergeBroadcast,
  type ScriptError,
  type SelectError,
  selectArticles,
  synthesizeScript,
  type TtsError,
} from "@techmato/pipeline";
import type { CliOptions } from "./args.js";
import { createLogger } from "./logger.js";
import {
  buildSegmentMetadata,
  formatJstOffset,
  formatOutputTimestamp,
  formatSegmentsJson,
  formatStoriesJson,
  type MissingArticleMatchError,
  renderScriptText,
} from "./render.js";

const TOTAL_STEPS = 7;

export async function runBroadcast(options: CliOptions): Promise<number> {
  const logger = createLogger({ totalSteps: TOTAL_STEPS });
  const generatedAt = new Date();
  const broadcastId = formatOutputTimestamp(generatedAt);
  const outputRoot = options.outputRoot ?? defaultOutputRoot();
  const outputDir = join(outputRoot, broadcastId);

  try {
    await mkdir(outputDir, { recursive: true });
  } catch (cause) {
    writeError(
      "write",
      cause instanceof Error ? cause.message : "出力ディレクトリを作成できませんでした",
      cause,
    );
    return 1;
  }

  logger.step("fetch: news sources");
  const fetchResult = await fetchAllSources(undefined, generatedAt);
  for (const failure of fetchResult.failures) {
    logger.warn(`fetch skipped ${failure.source}: ${failure.error}`);
  }
  if (fetchResult.articles.length === 0) {
    writeError("fetch", "記事を取得できませんでした");
    return 1;
  }

  logger.step(`select: top ${options.maxStories} stories`);
  const selectionResult = await selectArticles(fetchResult.articles, options.maxStories);
  if (selectionResult.isErr()) {
    writeResultError("select", selectionResult.error);
    return 1;
  }
  const selected = selectionResult.value;

  logger.step(`extract: ${selected.length} selected stories`);
  const enrichedArticles = await extractFullContent(selected.map((selection) => selection.article));

  logger.step("script: generate broadcast script");
  const scriptResult = await generateScript(enrichedArticles, generatedAt);
  if (scriptResult.isErr()) {
    writeResultError("script", scriptResult.error);
    return 1;
  }
  const script = scriptResult.value;

  const metadataResult = buildSegmentMetadata(script, enrichedArticles);
  if (!metadataResult.ok) {
    writeResultError("script", metadataResult.error);
    return 1;
  }

  logger.step("tts: synthesize voice segments");
  const ttsResult = await synthesizeScript(script, {
    baseUrl: options.voicevox,
    speaker: options.speaker,
    outputDir,
  });
  if (ttsResult.isErr()) {
    writeResultError("tts", ttsResult.error, options.voicevox);
    return 1;
  }

  logger.step("merge: combine audio files");
  const mergeResult = await mergeBroadcast({
    manifest: ttsResult.value,
    segmentMetadata: metadataResult.value,
    outputDir,
    gapMs: options.gapMs,
  });
  if (mergeResult.isErr()) {
    writeResultError("merge", mergeResult.error);
    return 1;
  }

  logger.step("write: artifacts");
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
    writeError(
      "write",
      cause instanceof Error ? cause.message : "artifact の書き出しに失敗しました",
      cause,
    );
    return 1;
  }

  console.log(`output: ${outputDir}`);
  console.log(`generated: ${formatJstOffset(generatedAt)}`);

  return 0;
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
  selected: Awaited<ReturnType<typeof enrichSelections>>;
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

function enrichSelections(
  selected: { article: Article; reason: string }[],
  enrichedArticles: Article[],
) {
  const enrichedByUrl = new Map(enrichedArticles.map((article) => [article.url, article]));

  return selected.map((selection) => ({
    ...selection,
    article: enrichedByUrl.get(selection.article.url) ?? selection.article,
  }));
}

function defaultOutputRoot(): string {
  const here = fileURLToPath(import.meta.url);

  return resolve(dirname(here), "../../../output");
}

function writeResultError(
  stage: "fetch" | "select" | "extract" | "script" | "tts" | "merge" | "write",
  error: SelectError | ScriptError | TtsError | MergeError | MissingArticleMatchError,
  voicevoxUrl?: string,
): void {
  if ("type" in error && error.type === "engine_unreachable") {
    writeError(
      stage,
      `VOICEVOX に接続できません: ${voicevoxUrl ?? "http://localhost:50021"}`,
      error.cause,
    );
    return;
  }

  if ("type" in error && error.type === "ffmpeg_not_found") {
    writeError(
      stage,
      "ffmpeg コマンドが見つかりません。winget install Gyan.FFmpeg などでインストールしてください",
    );
    return;
  }

  const message = "message" in error ? error.message : JSON.stringify(error);
  const cause = "cause" in error ? error.cause : undefined;

  writeError(stage, message, cause);
}

function writeError(stage: string, message: string, cause?: unknown): void {
  const causeMessage =
    cause instanceof Error
      ? ` (${cause.message})`
      : cause === undefined
        ? ""
        : ` (${String(cause)})`;

  console.error(`[${stage}] ${message}${causeMessage}`);
}
