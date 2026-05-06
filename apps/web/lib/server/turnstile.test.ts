import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyTurnstileToken } from "./turnstile.js";

describe("verifyTurnstileToken", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("skips verification when TURNSTILE_SECRET_KEY is not configured", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");

    await expect(verifyTurnstileToken(undefined)).resolves.toEqual({ ok: true });
  });

  it("requires a token when a secret is configured", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");

    await expect(verifyTurnstileToken("")).resolves.toEqual({
      ok: false,
      reason: "missing_token",
    });
  });

  it("returns ok for a successful siteverify response", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ success: true })));

    await expect(verifyTurnstileToken("token")).resolves.toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledWith(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }),
    );
  });

  it("returns verification_failed for a failed siteverify response", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ success: false, "error-codes": ["bad-request"] })),
    );

    await expect(verifyTurnstileToken("token")).resolves.toEqual({
      ok: false,
      reason: "verification_failed",
      message: "bad-request",
    });
  });

  it("returns verification_failed when fetch throws", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    await expect(verifyTurnstileToken("token")).resolves.toEqual({
      ok: false,
      reason: "verification_failed",
      message: "network down",
    });
  });
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
