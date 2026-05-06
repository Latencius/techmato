import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createCaptionsStore } from "./captionsStore";

let tempDirs: string[] = [];

afterEach(async () => {
  for (const dir of tempDirs) {
    await rm(dir, { recursive: true, force: true });
  }
  tempDirs = [];
});

describe("createCaptionsStore", () => {
  it("reads an existing captions.vtt file", async () => {
    const root = await makeTempDir();
    await mkdir(join(root, "broadcast-1"), { recursive: true });
    await writeFile(join(root, "broadcast-1", "captions.vtt"), "WEBVTT\n\n", "utf8");

    const result = await createCaptionsStore(root).read("broadcast-1");

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw new Error(result.error.type);
    }
    expect(result.value).toBe("WEBVTT\n\n");
  });

  it("returns not_found when captions are missing", async () => {
    const root = await makeTempDir();

    const result = await createCaptionsStore(root).read("missing");

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      throw new Error("Expected not_found");
    }
    expect(result.error.type).toBe("not_found");
  });

  it("backfills captions from segments.json when captions are missing", async () => {
    const root = await makeTempDir();
    await mkdir(join(root, "broadcast-1"), { recursive: true });
    await writeFile(
      join(root, "broadcast-1", "segments.json"),
      `${JSON.stringify({
        id: "broadcast-1",
        audioFile: "broadcast.wav",
        audioUrl: "broadcast.wav",
        durationSec: 4,
        generatedAt: "2026-05-06T12:00:00+09:00",
        segments: [
          {
            title: "Story one",
            url: "https://example.com/one",
            source: "Example",
            startSec: 1,
            endSec: 3,
          },
        ],
      })}\n`,
      "utf8",
    );

    const result = await createCaptionsStore(root).backfill("broadcast-1");

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw new Error(result.error.type);
    }
    expect(result.value).toContain("WEBVTT");
    expect(result.value).toContain("Story one");
    await expect(readFile(join(root, "broadcast-1", "captions.vtt"), "utf8")).resolves.toContain(
      "Story one",
    );
  });

  it("returns not_found when backfill source metadata is missing", async () => {
    const root = await makeTempDir();

    const result = await createCaptionsStore(root).backfill("missing");

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      throw new Error("Expected not_found");
    }
    expect(result.error.type).toBe("not_found");
  });
});

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "techmato-captions-store-"));
  tempDirs.push(dir);
  return dir;
}
