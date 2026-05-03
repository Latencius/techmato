import {
  formatJstOffset,
  type ProgressEvent,
  resolveDefaultOutputRoot,
  runBroadcast as runPipelineBroadcast,
} from "@techmato/pipeline";
import type { CliOptions } from "./args.js";
import { createLogger } from "./logger.js";

const STEP_MESSAGES: Record<string, string> = {
  fetch: "fetch: news sources",
  select: "select: top stories",
  extract: "extract: selected stories",
  script: "script: generate broadcast script",
  tts: "tts: synthesize voice segments",
  merge: "merge: combine audio files",
  write: "write: artifacts",
};

export async function runBroadcast(options: CliOptions): Promise<number> {
  const logger = createLogger({ totalSteps: 7 });
  const generatedAt = new Date();
  const result = await runPipelineBroadcast({
    speaker: options.speaker,
    maxStories: options.maxStories,
    mode: options.mode,
    voicevox: options.voicevox,
    gapMs: options.gapMs,
    outputRoot: options.outputRoot ?? resolveDefaultOutputRoot(import.meta),
    onProgress: (event) => handleProgress(event, logger),
  });

  if (result.isErr()) {
    return 1;
  }

  console.log(`output: ${result.value.outputDir}`);
  console.log(`generated: ${formatJstOffset(generatedAt)}`);

  return 0;
}

function handleProgress(event: ProgressEvent, logger: ReturnType<typeof createLogger>): void {
  switch (event.type) {
    case "step_start":
      logger.step(STEP_MESSAGES[event.step] ?? event.step);
      break;
    case "cue_complete":
      logger.info(`tts: ${event.cueIndex + 1}/${event.totalCues} cue 合成完了`);
      break;
    case "warn":
      logger.warn(event.message);
      break;
    case "error":
      logger.error(formatProgressError(event));
      break;
    case "step_complete":
    case "done":
      break;
  }
}

function formatProgressError(event: Extract<ProgressEvent, { type: "error" }>): string {
  const cause = event.cause ? ` (${event.cause})` : "";

  return `[${event.stage}] ${event.message}${cause}`;
}
