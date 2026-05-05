import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createHistoryStore, HISTORY_FILE_VERSION, type HistoryFile } from "./historyStore.js";

let tempDirs: string[] = [];

afterEach(async () => {
  for (const dir of tempDirs) {
    await rm(dir, { recursive: true, force: true });
  }
  tempDirs = [];
});

describe("createHistoryStore", () => {
  it("adds and reads history entries", async () => {
    const outputRoot = await makeTempDir();
    const store = createHistoryStore(outputRoot);

    const result = await store.addEntry({
      id: "2026-05-05T21-39-37",
      mode: "short",
      generatedAt: new Date("2026-05-05T12:39:37.000Z"),
      durationSec: 62.3,
      stories: [{ title: "Story A", url: "https://example.com/a" }],
    });

    expect(result.isOk()).toBe(true);
    const read = await store.read();
    expect(read.isOk()).toBe(true);
    if (read.isErr()) {
      throw new Error(read.error.message);
    }
    expect(read.value).toEqual({
      version: HISTORY_FILE_VERSION,
      items: [
        {
          id: "2026-05-05T21-39-37",
          mode: "short",
          generatedAt: "2026-05-05T21:39:37+09:00",
          title: "Story A",
          durationSec: 62.3,
          favorite: false,
          storyCount: 1,
        },
      ],
    });
  });

  it("serializes concurrent addEntry calls", async () => {
    const outputRoot = await makeTempDir();
    const store = createHistoryStore(outputRoot);

    await Promise.all(
      [0, 1, 2, 3, 4].map((index) =>
        store.addEntry({
          id: `2026-05-05T21-39-3${index}`,
          mode: "short",
          generatedAt: new Date(`2026-05-05T12:39:3${index}.000Z`),
          durationSec: index,
          stories: [{ title: `Story ${index}`, url: `https://example.com/${index}` }],
        }),
      ),
    );

    const read = await store.read();
    expect(read.isOk()).toBe(true);
    if (read.isErr()) {
      throw new Error(read.error.message);
    }
    expect(read.value.items).toHaveLength(5);
    expect(read.value.items.map((item) => item.id).sort()).toEqual([
      "2026-05-05T21-39-30",
      "2026-05-05T21-39-31",
      "2026-05-05T21-39-32",
      "2026-05-05T21-39-33",
      "2026-05-05T21-39-34",
    ]);
  });

  it("replaces an existing entry with the same id", async () => {
    const outputRoot = await makeTempDir();
    const store = createHistoryStore(outputRoot);

    await store.addEntry({
      id: "same-id",
      mode: "short",
      generatedAt: new Date("2026-05-05T00:00:00.000Z"),
      durationSec: 1,
      stories: [{ title: "Old", url: "https://example.com/old" }],
    });
    await store.addEntry({
      id: "same-id",
      mode: "long",
      generatedAt: new Date("2026-05-05T01:00:00.000Z"),
      durationSec: 2,
      stories: [{ title: "New", url: "https://example.com/new" }],
    });

    const read = await store.read();
    expect(read.isOk()).toBe(true);
    if (read.isErr()) {
      throw new Error(read.error.message);
    }
    expect(read.value.items).toHaveLength(1);
    expect(read.value.items[0]).toMatchObject({
      id: "same-id",
      mode: "long",
      title: "New",
      durationSec: 2,
    });
  });

  it("cleans up old non-favorite entries while preserving favorites", async () => {
    const outputRoot = await makeTempDir();
    const store = createHistoryStore(outputRoot);

    await seedHistory(outputRoot, {
      version: HISTORY_FILE_VERSION,
      items: [
        entry("old", "2026-05-01T00:00:00+09:00", false),
        entry("favorite", "2026-05-02T00:00:00+09:00", true),
        entry("new", "2026-05-03T00:00:00+09:00", false),
      ],
    });
    await mkdir(join(outputRoot, "old"));
    await mkdir(join(outputRoot, "favorite"));
    await mkdir(join(outputRoot, "new"));

    const result = await store.cleanup(2);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw new Error(result.error.message);
    }
    expect(result.value).toEqual({ removedIds: ["old"], skippedIds: [] });
    const read = await store.read();
    expect(read.isOk()).toBe(true);
    if (read.isErr()) {
      throw new Error(read.error.message);
    }
    expect(read.value.items.map((item) => item.id)).toEqual(["favorite", "new"]);
  });

  it("keeps skipped cleanup entries in the index", async () => {
    const outputRoot = await makeTempDir();
    const store = createHistoryStore(outputRoot);

    await seedHistory(outputRoot, {
      version: HISTORY_FILE_VERSION,
      items: [
        entry("missing", "2026-05-01T00:00:00+09:00", false),
        entry("new", "2026-05-02T00:00:00+09:00", false),
      ],
    });
    await mkdir(join(outputRoot, "new"));

    const result = await store.cleanup(1);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw new Error(result.error.message);
    }
    expect(result.value).toEqual({ removedIds: [], skippedIds: ["missing"] });
    const read = await store.read();
    expect(read.isOk()).toBe(true);
    if (read.isErr()) {
      throw new Error(read.error.message);
    }
    expect(read.value.items.map((item) => item.id)).toEqual(["missing", "new"]);
  });

  it("updates only the favorite flag", async () => {
    const outputRoot = await makeTempDir();
    const store = createHistoryStore(outputRoot);
    await store.addEntry({
      id: "story",
      mode: "short",
      generatedAt: new Date("2026-05-05T00:00:00.000Z"),
      durationSec: 1,
      stories: [{ title: "Story", url: "https://example.com" }],
    });

    const result = await store.setFavorite("story", true);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw new Error(result.error.message);
    }
    expect(result.value).toMatchObject({ id: "story", favorite: true, title: "Story" });
  });

  it("removes an entry and its output directory when deleteFiles is true", async () => {
    const outputRoot = await makeTempDir();
    const store = createHistoryStore(outputRoot);
    await seedHistory(outputRoot, {
      version: HISTORY_FILE_VERSION,
      items: [entry("story", "2026-05-01T00:00:00+09:00", false)],
    });
    await mkdir(join(outputRoot, "story"));
    await writeFile(join(outputRoot, "story", "broadcast.wav"), "audio", "utf8");

    const result = await store.removeEntry("story", { deleteFiles: true });

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw new Error(result.error.message);
    }
    expect(result.value).toEqual({ removed: true, filesRemoved: true });
    await expect(
      readFile(join(outputRoot, "story", "broadcast.wav"), "utf8"),
    ).rejects.toMatchObject({
      code: "ENOENT",
    });
    const read = await store.read();
    expect(read.isOk()).toBe(true);
    if (read.isErr()) {
      throw new Error(read.error.message);
    }
    expect(read.value.items).toEqual([]);
  });

  it("removes an index entry successfully when output files are already missing", async () => {
    const outputRoot = await makeTempDir();
    const store = createHistoryStore(outputRoot);
    await seedHistory(outputRoot, {
      version: HISTORY_FILE_VERSION,
      items: [entry("missing-files", "2026-05-01T00:00:00+09:00", false)],
    });

    const result = await store.removeEntry("missing-files", { deleteFiles: true });

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw new Error(result.error.message);
    }
    expect(result.value).toEqual({ removed: true, filesRemoved: false });
    const read = await store.read();
    expect(read.isOk()).toBe(true);
    if (read.isErr()) {
      throw new Error(read.error.message);
    }
    expect(read.value.items).toEqual([]);
  });

  it("returns removed false for an unknown entry", async () => {
    const outputRoot = await makeTempDir();
    const store = createHistoryStore(outputRoot);

    const result = await store.removeEntry("unknown", { deleteFiles: true });

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      throw new Error(result.error.message);
    }
    expect(result.value).toEqual({ removed: false });
  });

  it("returns invalid_format for malformed JSON", async () => {
    const outputRoot = await makeTempDir();
    const store = createHistoryStore(outputRoot);
    await writeFile(store.indexPath, "{bad", "utf8");

    const result = await store.read();

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      throw new Error("Expected invalid format");
    }
    expect(result.error.type).toBe("invalid_format");
  });
});

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "techmato-history-"));
  tempDirs.push(dir);
  return dir;
}

function entry(id: string, generatedAt: string, favorite: boolean) {
  return {
    id,
    mode: "short" as const,
    generatedAt,
    title: id,
    durationSec: 1,
    favorite,
    storyCount: 1,
  };
}

async function seedHistory(outputRoot: string, file: HistoryFile): Promise<void> {
  await writeFile(join(outputRoot, "index.json"), `${JSON.stringify(file, null, 2)}\n`, "utf8");
}
