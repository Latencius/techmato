import { describe, expect, it } from "vitest";
import { validateApiKey } from "./apiKeyValidator.js";

describe("validateApiKey", () => {
  it.each([undefined, 42, {}, "", "   "])("returns empty for %s", (value) => {
    expect(validateApiKey(value)).toEqual({ ok: false, reason: "empty" });
  });

  it("rejects keys without the Anthropic prefix", () => {
    expect(validateApiKey("sk-proj-abcdefghijklmnopqrstuvwxyz".repeat(5))).toEqual({
      ok: false,
      reason: "invalid_prefix",
    });
  });

  it("rejects short Anthropic-looking keys", () => {
    expect(validateApiKey("sk-ant-short")).toEqual({ ok: false, reason: "too_short" });
  });

  it("accepts a long Anthropic-looking key", () => {
    expect(validateApiKey(`sk-ant-${"a".repeat(101)}`)).toEqual({ ok: true });
  });
});
