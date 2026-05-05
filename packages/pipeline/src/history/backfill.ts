import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { err, ok, type Result } from "neverthrow";
import type { BroadcastMode } from "../broadcast/mode.js";
import type { SegmentsJson, StoriesJson } from "../broadcast/render.js";
import type { HistoryStore, HistoryStoreError } from "./historyStore.js";

export type BackfillResult = {
  added: number;
  skipped: { id: string; reason: string }[];
};

export type BackfillError = HistoryStoreError;

const BROADCAST_ID_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/;
type DirectoryEntry = { name: string; isDirectory(): boolean };

export async function backfillFromOutputDir(
  outputRoot: string,
  historyStore: HistoryStore,
): Promise<Result<BackfillResult, BackfillError>> {
  let entries: DirectoryEntry[];
  try {
    entries = await readdir(outputRoot, { withFileTypes: true });
  } catch (cause) {
    return err({
      type: "read_failed",
      message: cause instanceof Error ? cause.message : "Failed to scan output directory",
      cause,
    });
  }

  let added = 0;
  const skipped: { id: string; reason: string }[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || !BROADCAST_ID_PATTERN.test(entry.name)) {
      continue;
    }

    const record = await readBroadcast(outputRoot, entry.name);
    if (!record.ok) {
      skipped.push({ id: entry.name, reason: record.reason });
      console.warn(`History backfill skipped ${entry.name}: ${record.reason}`);
      continue;
    }

    const addResult = await historyStore.addEntry({
      id: entry.name,
      mode: inferMode(record.stories),
      generatedAt: new Date(record.segments.generatedAt ?? timestampToJst(entry.name)),
      durationSec: record.segments.durationSec,
      stories: record.stories.stories.map((story) => ({ title: story.title, url: story.url })),
    });
    if (addResult.isErr()) {
      return err(addResult.error);
    }
    added += 1;
  }

  return ok({ added, skipped });
}

async function readBroadcast(
  outputRoot: string,
  id: string,
): Promise<
  { ok: true; segments: SegmentsJson; stories: StoriesJson } | { ok: false; reason: string }
> {
  try {
    const dir = join(outputRoot, id);
    const [segments, stories] = await Promise.all([
      readJson<SegmentsJson>(join(dir, "segments.json")),
      readJson<StoriesJson>(join(dir, "stories.json")),
    ]);
    validateSegments(segments);
    validateStories(stories);

    return { ok: true, segments, stories };
  } catch (cause) {
    return {
      ok: false,
      reason: cause instanceof Error ? cause.message : "Failed to read broadcast",
    };
  }
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

function validateSegments(value: SegmentsJson): void {
  if (!value || typeof value.durationSec !== "number" || !Array.isArray(value.segments)) {
    throw new Error("Invalid segments.json");
  }
}

function validateStories(value: StoriesJson): void {
  if (!value || !Array.isArray(value.stories)) {
    throw new Error("Invalid stories.json");
  }
}

function inferMode(stories: StoriesJson): BroadcastMode {
  return stories.stories.length === 3 ? "long" : "short";
}

function timestampToJst(id: string): string {
  const [date, time] = id.split("T");
  return `${date}T${time?.replaceAll("-", ":") ?? "00:00:00"}+09:00`;
}
