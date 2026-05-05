import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { backfillFromOutputDir } from "./backfill.js";
import { createHistoryStore } from "./historyStore.js";

let tempDirs: string[] = [];

afterEach(async () => {
  for (const dir of tempDirs) {
    await rm(dir, { recursive: true, force: true });
  }
  tempDirs = [];
});

describe("backfillFromOutputDir", () => {
  it("adds valid broadcast directories and skips malformed ones", async () => {
    const outputRoot = await makeTempDir();
    const store = createHistoryStore(outputRoot);

    await writeBroadcast(outputRoot, "2026-05-05T21-39-37", 4);
    await writeBroadcast(outputRoot, "2026-05-06T21-39-37", 3);
    await mkdir(join(outputRoot, "2026-05-07T21-39-37"));
    await writeFile(join(outputRoot, "2026-05-07T21-39-37", "segments.json"), "{bad", "utf8");
    await writeFile(join(outputRoot, "2026-05-07T21-39-37", "stories.json"), "{}", "utf8");
    await writeFile(join(outputRoot, "not-a-broadcast.txt"), "ignore", "utf8");

    const result = await backfillFromOutputDir(outputRoot, store);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw new Error(result.error.message);
    }
    expect(result.value.added).toBe(2);
    expect(result.value.skipped).toEqual([
      { id: "2026-05-07T21-39-37", reason: expect.stringContaining("Expected") },
    ]);
    const read = await store.read();
    expect(read.isOk()).toBe(true);
    if (read.isErr()) {
      throw new Error(read.error.message);
    }
    expect(read.value.items.map((item) => [item.id, item.mode])).toEqual([
      ["2026-05-05T21-39-37", "short"],
      ["2026-05-06T21-39-37", "long"],
    ]);
  });
});

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "techmato-backfill-"));
  tempDirs.push(dir);
  return dir;
}

async function writeBroadcast(outputRoot: string, id: string, storyCount: number): Promise<void> {
  const dir = join(outputRoot, id);
  await mkdir(dir);
  await writeFile(
    join(dir, "segments.json"),
    `${JSON.stringify({
      id,
      audioFile: "broadcast.wav",
      audioUrl: "broadcast.wav",
      durationSec: 12.3,
      generatedAt: "2026-05-05T21:39:37+09:00",
      segments: Array.from({ length: storyCount }, (_, index) => ({
        title: `Story ${index}`,
        url: `https://example.com/${index}`,
        source: "Source",
        startSec: index,
        endSec: index + 1,
      })),
    })}\n`,
    "utf8",
  );
  await writeFile(
    join(dir, "stories.json"),
    `${JSON.stringify({
      selectedAt: "2026-05-05T21:39:37+09:00",
      stories: Array.from({ length: storyCount }, (_, index) => ({
        title: `Story ${index}`,
        url: `https://example.com/${index}`,
        source: "Source",
        publishedAt: "2026-05-05T00:00:00.000Z",
        summary: "Summary",
        contentPreview: "Content",
        selectionReason: "Useful",
        includedInScript: true,
      })),
    })}\n`,
    "utf8",
  );
}
