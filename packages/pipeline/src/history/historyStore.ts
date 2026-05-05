import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { err, ok, type Result } from "neverthrow";
import type { BroadcastMode } from "../broadcast/mode.js";
import { formatJstOffset } from "../broadcast/render.js";
import { createLock } from "./mutex.js";
import { buildTitle } from "./title.js";

export const HISTORY_FILE_VERSION = 1;

export type HistoryEntry = {
  id: string;
  mode: BroadcastMode;
  generatedAt: string;
  title: string;
  durationSec: number;
  favorite: boolean;
  storyCount: number;
};

export type HistoryFile = {
  version: typeof HISTORY_FILE_VERSION;
  items: HistoryEntry[];
};

export type HistoryStoreError =
  | { type: "read_failed"; message: string; cause?: unknown }
  | { type: "write_failed"; message: string; cause?: unknown }
  | { type: "invalid_format"; message: string };

export type AddEntryInput = {
  id: string;
  mode: BroadcastMode;
  generatedAt: Date;
  durationSec: number;
  stories: { title: string; url: string }[];
};

export type CleanupResult = {
  removedIds: string[];
  skippedIds: string[];
};

export type RemoveEntryOptions = {
  deleteFiles?: boolean;
};

export type RemoveEntryResult = {
  removed: boolean;
  filesRemoved?: boolean;
};

export type HistoryStore = {
  indexPath: string;
  exists(): Promise<boolean>;
  read(): Promise<Result<HistoryFile, HistoryStoreError>>;
  addEntry(input: AddEntryInput): Promise<Result<HistoryEntry, HistoryStoreError>>;
  removeEntry(
    id: string,
    options?: RemoveEntryOptions,
  ): Promise<Result<RemoveEntryResult, HistoryStoreError>>;
  setFavorite(id: string, favorite: boolean): Promise<Result<HistoryEntry, HistoryStoreError>>;
  cleanup(maxItems: number): Promise<Result<CleanupResult, HistoryStoreError>>;
};

export function createHistoryStore(outputRoot: string): HistoryStore {
  const indexPath = join(outputRoot, "index.json");
  const lock = createLock();

  async function readUnlocked(): Promise<Result<HistoryFile, HistoryStoreError>> {
    try {
      const content = await readFile(indexPath, "utf8");
      return validateHistoryFile(JSON.parse(content));
    } catch (cause) {
      if (isNotFound(cause)) {
        return ok(emptyHistoryFile());
      }
      if (cause instanceof SyntaxError) {
        return err({ type: "invalid_format", message: cause.message });
      }

      return err({
        type: "read_failed",
        message: cause instanceof Error ? cause.message : "Failed to read history file",
        cause,
      });
    }
  }

  async function writeUnlocked(file: HistoryFile): Promise<Result<void, HistoryStoreError>> {
    try {
      await mkdir(dirname(indexPath), { recursive: true });
      await writeAtomic(indexPath, file);
      return ok(undefined);
    } catch (cause) {
      return err({
        type: "write_failed",
        message: cause instanceof Error ? cause.message : "Failed to write history file",
        cause,
      });
    }
  }

  return {
    indexPath,
    async exists() {
      try {
        await readFile(indexPath, "utf8");
        return true;
      } catch (cause) {
        if (isNotFound(cause)) {
          return false;
        }
        return true;
      }
    },
    read() {
      return lock(readUnlocked);
    },
    addEntry(input) {
      return lock(async () => {
        const readResult = await readUnlocked();
        if (readResult.isErr()) {
          return err(readResult.error);
        }

        const existing = readResult.value.items.find((item) => item.id === input.id);
        const entry: HistoryEntry = {
          id: input.id,
          mode: input.mode,
          generatedAt: formatJstOffset(input.generatedAt),
          title: buildTitle(input.stories),
          durationSec: input.durationSec,
          favorite: existing?.favorite ?? false,
          storyCount: input.stories.length,
        };
        const items = [...readResult.value.items.filter((item) => item.id !== input.id), entry];
        const writeResult = await writeUnlocked({ version: HISTORY_FILE_VERSION, items });
        if (writeResult.isErr()) {
          return err(writeResult.error);
        }

        return ok(entry);
      });
    },
    removeEntry(id, options = {}) {
      return lock(async () => {
        const readResult = await readUnlocked();
        if (readResult.isErr()) {
          return err(readResult.error);
        }

        const items = readResult.value.items.filter((item) => item.id !== id);
        const removed = items.length !== readResult.value.items.length;
        if (!removed) {
          return ok({ removed: false });
        }

        let filesRemoved: boolean | undefined;
        if (options.deleteFiles) {
          filesRemoved = await removeOutputDirectory(join(outputRoot, id), id);
        }

        const writeResult = await writeUnlocked({ version: HISTORY_FILE_VERSION, items });
        if (writeResult.isErr()) {
          return err(writeResult.error);
        }

        return ok({ removed: true, ...(filesRemoved !== undefined ? { filesRemoved } : {}) });
      });
    },
    setFavorite(id, favorite) {
      return lock(async () => {
        const readResult = await readUnlocked();
        if (readResult.isErr()) {
          return err(readResult.error);
        }

        const entry = readResult.value.items.find((item) => item.id === id);
        if (!entry) {
          return err({ type: "invalid_format", message: `History entry not found: ${id}` });
        }

        const updated = { ...entry, favorite };
        const items = readResult.value.items.map((item) => (item.id === id ? updated : item));
        const writeResult = await writeUnlocked({ version: HISTORY_FILE_VERSION, items });
        if (writeResult.isErr()) {
          return err(writeResult.error);
        }

        return ok(updated);
      });
    },
    cleanup(maxItems) {
      return lock(async () => {
        const readResult = await readUnlocked();
        if (readResult.isErr()) {
          return err(readResult.error);
        }

        const removeCount = Math.max(0, readResult.value.items.length - maxItems);
        if (removeCount === 0) {
          return ok({ removedIds: [], skippedIds: [] });
        }

        const candidates = [...readResult.value.items]
          .filter((item) => !item.favorite)
          .sort((a, b) => a.generatedAt.localeCompare(b.generatedAt))
          .slice(0, removeCount);
        const removedIds: string[] = [];
        const skippedIds: string[] = [];

        for (const candidate of candidates) {
          try {
            await rm(join(outputRoot, candidate.id), { recursive: true });
            removedIds.push(candidate.id);
          } catch (cause) {
            skippedIds.push(candidate.id);
            console.warn(
              `History cleanup skipped ${candidate.id}: ${
                cause instanceof Error ? cause.message : String(cause)
              }`,
            );
          }
        }

        if (removedIds.length > 0) {
          const removed = new Set(removedIds);
          const items = readResult.value.items.filter((item) => !removed.has(item.id));
          const writeResult = await writeUnlocked({ version: HISTORY_FILE_VERSION, items });
          if (writeResult.isErr()) {
            return err(writeResult.error);
          }
        }

        return ok({ removedIds, skippedIds });
      });
    },
  };
}

function emptyHistoryFile(): HistoryFile {
  return { version: HISTORY_FILE_VERSION, items: [] };
}

function validateHistoryFile(value: unknown): Result<HistoryFile, HistoryStoreError> {
  if (
    typeof value !== "object" ||
    value === null ||
    !("version" in value) ||
    (value as { version?: unknown }).version !== HISTORY_FILE_VERSION ||
    !Array.isArray((value as { items?: unknown }).items)
  ) {
    return err({ type: "invalid_format", message: "History file has an invalid format" });
  }

  return ok(value as HistoryFile);
}

async function writeAtomic(filePath: string, data: HistoryFile): Promise<void> {
  const tempPath = `${filePath}.tmp`;
  await writeFile(tempPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  await rename(tempPath, filePath);
}

async function removeOutputDirectory(dir: string, id: string): Promise<boolean> {
  try {
    await stat(dir);
  } catch (cause) {
    if (isNotFound(cause)) {
      return false;
    }
    console.warn(
      `History delete skipped files for ${id}: ${
        cause instanceof Error ? cause.message : String(cause)
      }`,
    );
    return false;
  }

  try {
    await rm(dir, { recursive: true, force: true });
    return true;
  } catch (cause) {
    console.warn(
      `History delete skipped files for ${id}: ${
        cause instanceof Error ? cause.message : String(cause)
      }`,
    );
    return false;
  }
}

function isNotFound(cause: unknown): boolean {
  return (
    typeof cause === "object" &&
    cause !== null &&
    "code" in cause &&
    (cause as { code?: unknown }).code === "ENOENT"
  );
}
