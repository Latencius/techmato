export type ApiKeyValidationResult =
  | { ok: true }
  | { ok: false; reason: "empty" | "invalid_prefix" | "too_short" };

export function validateApiKey(value: unknown): ApiKeyValidationResult {
  if (typeof value !== "string") {
    return { ok: false, reason: "empty" };
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return { ok: false, reason: "empty" };
  }
  if (!trimmed.startsWith("sk-ant-")) {
    return { ok: false, reason: "invalid_prefix" };
  }
  if (trimmed.length < 100) {
    return { ok: false, reason: "too_short" };
  }

  return { ok: true };
}
