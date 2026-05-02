import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Article, BroadcastScript } from "@techmato/types";
import { err, ok } from "neverthrow";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ProgressEvent } from "./progressEvents.js";
import { runBroadcast } from "./runBroadcast.js";

const fetchAllSourcesMock = vi.hoisted(() => vi.fn());
const selectArticlesMock = vi.hoisted(() => vi.fn());
const extractFullContentMock = vi.hoisted(() => vi.fn());
const generateScriptMock = vi.hoisted(() => vi.fn());
const synthesizeScriptMock = vi.hoisted(() => vi.fn());
const mergeBroadcastMock = vi.hoisted(() => vi.fn());

vi.mock("../sources/fetch.js", () => ({
  fetchAllSources: fetchAllSourcesMock,
}));

vi.mock("../select/select.js", () => ({
  selectArticles: selectArticlesMock,
}));

vi.mock("../extract/extract.js", () => ({
  extractFullContent: extractFullContentMock,
}));

vi.mock("../script/script.js", () => ({
  generateScript: generateScriptMock,
}));

vi.mock("../tts/tts.js", () => ({
  synthesizeScript: synthesizeScriptMock,
}));

vi.mock("../merge/merge.js", () => ({
  mergeBroadcast: mergeBroadcastMock,
}));

const article: Article = {
  source: "Source",
  title: "Story",
  url: "https://example.com/story",
  summary: "Summary",
  content: "Content",
  publishedAt: new Date("2026-05-03T00:00:00.000Z"),
};

const script: BroadcastScript = {
  opening: "Opening",
  segments: [
    {
      title: "Story",
      url: "https://example.com/story",
      narration: "Narration",
    },
  ],
  closing: "Closing",
};

let tempDirs: string[] = [];

beforeEach(() => {
  vi.clearAllMocks();
  tempDirs = [];
});

afterEach(async () => {
  for (const dir of tempDirs) {
    await rm(dir, { recursive: true, force: true });
  }
});

describe("runBroadcast", () => {
  it("runs the pipeline, writes artifacts, and reports progress in order", async () => {
    const outputRoot = await makeTempDir();
    const events: ProgressEvent[] = [];
    mockSuccessfulPipeline();

    const result = await runBroadcast({
      speaker: 3,
      maxStories: 4,
      voicevox: "http://localhost:50021",
      gapMs: 300,
      outputRoot,
      onProgress: (event) => events.push(event),
    });

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw new Error(result.error.message);
    }

    expect(events.map((event) => event.type)).toEqual([
      "step_start",
      "warn",
      "step_complete",
      "step_start",
      "step_complete",
      "step_start",
      "step_complete",
      "step_start",
      "step_complete",
      "step_start",
      "cue_complete",
      "cue_complete",
      "step_complete",
      "step_start",
      "step_complete",
      "step_start",
      "step_complete",
      "done",
    ]);
    expect(
      events.filter((event) => event.type === "step_start").map((event) => event.step),
    ).toEqual(["fetch", "select", "extract", "script", "tts", "merge", "write"]);
    expect(events.filter((event) => event.type === "cue_complete")).toEqual([
      { type: "cue_complete", cueIndex: 0, totalCues: 2 },
      { type: "cue_complete", cueIndex: 1, totalCues: 2 },
    ]);

    const done = events.at(-1);
    expect(done).toEqual({
      type: "done",
      broadcastId: result.value.broadcastId,
      outputDir: result.value.outputDir,
      durationSec: 6.9,
    });
    await expect(readFile(join(result.value.outputDir, "script.txt"), "utf8")).resolves.toContain(
      "techmato broadcast",
    );
    await expect(readFile(join(result.value.outputDir, "stories.json"), "utf8")).resolves.toContain(
      "selectionReason",
    );
    await expect(
      readFile(join(result.value.outputDir, "segments.json"), "utf8"),
    ).resolves.toContain("broadcast.wav");
  });

  it("emits error and stops when select fails", async () => {
    const outputRoot = await makeTempDir();
    const events: ProgressEvent[] = [];
    mockSuccessfulPipeline();
    selectArticlesMock.mockResolvedValueOnce(
      err({ type: "api_error", message: "selection failed" }),
    );

    const result = await runBroadcast({
      speaker: 3,
      maxStories: 4,
      voicevox: "http://localhost:50021",
      gapMs: 300,
      outputRoot,
      onProgress: (event) => events.push(event),
    });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      throw new Error("Expected select failure");
    }
    expect(result.error).toEqual({
      stage: "select",
      message: "selection failed",
    });
    expect(events.at(-1)).toEqual({
      type: "error",
      stage: "select",
      message: "selection failed",
    });
    expect(events.some((event) => event.type === "done")).toBe(false);
    expect(extractFullContentMock).not.toHaveBeenCalled();
  });

  it("emits error and stops when fetch returns no articles", async () => {
    const outputRoot = await makeTempDir();
    const events: ProgressEvent[] = [];
    mockSuccessfulPipeline();
    fetchAllSourcesMock.mockResolvedValueOnce({
      articles: [],
      failures: [],
    });

    const result = await runBroadcast({
      speaker: 3,
      maxStories: 4,
      voicevox: "http://localhost:50021",
      gapMs: 300,
      outputRoot,
      onProgress: (event) => events.push(event),
    });

    expect(result.isErr()).toBe(true);
    expect(events.at(-1)).toEqual({
      type: "error",
      stage: "fetch",
      message: "No articles were fetched",
    });
    expect(selectArticlesMock).not.toHaveBeenCalled();
  });

  it("emits error and stops when script generation fails", async () => {
    const outputRoot = await makeTempDir();
    const events: ProgressEvent[] = [];
    mockSuccessfulPipeline();
    generateScriptMock.mockResolvedValueOnce(
      err({ type: "invalid_response", message: "bad script" }),
    );

    const result = await runBroadcast({
      speaker: 3,
      maxStories: 4,
      voicevox: "http://localhost:50021",
      gapMs: 300,
      outputRoot,
      onProgress: (event) => events.push(event),
    });

    expect(result.isErr()).toBe(true);
    expect(events.at(-1)).toEqual({
      type: "error",
      stage: "script",
      message: "bad script",
    });
    expect(synthesizeScriptMock).not.toHaveBeenCalled();
  });

  it("emits error and stops when TTS fails", async () => {
    const outputRoot = await makeTempDir();
    const events: ProgressEvent[] = [];
    mockSuccessfulPipeline();
    synthesizeScriptMock.mockResolvedValueOnce(
      err({ type: "engine_unreachable", message: "connection failed" }),
    );

    const result = await runBroadcast({
      speaker: 3,
      maxStories: 4,
      voicevox: "http://localhost:50021",
      gapMs: 300,
      outputRoot,
      onProgress: (event) => events.push(event),
    });

    expect(result.isErr()).toBe(true);
    expect(events.at(-1)).toEqual({
      type: "error",
      stage: "tts",
      message: "VOICEVOX に接続できません: http://localhost:50021",
    });
    expect(mergeBroadcastMock).not.toHaveBeenCalled();
  });

  it("emits error and stops when merge fails", async () => {
    const outputRoot = await makeTempDir();
    const events: ProgressEvent[] = [];
    mockSuccessfulPipeline();
    mergeBroadcastMock.mockResolvedValueOnce(
      err({ type: "ffmpeg_failed", exitCode: 1, stderr: "boom", stage: "concat" }),
    );

    const result = await runBroadcast({
      speaker: 3,
      maxStories: 4,
      voicevox: "http://localhost:50021",
      gapMs: 300,
      outputRoot,
      onProgress: (event) => events.push(event),
    });

    expect(result.isErr()).toBe(true);
    expect(events.at(-1)).toEqual({
      type: "error",
      stage: "merge",
      message: "boom",
    });
    expect(events.some((event) => event.type === "done")).toBe(false);
  });
});

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "techmato-broadcast-"));
  tempDirs.push(dir);
  return dir;
}

function mockSuccessfulPipeline(): void {
  fetchAllSourcesMock.mockResolvedValue({
    articles: [article],
    failures: [{ source: "source-id", error: "skipped" }],
  });
  selectArticlesMock.mockResolvedValue(ok([{ article, reason: "Useful" }]));
  extractFullContentMock.mockResolvedValue([article]);
  generateScriptMock.mockResolvedValue(ok(script));
  synthesizeScriptMock.mockImplementation(async (_script: BroadcastScript, options: unknown) => {
    const onCueComplete = (
      options as { onCueComplete?: (cueIndex: number, totalCues: number) => void }
    ).onCueComplete;
    onCueComplete?.(0, 2);
    onCueComplete?.(1, 2);

    return ok({
      cues: [],
      totalDurationSec: 6,
    });
  });
  mergeBroadcastMock.mockResolvedValue(
    ok({
      audioPath: "broadcast.wav",
      totalDurationSec: 6.9,
      segments: [
        {
          title: "Story",
          url: "https://example.com/story",
          source: "Source",
          startSec: 1.8,
          endSec: 3.3,
        },
      ],
    }),
  );
}
