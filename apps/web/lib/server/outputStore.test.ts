import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createOutputStore } from "./outputStore.js";

const tempDirs: string[] = [];

afterEach(async () => {
  for (const dir of tempDirs.splice(0)) {
    await rm(dir, { recursive: true, force: true });
  }
});

describe("createOutputStore", () => {
  it("reads broadcast metadata from segments.json and stories.json", async () => {
    const outputRoot = await makeOutputRoot();
    await writeBroadcast(outputRoot, "broadcast-1");
    const store = createOutputStore(outputRoot);

    const result = await store.readMetadata("broadcast-1");

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw new Error(result.error.type);
    }
    expect(result.value.segments.id).toBe("broadcast-1");
    expect(result.value.stories.stories[0]?.title).toBe("Story");
  });

  it("returns an audio web stream and byte size", async () => {
    const outputRoot = await makeOutputRoot();
    await writeBroadcast(outputRoot, "broadcast-1");
    const store = createOutputStore(outputRoot);

    const result = await store.audioStream("broadcast-1");

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw new Error(result.error.type);
    }
    expect(result.value.size).toBe(4);
    const bytes = await new Response(result.value.stream).arrayBuffer();
    expect([...new Uint8Array(bytes)]).toEqual([1, 2, 3, 4]);
  });

  it("returns not_found for a missing broadcast id", async () => {
    const store = createOutputStore(await makeOutputRoot());

    const result = await store.readMetadata("missing");

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toEqual({ type: "not_found", broadcastId: "missing" });
  });

  it("returns read_failed for invalid JSON", async () => {
    const outputRoot = await makeOutputRoot();
    const dir = join(outputRoot, "broadcast-1");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "segments.json"), "{", "utf8");
    await writeFile(join(dir, "stories.json"), "{}", "utf8");
    const store = createOutputStore(outputRoot);

    const result = await store.readMetadata("broadcast-1");

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().type).toBe("read_failed");
  });
});

async function makeOutputRoot(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "techmato-output-store-"));
  tempDirs.push(dir);
  return dir;
}

async function writeBroadcast(outputRoot: string, broadcastId: string): Promise<void> {
  const dir = join(outputRoot, broadcastId);
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, "segments.json"),
    JSON.stringify({
      id: broadcastId,
      audioFile: "broadcast.wav",
      audioUrl: "broadcast.wav",
      durationSec: 1,
      generatedAt: "2026-05-03T12:00:00+09:00",
      segments: [],
    }),
    "utf8",
  );
  await writeFile(
    join(dir, "stories.json"),
    JSON.stringify({
      selectedAt: "2026-05-03T12:00:00+09:00",
      stories: [
        {
          title: "Story",
          url: "https://example.com/story",
          source: "Source",
          publishedAt: "2026-05-03T00:00:00.000Z",
          summary: "Summary",
          contentPreview: "Preview",
          selectionReason: "Useful",
          includedInScript: true,
        },
      ],
    }),
    "utf8",
  );
  await writeFile(join(dir, "broadcast.wav"), new Uint8Array([1, 2, 3, 4]));
  expect(await readFile(join(dir, "broadcast.wav"))).toHaveLength(4);
}
