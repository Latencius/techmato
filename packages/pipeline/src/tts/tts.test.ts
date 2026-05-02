import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { BroadcastScript } from "@techmato/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { synthesizeScript } from "./tts.js";

const script: BroadcastScript = {
  opening: "こんにちは。今日のニュースです。",
  segments: [
    {
      title: "First",
      url: "https://example.com/first",
      narration: "ひとつ目のニュースです。",
    },
    {
      title: "Second",
      url: "https://example.com/second",
      narration: "ふたつ目のニュースです。",
    },
  ],
  closing: "以上です。",
};

let tempDirs: string[] = [];

beforeEach(() => {
  vi.restoreAllMocks();
  tempDirs = [];
});

afterEach(async () => {
  for (const dir of tempDirs) {
    await rm(dir, { recursive: true, force: true });
  }
  vi.unstubAllGlobals();
});

describe("synthesizeScript", () => {
  it("synthesizes opening, segments, and closing sequentially", async () => {
    const outputDir = await makeTempDir();
    const wav = makeFakeWav(24_000, 1, 16, 1.5);
    const fetchMock = mockVoicevoxSuccess(wav);

    const result = await synthesizeScript(script, { outputDir });

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw new Error(result.error.message);
    }
    expect(fetchMock).toHaveBeenCalledTimes(8);
    expect(result.value.totalDurationSec).toBeCloseTo(6, 5);
    expect(result.value.cues.map((cue) => cue.kind)).toEqual([
      "opening",
      "segment",
      "segment",
      "closing",
    ]);
    expect(result.value.cues.map((cue) => cue.segmentIndex)).toEqual([undefined, 0, 1, undefined]);
    await expect(stat(join(outputDir, "voice-001.wav"))).resolves.toBeTruthy();
    await expect(stat(join(outputDir, "voice-004.wav"))).resolves.toBeTruthy();

    const firstSynthesisBody = JSON.parse(
      (fetchMock.mock.calls[1]?.[1] as unknown as RequestInit).body as string,
    );
    expect(firstSynthesisBody.speedScale).toBe(1);
  });

  it("passes custom speedScale into synthesis request bodies", async () => {
    const outputDir = await makeTempDir();
    const fetchMock = mockVoicevoxSuccess(makeFakeWav());

    await synthesizeScript(script, { outputDir, speedScale: 1.2 });

    const firstSynthesisBody = JSON.parse(
      (fetchMock.mock.calls[1]?.[1] as unknown as RequestInit).body as string,
    );
    expect(firstSynthesisBody.speedScale).toBe(1.2);
  });

  it("uses custom baseUrl and speaker in VOICEVOX requests", async () => {
    const outputDir = await makeTempDir();
    const fetchMock = mockVoicevoxSuccess(makeFakeWav());

    await synthesizeScript(script, {
      outputDir,
      baseUrl: "http://voicevox.test:50021/",
      speaker: 8,
    });

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "http://voicevox.test:50021/audio_query?text=%E3%81%93%E3%82%93%E3%81%AB%E3%81%A1%E3%81%AF%E3%80%82%E4%BB%8A%E6%97%A5%E3%81%AE%E3%83%8B%E3%83%A5%E3%83%BC%E3%82%B9%E3%81%A7%E3%81%99%E3%80%82&speaker=8",
    );
    expect(fetchMock.mock.calls[1]?.[0]).toBe("http://voicevox.test:50021/synthesis?speaker=8");
  });

  it("returns engine_unreachable when fetch throws", async () => {
    const outputDir = await makeTempDir();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));

    const result = await synthesizeScript(script, { outputDir });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      throw new Error("Expected engine_unreachable");
    }
    expect(result.error.type).toBe("engine_unreachable");
  });

  it("returns audio_query_failed for non-2xx audio_query responses", async () => {
    const outputDir = await makeTempDir();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("audio query boom", { status: 500 })),
    );

    const result = await synthesizeScript(script, { outputDir });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      throw new Error("Expected audio_query_failed");
    }
    expect(result.error).toEqual(
      expect.objectContaining({
        type: "audio_query_failed",
        status: 500,
      }),
    );
  });

  it("returns synthesis_failed and leaves previous cue files when synthesis fails", async () => {
    const outputDir = await makeTempDir();
    const fetchMock = vi
      .fn<() => Promise<Response>>()
      .mockResolvedValueOnce(jsonResponse({ accentPhrases: [] }))
      .mockResolvedValueOnce(wavResponse(makeFakeWav()))
      .mockResolvedValueOnce(jsonResponse({ accentPhrases: [] }))
      .mockResolvedValueOnce(new Response("synthesis boom", { status: 400 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await synthesizeScript(script, { outputDir });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      throw new Error("Expected synthesis_failed");
    }
    expect(result.error).toEqual(
      expect.objectContaining({
        type: "synthesis_failed",
        status: 400,
      }),
    );
    await expect(stat(join(outputDir, "voice-001.wav"))).resolves.toBeTruthy();
    await expect(readFile(join(outputDir, "voice-002.wav"))).rejects.toThrow();
  });

  it("creates outputDir when it does not exist", async () => {
    const parent = await makeTempDir();
    const outputDir = join(parent, "nested", "voices");
    mockVoicevoxSuccess(makeFakeWav());

    const result = await synthesizeScript(script, { outputDir });

    expect(result.isOk()).toBe(true);
    await expect(stat(outputDir)).resolves.toBeTruthy();
    await expect(stat(join(outputDir, "voice-001.wav"))).resolves.toBeTruthy();
  });
});

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "techmato-tts-"));
  tempDirs.push(dir);
  return dir;
}

function mockVoicevoxSuccess(wav: Uint8Array) {
  const fetchMock = vi.fn(
    async (url: RequestInfo | URL, _init?: RequestInit): Promise<Response> => {
      if (String(url).includes("/audio_query")) {
        return jsonResponse({ accentPhrases: [], speedScale: 0.5 });
      }

      return wavResponse(wav);
    },
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function wavResponse(wav: Uint8Array): Response {
  const body = new Uint8Array(wav).buffer as ArrayBuffer;

  return new Response(body, {
    status: 200,
    headers: { "Content-Type": "audio/wav" },
  });
}

function makeFakeWav(
  sampleRate = 24_000,
  channels = 1,
  bitsPerSample = 16,
  durationSec = 1.5,
): Uint8Array {
  const blockAlign = (channels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = Math.round(durationSec * byteRate);
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  bytes.set(new TextEncoder().encode("RIFF"), 0);
  view.setUint32(4, 36 + dataSize, true);
  bytes.set(new TextEncoder().encode("WAVE"), 8);
  bytes.set(new TextEncoder().encode("fmt "), 12);
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  bytes.set(new TextEncoder().encode("data"), 36);
  view.setUint32(40, dataSize, true);

  return bytes;
}
