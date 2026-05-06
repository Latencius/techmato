export type TurnstileVerifyResult =
  | { ok: true }
  | {
      ok: false;
      reason: "missing_secret" | "missing_token" | "verification_failed";
      message?: string;
    };

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstileToken(
  token: string | null | undefined,
): Promise<TurnstileVerifyResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();

  if (!secret) {
    // F5 will make this mandatory for production. Local development can skip verification.
    return { ok: true };
  }

  if (!token?.trim()) {
    return { ok: false, reason: "missing_token" };
  }

  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token.trim());

  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const result = (await response.json()) as {
      success?: unknown;
      "error-codes"?: unknown;
    };

    if (result.success === true) {
      return { ok: true };
    }

    return {
      ok: false,
      reason: "verification_failed",
      message: Array.isArray(result["error-codes"])
        ? result["error-codes"].join(", ")
        : `siteverify failed: ${response.status}`,
    };
  } catch (cause) {
    return {
      ok: false,
      reason: "verification_failed",
      message: cause instanceof Error ? cause.message : "siteverify request failed",
    };
  }
}
