import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { TtsManifest } from "../tts/tts.js";
import { mergeBroadcast, type SegmentMetadata } from "./merge.js";

const metadata: SegmentMetadata[] = [
  {
    title: "Story one",
    url: "https://example.com/one",
    source: "Example",
  },
  {
    title: "Story two",
    url: "https://example.com/two",
    source: "Example",
  },
];

describe("mergeBroadcast", () => {
  it("merges cues with silence gaps and returns broadcast segments", async () => {
    const dir = await makeTempDir();
    const manifest = manifestFor(dir);
    const runner = vi.fn().mockResolvedValue({ exitCode: 0, stderr: "" });

    try {
      const result = await mergeBroadcast(
        {
          manifest,
          segmentMetadata: metadata,
          outputDir: dir,
        },
        runner,
      );

      expect(result.isOk()).toBe(true);
      if (result.isErr()) {
        return;
      }

      expect(runner).toHaveBeenCalledTimes(2);
      expect(runner.mock.calls[1]?.[1]).toContain("-f");
      expect(runner.mock.calls[1]?.[1]).toContain("concat");
      expect(runner.mock.calls[1]?.[1]).toContain("-c");
      expect(runner.mock.calls[1]?.[1]).toContain("copy");
      expect(result.value.audioPath).toBe(join(dir, "broadcast.wav"));
      expect(result.value.totalDurationSec).toBeCloseTo(6.9);
      expect(result.value.segments).toEqual([
        {
          title: "Story one",
          url: "https://example.com/one",
          source: "Example",
          startSec: expect.closeTo(1.8),
          endSec: expect.closeTo(3.3),
        },
        {
          title: "Story two",
          url: "https://example.com/two",
          source: "Example",
          startSec: expect.closeTo(3.6),
          endSec: expect.closeTo(5.1),
        },
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("passes custom output file, gap, and ffmpeg path to runner", async () => {
    const dir = await makeTempDir();
    const manifest = manifestFor(dir);
    const runner = vi.fn().mockResolvedValue({ exitCode: 0, stderr: "" });

    try {
      const result = await mergeBroadcast(
        {
          manifest,
          segmentMetadata: metadata,
          outputDir: dir,
          outputFileName: "out.wav",
          gapMs: 500,
          ffmpegPath: "/usr/local/bin/ffmpeg",
        },
        runner,
      );

      expect(result.isOk()).toBe(true);
      expect(runner.mock.calls[0]?.[0]).toBe("/usr/local/bin/ffmpeg");
      expect(runner.mock.calls[0]?.[1]).toContain("0.5");
      expect(runner.mock.calls[1]?.[0]).toBe("/usr/local/bin/ffmpeg");
      expect(runner.mock.calls[1]?.[1].at(-1)).toBe(join(dir, "out.wav"));
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("returns metadata_mismatch when segment metadata length differs", async () => {
    const dir = await makeTempDir();
    const manifest = manifestFor(dir);
    const runner = vi.fn().mockResolvedValue({ exitCode: 0, stderr: "" });

    try {
      const result = await mergeBroadcast(
        {
          manifest,
          segmentMetadata: metadata.slice(0, 1),
          outputDir: dir,
        },
        runner,
      );

      expect(result.isErr()).toBe(true);
      if (result.isOk()) {
        return;
      }

      expect(result.error).toEqual({
        type: "metadata_mismatch",
        expected: 2,
        actual: 1,
      });
      expect(runner).not.toHaveBeenCalled();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("returns ffmpeg_not_found when runner throws ENOENT", async () => {
    const dir = await makeTempDir();
    const manifest = manifestFor(dir);
    const error = new Error("spawn ffmpeg ENOENT") as NodeJS.ErrnoException;
    error.code = "ENOENT";
    const runner = vi.fn().mockRejectedValue(error);

    try {
      const result = await mergeBroadcast(
        {
          manifest,
          segmentMetadata: metadata,
          outputDir: dir,
        },
        runner,
      );

      expect(result.isErr()).toBe(true);
      if (result.isOk()) {
        return;
      }

      expect(result.error.type).toBe("ffmpeg_not_found");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("returns ffmpeg_failed when silence generation fails", async () => {
    const dir = await makeTempDir();
    const manifest = manifestFor(dir);
    const runner = vi.fn().mockResolvedValueOnce({ exitCode: 1, stderr: "boom" });

    try {
      const result = await mergeBroadcast(
        {
          manifest,
          segmentMetadata: metadata,
          outputDir: dir,
        },
        runner,
      );

      expect(result.isErr()).toBe(true);
      if (result.isOk()) {
        return;
      }

      expect(result.error).toEqual({
        type: "ffmpeg_failed",
        exitCode: 1,
        stderr: "boom",
        stage: "silence",
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("returns ffmpeg_failed when concat fails and keeps intermediate files", async () => {
    const dir = await makeTempDir();
    const manifest = manifestFor(dir);
    const runner = vi
      .fn()
      .mockResolvedValueOnce({ exitCode: 0, stderr: "" })
      .mockResolvedValueOnce({ exitCode: 1, stderr: "concat boom" });

    try {
      await writeFile(join(dir, "silence.wav"), new Uint8Array([1, 2, 3]));

      const result = await mergeBroadcast(
        {
          manifest,
          segmentMetadata: metadata,
          outputDir: dir,
        },
        runner,
      );

      expect(result.isErr()).toBe(true);
      if (result.isOk()) {
        return;
      }

      expect(result.error).toEqual({
        type: "ffmpeg_failed",
        exitCode: 1,
        stderr: "concat boom",
        stage: "concat",
      });
      await expect(readFile(join(dir, "silence.wav"))).resolves.toBeInstanceOf(Buffer);
      await expect(readFile(join(dir, "concat.txt"), "utf8")).resolves.toContain("voice-001.wav");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("writes concat list in cue order without trailing silence", async () => {
    const dir = await makeTempDir();
    const manifest = manifestFor(dir);
    const runner = vi.fn().mockResolvedValue({ exitCode: 0, stderr: "" });

    try {
      const result = await mergeBroadcast(
        {
          manifest,
          segmentMetadata: metadata,
          outputDir: dir,
        },
        runner,
      );

      expect(result.isOk()).toBe(true);
      await expect(readFile(join(dir, "concat.txt"), "utf8")).resolves.toBe(
        [
          "file 'voice-001.wav'",
          "file 'silence.wav'",
          "file 'voice-002.wav'",
          "file 'silence.wav'",
          "file 'voice-003.wav'",
          "file 'silence.wav'",
          "file 'voice-004.wav'",
        ].join("\n"),
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

async function makeTempDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), "techmato-merge-"));
}

function manifestFor(outputDir: string): TtsManifest {
  return {
    cues: [
      {
        index: 0,
        kind: "opening",
        text: "Opening",
        filePath: join(outputDir, "voice-001.wav"),
        durationSec: 1.5,
      },
      {
        index: 1,
        kind: "segment",
        text: "Segment one",
        filePath: join(outputDir, "voice-002.wav"),
        durationSec: 1.5,
        segmentIndex: 0,
      },
      {
        index: 2,
        kind: "segment",
        text: "Segment two",
        filePath: join(outputDir, "voice-003.wav"),
        durationSec: 1.5,
        segmentIndex: 1,
      },
      {
        index: 3,
        kind: "closing",
        text: "Closing",
        filePath: join(outputDir, "voice-004.wav"),
        durationSec: 1.5,
      },
    ],
    totalDurationSec: 6,
  };
}
