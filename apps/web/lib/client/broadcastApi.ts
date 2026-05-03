import type { SegmentsJson, StoriesJson } from "@techmato/pipeline/broadcast/render";

export type StartBroadcastResult =
  | { ok: true; broadcastId: string; outputDir: string }
  | { ok: false; reason: "conflict"; runningBroadcastId?: string }
  | { ok: false; reason: "error"; message: string };

export type BroadcastStatus = "running" | "completed" | "failed";

export type BroadcastMetadataResponse = {
  broadcastId: string;
  status: BroadcastStatus;
  startedAt: string;
  completedAt?: string;
  error?: { stage: string; message: string };
  metadata?: {
    segments: SegmentsJson;
    stories: StoriesJson;
  };
};

export type FetchBroadcastResult =
  | { ok: true; data: BroadcastMetadataResponse }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "error"; message: string };

export async function startBroadcast(): Promise<StartBroadcastResult> {
  try {
    const response = await fetch("/api/broadcast", { method: "POST" });
    const body = (await response.json().catch(() => ({}))) as {
      broadcastId?: unknown;
      outputDir?: unknown;
      error?: unknown;
    };

    if (response.status === 202) {
      return {
        ok: true,
        broadcastId: typeof body.broadcastId === "string" ? body.broadcastId : "",
        outputDir: typeof body.outputDir === "string" ? body.outputDir : "",
      };
    }

    if (response.status === 409) {
      return {
        ok: false,
        reason: "conflict",
        ...(typeof body.broadcastId === "string" ? { runningBroadcastId: body.broadcastId } : {}),
      };
    }

    return {
      ok: false,
      reason: "error",
      message: typeof body.error === "string" ? body.error : `Request failed: ${response.status}`,
    };
  } catch (cause) {
    return {
      ok: false,
      reason: "error",
      message: cause instanceof Error ? cause.message : "Failed to start broadcast",
    };
  }
}

export async function fetchBroadcast(broadcastId: string): Promise<FetchBroadcastResult> {
  try {
    const response = await fetch(`/api/broadcast/${encodeURIComponent(broadcastId)}`);
    const body = (await response.json().catch(() => ({}))) as {
      error?: unknown;
    };

    if (response.status === 200) {
      return { ok: true, data: body as BroadcastMetadataResponse };
    }

    if (response.status === 404) {
      return { ok: false, reason: "not_found" };
    }

    return {
      ok: false,
      reason: "error",
      message: typeof body.error === "string" ? body.error : `Request failed: ${response.status}`,
    };
  } catch (cause) {
    return {
      ok: false,
      reason: "error",
      message: cause instanceof Error ? cause.message : "Failed to fetch broadcast",
    };
  }
}
