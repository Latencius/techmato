import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseArgs } from "./args.js";

describe("parseArgs", () => {
  it("returns defaults for empty argv", () => {
    expect(parseArgs([])).toEqual({
      ok: true,
      value: {
        speaker: 3,
        maxStories: 4,
        mode: "short",
        voicevox: "http://localhost:50021",
        gapMs: 300,
        outputRoot: null,
      },
    });
  });

  it("overrides defaults with supported flags", () => {
    expect(
      parseArgs([
        "--speaker",
        "8",
        "--max-stories",
        "3",
        "--voicevox",
        "http://127.0.0.1:50021/",
        "--gap-ms",
        "500",
        "--output-root",
        "tmp/output",
      ]),
    ).toEqual({
      ok: true,
      value: {
        speaker: 8,
        maxStories: 3,
        mode: "short",
        voicevox: "http://127.0.0.1:50021/",
        gapMs: 500,
        outputRoot: resolve("tmp/output"),
      },
    });
  });

  it("ignores the pnpm argument separator", () => {
    const result = parseArgs(["--", "--speaker", "8"]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.speaker).toBe(8);
    }
  });

  it("uses VOICEVOX_BASE_URL as the voicevox default", () => {
    const original = process.env.VOICEVOX_BASE_URL;
    process.env.VOICEVOX_BASE_URL = "http://voicevox.local";

    try {
      const result = parseArgs([]);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.voicevox).toBe("http://voicevox.local");
      }
    } finally {
      if (original === undefined) {
        delete process.env.VOICEVOX_BASE_URL;
      } else {
        process.env.VOICEVOX_BASE_URL = original;
      }
    }
  });

  it("rejects unknown flags", () => {
    expect(parseArgs(["--wat"])).toEqual({
      ok: false,
      message: "Unknown flag: --wat",
    });
  });

  it("rejects non-numeric numeric flags", () => {
    expect(parseArgs(["--speaker", "zunda"])).toEqual({
      ok: false,
      message: "--speaker must be a number",
    });
  });

  it("uses long mode defaults when --mode long is provided", () => {
    expect(parseArgs(["--mode", "long"])).toEqual({
      ok: true,
      value: {
        speaker: 3,
        maxStories: 3,
        mode: "long",
        voicevox: "http://localhost:50021",
        gapMs: 300,
        outputRoot: null,
      },
    });
  });

  it("rejects unsupported modes", () => {
    expect(parseArgs(["--mode", "foo"])).toEqual({
      ok: false,
      message: "--mode must be short or long",
    });
  });

  it("lets --max-stories override the long mode default", () => {
    const result = parseArgs(["--mode", "long", "--max-stories", "5"]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.mode).toBe("long");
      expect(result.value.maxStories).toBe(5);
    }
  });
});
