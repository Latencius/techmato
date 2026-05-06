import { BROADCAST_MODES, type BroadcastMode } from "@techmato/pipeline";
import { formatOutputTimestamp } from "@techmato/pipeline/broadcast/render";
import { type RunBroadcastOptions, runBroadcast } from "@techmato/pipeline/broadcast/runBroadcast";
import { NextResponse } from "next/server";
import { validateApiKey } from "../../../lib/server/apiKeyValidator";
import { historyStore } from "../../../lib/server/historyStoreSingleton";
import { jobStore } from "../../../lib/server/jobStore";
import { createOutputStore, resolveWebOutputRoot } from "../../../lib/server/outputStore";
import { verifyTurnstileToken } from "../../../lib/server/turnstile";

export const runtime = "nodejs";

type BroadcastRequestBody = {
  speaker?: unknown;
  maxStories?: unknown;
  gapMs?: unknown;
  mode?: unknown;
  apiKey?: unknown;
  turnstileToken?: unknown;
};

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const outputRoot = resolveWebOutputRoot();
    const generatedAt = new Date();
    const broadcastId = formatOutputTimestamp(generatedAt);
    const outputDir = createOutputStore(outputRoot).resolveDir(broadcastId);
    const options = await parseRunOptions(request, {
      speaker: 3,
      maxStories: BROADCAST_MODES.short.maxStories,
      mode: "short",
      voicevox: process.env.VOICEVOX_BASE_URL ?? "http://localhost:50021",
      gapMs: 300,
      outputRoot,
      anthropicApiKey: "",
      broadcastId,
      generatedAt,
      historyStore,
    });

    if (!options.ok) {
      return NextResponse.json({ error: options.message }, { status: options.status });
    }

    const createResult = jobStore.create(broadcastId, outputDir);

    if (createResult.isErr()) {
      return NextResponse.json(
        {
          error: "another job is running",
          broadcastId: jobStore.getCurrent()?.broadcastId,
        },
        { status: 409 },
      );
    }

    void runJob(options.value);

    return NextResponse.json({ broadcastId, outputDir }, { status: 202 });
  } catch (cause) {
    return NextResponse.json(
      { error: cause instanceof Error ? cause.message : "failed to start broadcast job" },
      { status: 500 },
    );
  }
}

async function runJob(options: RunBroadcastOptions): Promise<void> {
  try {
    const result = await runBroadcast({
      ...options,
      onProgress: (event) => {
        if (options.broadcastId) {
          jobStore.appendEvent(options.broadcastId, event);
        }
      },
    });

    if (result.isOk()) {
      jobStore.complete(result.value.broadcastId);
      return;
    }

    jobStore.fail(options.broadcastId ?? "unknown", {
      stage: result.error.stage,
      message: result.error.message,
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "broadcast job failed";
    const broadcastId = options.broadcastId ?? "unknown";
    jobStore.appendEvent(broadcastId, { type: "error", stage: "write", message });
    jobStore.fail(broadcastId, { stage: "write", message });
  }
}

async function parseRunOptions(
  request: Request,
  defaults: RunBroadcastOptions,
): Promise<
  { ok: true; value: RunBroadcastOptions } | { ok: false; status: 400 | 403; message: string }
> {
  let body: BroadcastRequestBody;
  try {
    body = await readOptionalBody(request);
  } catch {
    return { ok: false, status: 400, message: "request body must be valid JSON" };
  }
  const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : body.apiKey;
  const apiKeyValidation = validateApiKey(apiKey);

  if (!apiKeyValidation.ok) {
    return {
      ok: false,
      status: 400,
      message: `invalid apiKey: ${apiKeyValidation.reason}`,
    };
  }

  const turnstileResult = await verifyTurnstileToken(
    typeof body.turnstileToken === "string" ? body.turnstileToken : undefined,
  );
  if (!turnstileResult.ok) {
    return {
      ok: false,
      status: 403,
      message: turnstileResult.message
        ? `turnstile verification failed: ${turnstileResult.message}`
        : `turnstile verification failed: ${turnstileResult.reason}`,
    };
  }

  const speaker = readNumber(body, "speaker", defaults.speaker);
  const mode = readMode(body);
  if (!mode) {
    return { ok: false, status: 400, message: "mode must be short or long" };
  }

  const defaultMaxStories =
    body.maxStories === undefined ? BROADCAST_MODES[mode].maxStories : defaults.maxStories;
  const maxStories = readNumber(body, "maxStories", defaultMaxStories);
  const gapMs = readNumber(body, "gapMs", defaults.gapMs);

  if (speaker === null) {
    return { ok: false, status: 400, message: "speaker must be a number" };
  }
  if (maxStories === null) {
    return { ok: false, status: 400, message: "maxStories must be a number" };
  }
  if (gapMs === null) {
    return { ok: false, status: 400, message: "gapMs must be a number" };
  }

  return {
    ok: true,
    value: {
      ...defaults,
      speaker,
      maxStories,
      mode,
      gapMs,
      anthropicApiKey: apiKey as string,
    },
  };
}

async function readOptionalBody(request: Request): Promise<BroadcastRequestBody> {
  const text = await request.text();
  if (!text.trim()) {
    return {};
  }

  return JSON.parse(text) as BroadcastRequestBody;
}

function readNumber(
  body: BroadcastRequestBody,
  key: keyof BroadcastRequestBody,
  fallback: number,
): number | null {
  const value = body[key];

  if (value === undefined) {
    return fallback;
  }

  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readMode(body: BroadcastRequestBody): BroadcastMode | null {
  if (body.mode === undefined) {
    return "short";
  }

  return body.mode === "short" || body.mode === "long" ? body.mode : null;
}
