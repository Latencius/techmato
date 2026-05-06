import { readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { buildVtt, type SegmentsJson } from "@techmato/pipeline";
import { err, ok, type Result } from "neverthrow";

export type CaptionsStoreError =
  | { type: "not_found" }
  | { type: "read_failed"; message: string; cause?: unknown };

export function createCaptionsStore(outputRoot: string): {
  read(broadcastId: string): Promise<Result<string, CaptionsStoreError>>;
  backfill(broadcastId: string): Promise<Result<string, CaptionsStoreError>>;
} {
  return {
    async read(broadcastId) {
      try {
        return ok(await readFile(captionsPath(outputRoot, broadcastId), "utf8"));
      } catch (cause) {
        if (isNotFound(cause)) {
          return err({ type: "not_found" });
        }

        return err({
          type: "read_failed",
          message: cause instanceof Error ? cause.message : "Failed to read captions",
          cause,
        });
      }
    },
    async backfill(broadcastId) {
      const dir = join(outputRoot, broadcastId);

      try {
        const segments = JSON.parse(
          await readFile(join(dir, "segments.json"), "utf8"),
        ) as SegmentsJson;
        const vtt = buildVtt(
          segments.segments.map((segment) => ({
            text: segment.title,
            startSec: segment.startSec,
            endSec: segment.endSec,
          })),
        );
        const target = captionsPath(outputRoot, broadcastId);
        const tmp = `${target}.tmp`;
        await writeFile(tmp, vtt, "utf8");
        await rename(tmp, target);

        return ok(vtt);
      } catch (cause) {
        if (isNotFound(cause)) {
          return err({ type: "not_found" });
        }

        return err({
          type: "read_failed",
          message: cause instanceof Error ? cause.message : "Failed to backfill captions",
          cause,
        });
      }
    },
  };
}

function captionsPath(outputRoot: string, broadcastId: string): string {
  return join(outputRoot, broadcastId, "captions.vtt");
}

function isNotFound(cause: unknown): boolean {
  return (
    typeof cause === "object" &&
    cause !== null &&
    "code" in cause &&
    (cause as { code?: unknown }).code === "ENOENT"
  );
}
