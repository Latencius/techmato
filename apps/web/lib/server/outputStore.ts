import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { Readable } from "node:stream";
import { resolveDefaultOutputRoot } from "@techmato/pipeline/broadcast/outputRoot";
import type { SegmentsJson, StoriesJson } from "@techmato/pipeline/broadcast/render";
import { err, ok, type Result } from "neverthrow";

export type BroadcastMetadata = {
  segments: SegmentsJson;
  stories: StoriesJson;
};

export type OutputStoreError =
  | { type: "not_found"; broadcastId: string }
  | { type: "read_failed"; message: string; cause?: unknown };

export function createOutputStore(outputRoot: string): {
  resolveDir(broadcastId: string): string;
  readMetadata(broadcastId: string): Promise<Result<BroadcastMetadata, OutputStoreError>>;
  audioStream(broadcastId: string): Promise<
    Result<
      {
        stream: ReadableStream<Uint8Array>;
        size: number;
      },
      OutputStoreError
    >
  >;
} {
  return {
    resolveDir(broadcastId) {
      return join(outputRoot, broadcastId);
    },
    async readMetadata(broadcastId) {
      try {
        const dir = join(outputRoot, broadcastId);
        const [segments, stories] = await Promise.all([
          readJson<SegmentsJson>(join(dir, "segments.json")),
          readJson<StoriesJson>(join(dir, "stories.json")),
        ]);

        return ok({ segments, stories });
      } catch (cause) {
        if (isNotFound(cause)) {
          return err({ type: "not_found", broadcastId });
        }

        return err({
          type: "read_failed",
          message: cause instanceof Error ? cause.message : "Failed to read broadcast metadata",
          cause,
        });
      }
    },
    async audioStream(broadcastId) {
      const filePath = join(outputRoot, broadcastId, "broadcast.wav");

      try {
        const file = await stat(filePath);
        const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream<Uint8Array>;

        return ok({ stream, size: file.size });
      } catch (cause) {
        if (isNotFound(cause)) {
          return err({ type: "not_found", broadcastId });
        }

        return err({
          type: "read_failed",
          message: cause instanceof Error ? cause.message : "Failed to read broadcast audio",
          cause,
        });
      }
    },
  };
}

export function resolveWebOutputRoot(): string {
  return process.env.TECHMATO_OUTPUT_ROOT ?? resolveDefaultOutputRoot(import.meta.url);
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

function isNotFound(cause: unknown): boolean {
  return (
    typeof cause === "object" &&
    cause !== null &&
    "code" in cause &&
    (cause as { code?: unknown }).code === "ENOENT"
  );
}
