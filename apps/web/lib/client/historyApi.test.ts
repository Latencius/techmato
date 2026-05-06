import { afterEach, describe, expect, it, vi } from "vitest";
import { deleteBroadcast, fetchHistory, setFavorite } from "./historyApi.js";

describe("fetchHistory", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns history items for a 200 response", async () => {
    const items = [historyEntry("broadcast-1")];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, { items })));

    await expect(fetchHistory()).resolves.toEqual({ ok: true, items });
    expect(fetch).toHaveBeenCalledWith("/api/history");
  });

  it("builds mode and favorite query parameters", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, { items: [] })));

    await fetchHistory({ mode: "long", favorite: true });

    expect(fetch).toHaveBeenCalledWith("/api/history?mode=long&favorite=true");
  });

  it("omits all mode from query parameters", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, { items: [] })));

    await fetchHistory({ mode: "all", favorite: false });

    expect(fetch).toHaveBeenCalledWith("/api/history?favorite=false");
  });

  it("returns an error message for non-200 responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(500, { error: "boom" })));

    await expect(fetchHistory()).resolves.toEqual({
      ok: false,
      reason: "error",
      message: "boom",
    });
  });
});

describe("setFavorite", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the updated entry for a 200 response", async () => {
    const entry = { ...historyEntry("broadcast-1"), favorite: true };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, entry)));

    await expect(setFavorite("broadcast-1", true)).resolves.toEqual({ ok: true, entry });
    expect(fetch).toHaveBeenCalledWith("/api/history/broadcast-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ favorite: true }),
    });
  });

  it("returns not_found for a 404 response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(404, { error: "missing" })));

    await expect(setFavorite("missing", true)).resolves.toEqual({
      ok: false,
      reason: "not_found",
    });
  });

  it("returns an error message for non-200/404 responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(500, { error: "boom" })));

    await expect(setFavorite("broadcast-1", true)).resolves.toEqual({
      ok: false,
      reason: "error",
      message: "boom",
    });
  });
});

describe("deleteBroadcast", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns file removal status for a 200 response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(200, { removed: true, filesRemoved: true })),
    );

    await expect(deleteBroadcast("broadcast-1")).resolves.toEqual({
      ok: true,
      filesRemoved: true,
    });
    expect(fetch).toHaveBeenCalledWith("/api/history/broadcast-1", { method: "DELETE" });
  });

  it("returns not_found for a 404 response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(404, { error: "missing" })));

    await expect(deleteBroadcast("missing")).resolves.toEqual({
      ok: false,
      reason: "not_found",
    });
  });

  it("returns an error message for non-200/404 responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(500, { error: "boom" })));

    await expect(deleteBroadcast("broadcast-1")).resolves.toEqual({
      ok: false,
      reason: "error",
      message: "boom",
    });
  });
});

function historyEntry(id: string) {
  return {
    id,
    mode: "short" as const,
    generatedAt: "2026-05-06T03:13:14+09:00",
    title: "Story title",
    durationSec: 79.4,
    favorite: false,
    storyCount: 4,
  };
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
