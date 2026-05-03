import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchBroadcast, startBroadcast } from "./broadcastApi.js";

describe("startBroadcast", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns broadcast details for a 202 response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(202, {
          broadcastId: "broadcast-1",
          outputDir: "/tmp/output/broadcast-1",
        }),
      ),
    );

    await expect(startBroadcast()).resolves.toEqual({
      ok: true,
      broadcastId: "broadcast-1",
      outputDir: "/tmp/output/broadcast-1",
    });
    expect(fetch).toHaveBeenCalledWith("/api/broadcast", { method: "POST" });
  });

  it("sends the requested broadcast mode", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(202, {
          broadcastId: "broadcast-1",
          outputDir: "/tmp/output/broadcast-1",
        }),
      ),
    );

    await startBroadcast({ mode: "long" });

    expect(fetch).toHaveBeenCalledWith("/api/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "long" }),
    });
  });

  it("returns conflict with the running broadcast id for a 409 response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(409, { broadcastId: "running-1" })),
    );

    await expect(startBroadcast()).resolves.toEqual({
      ok: false,
      reason: "conflict",
      runningBroadcastId: "running-1",
    });
  });

  it("returns an error message for non-202/409 responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(500, { error: "boom" })));

    await expect(startBroadcast()).resolves.toEqual({
      ok: false,
      reason: "error",
      message: "boom",
    });
  });

  it("returns an error message when fetch throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    await expect(startBroadcast()).resolves.toEqual({
      ok: false,
      reason: "error",
      message: "network down",
    });
  });
});

describe("fetchBroadcast", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns metadata for a completed broadcast", async () => {
    const body = {
      broadcastId: "broadcast-1",
      status: "completed",
      startedAt: "2026-05-03T12:00:00+09:00",
      completedAt: "2026-05-03T12:01:00+09:00",
      metadata: {
        segments: {
          id: "broadcast-1",
          audioFile: "broadcast.wav",
          audioUrl: "broadcast.wav",
          durationSec: 12,
          generatedAt: "2026-05-03T12:00:00+09:00",
          segments: [],
        },
        stories: {
          selectedAt: "2026-05-03T12:00:00+09:00",
          stories: [],
        },
      },
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, body)));

    await expect(fetchBroadcast("broadcast-1")).resolves.toEqual({ ok: true, data: body });
    expect(fetch).toHaveBeenCalledWith("/api/broadcast/broadcast-1");
  });

  it("returns not_found for a 404 response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(404, { error: "missing" })));

    await expect(fetchBroadcast("missing")).resolves.toEqual({ ok: false, reason: "not_found" });
  });

  it("returns an error message for non-200/404 responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(500, { error: "boom" })));

    await expect(fetchBroadcast("broadcast-1")).resolves.toEqual({
      ok: false,
      reason: "error",
      message: "boom",
    });
  });
});

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
