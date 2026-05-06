import type { BroadcastMode, HistoryEntry } from "@techmato/pipeline";

export type FetchHistoryOptions = {
  mode?: BroadcastMode | "all";
  favorite?: boolean;
};

export type FetchHistoryResult =
  | { ok: true; items: HistoryEntry[] }
  | { ok: false; reason: "error"; message: string };

export type SetFavoriteResult =
  | { ok: true; entry: HistoryEntry }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "error"; message: string };

export type DeleteBroadcastResult =
  | { ok: true; filesRemoved: boolean }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "error"; message: string };

export async function fetchHistory(options: FetchHistoryOptions = {}): Promise<FetchHistoryResult> {
  try {
    const response = await fetch(historyUrl(options));
    const body = (await response.json().catch(() => ({}))) as {
      items?: unknown;
      error?: unknown;
    };

    if (response.status === 200) {
      return { ok: true, items: Array.isArray(body.items) ? (body.items as HistoryEntry[]) : [] };
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
      message: cause instanceof Error ? cause.message : "Failed to fetch history",
    };
  }
}

export async function setFavorite(
  broadcastId: string,
  favorite: boolean,
): Promise<SetFavoriteResult> {
  try {
    const response = await fetch(`/api/history/${encodeURIComponent(broadcastId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ favorite }),
    });
    const body = (await response.json().catch(() => ({}))) as {
      error?: unknown;
    };

    if (response.status === 200) {
      return { ok: true, entry: body as HistoryEntry };
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
      message: cause instanceof Error ? cause.message : "Failed to update favorite",
    };
  }
}

export async function deleteBroadcast(broadcastId: string): Promise<DeleteBroadcastResult> {
  try {
    const response = await fetch(`/api/history/${encodeURIComponent(broadcastId)}`, {
      method: "DELETE",
    });
    const body = (await response.json().catch(() => ({}))) as {
      filesRemoved?: unknown;
      error?: unknown;
    };

    if (response.status === 200) {
      return { ok: true, filesRemoved: body.filesRemoved === true };
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
      message: cause instanceof Error ? cause.message : "Failed to delete broadcast",
    };
  }
}

function historyUrl(options: FetchHistoryOptions): string {
  const params = new URLSearchParams();

  if (options.mode && options.mode !== "all") {
    params.set("mode", options.mode);
  }
  if (typeof options.favorite === "boolean") {
    params.set("favorite", String(options.favorite));
  }

  const query = params.toString();
  return query ? `/api/history?${query}` : "/api/history";
}
