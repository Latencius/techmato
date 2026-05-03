import { afterEach, describe, expect, it, vi } from "vitest";
import { startBroadcast } from "./broadcastApi.js";

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

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
