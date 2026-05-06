import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { BroadcastScript } from "@techmato/types";
import { err, ok, type Result } from "neverthrow";
import { concatWav, parseWavDurationSec, splitWav } from "./wav.js";

export type TtsOptions = {
  baseUrl?: string;
  speaker?: number;
  speedScale?: number;
  outputDir: string;
  onCueComplete?: (cueIndex: number, totalCues: number) => void;
};

export type TtsCueKind = "opening" | "segment" | "closing";

export type TtsCue = {
  index: number;
  kind: TtsCueKind;
  text: string;
  filePath: string;
  durationSec: number;
  chunks?: TtsChunk[];
  segmentIndex?: number;
};

export type TtsChunk = {
  text: string;
  durationSec: number;
};

export type TtsManifest = {
  cues: TtsCue[];
  totalDurationSec: number;
};

export type TtsError =
  | { type: "engine_unreachable"; message: string; cause?: unknown }
  | { type: "audio_query_failed"; text: string; status: number; message: string }
  | { type: "synthesis_failed"; text: string; status: number; message: string }
  | { type: "write_failed"; filePath: string; message: string; cause?: unknown };

type CueInput = {
  index: number;
  kind: TtsCueKind;
  text: string;
  filePath: string;
  segmentIndex?: number;
};

type VoicevoxAudioQuery = Record<string, unknown>;

type SynthesizedAudio = {
  wav: Uint8Array;
  chunks: TtsChunk[];
};

const DEFAULT_BASE_URL = "http://localhost:50021";
const DEFAULT_SPEAKER = 3;
const DEFAULT_SPEED_SCALE = 1;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 5000;

export async function synthesizeScript(
  script: BroadcastScript,
  options: TtsOptions,
): Promise<Result<TtsManifest, TtsError>> {
  const baseUrl = normalizeBaseUrl(
    options.baseUrl ?? process.env.VOICEVOX_BASE_URL ?? DEFAULT_BASE_URL,
  );
  const speaker = options.speaker ?? DEFAULT_SPEAKER;
  const speedScale = options.speedScale ?? DEFAULT_SPEED_SCALE;
  const cueInputs = buildCueInputs(script, options.outputDir);
  const cues: TtsCue[] = [];

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

  for (const cueInput of cueInputs) {
    const cueResult = await synthesizeCueWithRetry({
      cueInput,
      baseUrl,
      speaker,
      speedScale,
    });

    if (cueResult.isErr()) {
      return err(cueResult.error);
    }

    cues.push(cueResult.value);
    options.onCueComplete?.(cueInput.index, cueInputs.length);
  }

  return ok({
    cues,
    totalDurationSec: cues.reduce((sum, cue) => sum + cue.durationSec, 0),
  });
}

async function synthesizeCueWithRetry({
  cueInput,
  baseUrl,
  speaker,
  speedScale,
}: {
  cueInput: CueInput;
  baseUrl: string;
  speaker: number;
  speedScale: number;
}): Promise<Result<TtsCue, TtsError>> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const result = await synthesizeCue({ cueInput, baseUrl, speaker, speedScale });

    if (result.isOk()) {
      return result;
    }

    if (result.error.type !== "engine_unreachable" || attempt === MAX_RETRIES) {
      return err(result.error);
    }

    console.warn(`TTS retry ${attempt + 1}/${MAX_RETRIES} for cue ${cueInput.index}`);
    await sleep(RETRY_DELAY_MS);
  }

  return err({
    type: "engine_unreachable",
    message: "Failed to reach VOICEVOX engine",
  });
}

async function synthesizeCue({
  cueInput,
  baseUrl,
  speaker,
  speedScale,
}: {
  cueInput: CueInput;
  baseUrl: string;
  speaker: number;
  speedScale: number;
}): Promise<Result<TtsCue, TtsError>> {
  const chunks = splitJapaneseSentences(cueInput.text);
  const synthesisResult =
    chunks.length <= 1
      ? await synthesizeSingleChunk(
          baseUrl,
          speaker,
          cueInput.text,
          chunks[0] ?? cueInput.text,
          speedScale,
        )
      : await synthesizeChunks(baseUrl, speaker, cueInput.text, chunks, speedScale);

  if (synthesisResult.isErr()) {
    return err(synthesisResult.error);
  }

  let durationSec: number;

  try {
    durationSec = parseWavDurationSec(synthesisResult.value.wav);
  } catch (cause) {
    return err({
      type: "synthesis_failed",
      text: cueInput.text,
      status: 200,
      message: cause instanceof Error ? cause.message : "Invalid WAV response",
    });
  }

  try {
    await writeFile(cueInput.filePath, synthesisResult.value.wav);
  } catch (cause) {
    return err({
      type: "write_failed",
      filePath: cueInput.filePath,
      message: cause instanceof Error ? cause.message : "Failed to write synthesized audio",
      cause,
    });
  }

  return ok({
    ...cueInput,
    durationSec,
    chunks: synthesisResult.value.chunks,
  });
}

async function synthesizeSingleChunk(
  baseUrl: string,
  speaker: number,
  cueText: string,
  chunkText: string,
  speedScale: number,
): Promise<Result<SynthesizedAudio, TtsError>> {
  const wavResult = await synthesizeText(baseUrl, speaker, cueText, speedScale);

  if (wavResult.isErr()) {
    return err(wavResult.error);
  }

  try {
    return ok({
      wav: wavResult.value,
      chunks: [{ text: chunkText, durationSec: parseWavDurationSec(wavResult.value) }],
    });
  } catch (cause) {
    return err({
      type: "synthesis_failed",
      text: cueText,
      status: 200,
      message: cause instanceof Error ? cause.message : "Invalid WAV response",
    });
  }
}

async function synthesizeChunks(
  baseUrl: string,
  speaker: number,
  cueText: string,
  chunks: string[],
  speedScale: number,
): Promise<Result<SynthesizedAudio, TtsError>> {
  const parts = [];
  const synthesizedChunks: TtsChunk[] = [];

  for (const chunk of chunks) {
    const chunkResult = await synthesizeText(baseUrl, speaker, chunk, speedScale);

    if (chunkResult.isErr()) {
      return err({ ...chunkResult.error, text: cueText });
    }

    try {
      synthesizedChunks.push({
        text: chunk,
        durationSec: parseWavDurationSec(chunkResult.value),
      });
      parts.push(splitWav(chunkResult.value));
    } catch (cause) {
      return err({
        type: "synthesis_failed",
        text: cueText,
        status: 200,
        message: cause instanceof Error ? cause.message : "Invalid WAV response",
      });
    }
  }

  try {
    return ok({
      wav: concatWav(parts),
      chunks: synthesizedChunks,
    });
  } catch (cause) {
    return err({
      type: "synthesis_failed",
      text: cueText,
      status: 200,
      message: cause instanceof Error ? cause.message : "Invalid WAV response",
    });
  }
}

async function synthesizeText(
  baseUrl: string,
  speaker: number,
  text: string,
  speedScale: number,
): Promise<Result<Uint8Array, TtsError>> {
  const audioQueryResult = await requestAudioQuery(baseUrl, speaker, text);

  if (audioQueryResult.isErr()) {
    return err(audioQueryResult.error);
  }

  const query = {
    ...audioQueryResult.value,
    speedScale,
  };

  return requestSynthesis(baseUrl, speaker, text, query);
}

function buildCueInputs(script: BroadcastScript, outputDir: string): CueInput[] {
  const inputs: Omit<CueInput, "index" | "filePath">[] = [
    {
      kind: "opening",
      text: script.opening,
    },
    ...script.segments.map((segment, segmentIndex) => ({
      kind: "segment" as const,
      text: segment.narration,
      segmentIndex,
    })),
    {
      kind: "closing",
      text: script.closing,
    },
  ];

  return inputs.map((input, index) => ({
    index,
    ...input,
    filePath: join(outputDir, `voice-${String(index + 1).padStart(3, "0")}.wav`),
  }));
}

async function requestAudioQuery(
  baseUrl: string,
  speaker: number,
  text: string,
): Promise<Result<VoicevoxAudioQuery, TtsError>> {
  let response: Response;

  try {
    response = await fetch(
      `${baseUrl}/audio_query?text=${encodeURIComponent(text)}&speaker=${speaker}`,
      {
        method: "POST",
      },
    );
  } catch (cause) {
    return err({
      type: "engine_unreachable",
      message: cause instanceof Error ? cause.message : "Failed to reach VOICEVOX engine",
      cause,
    });
  }

  if (!response.ok) {
    return err({
      type: "audio_query_failed",
      text,
      status: response.status,
      message: await responseMessage(response),
    });
  }

  try {
    const query = await response.json();

    if (typeof query !== "object" || query === null || Array.isArray(query)) {
      return err({
        type: "audio_query_failed",
        text,
        status: response.status,
        message: "audio_query response was not an object",
      });
    }

    return ok(query as VoicevoxAudioQuery);
  } catch (cause) {
    return err({
      type: "audio_query_failed",
      text,
      status: response.status,
      message: cause instanceof Error ? cause.message : "Failed to parse audio_query response",
    });
  }
}

async function requestSynthesis(
  baseUrl: string,
  speaker: number,
  text: string,
  query: unknown,
): Promise<Result<Uint8Array, TtsError>> {
  let response: Response;

  try {
    response = await fetch(`${baseUrl}/synthesis?speaker=${speaker}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(query),
    });
  } catch (cause) {
    return err({
      type: "engine_unreachable",
      message: cause instanceof Error ? cause.message : "Failed to reach VOICEVOX engine",
      cause,
    });
  }

  if (!response.ok) {
    return err({
      type: "synthesis_failed",
      text,
      status: response.status,
      message: await responseMessage(response),
    });
  }

  return ok(new Uint8Array(await response.arrayBuffer()));
}

async function responseMessage(response: Response): Promise<string> {
  const text = await response.text();

  return text.slice(0, 200);
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

export function splitJapaneseSentences(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) {
    return [];
  }

  const matches = trimmed.match(/[^。]+。?/g);

  if (!matches) {
    return [trimmed];
  }

  return matches.map((sentence) => sentence.trim()).filter((sentence) => sentence.length > 0);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
