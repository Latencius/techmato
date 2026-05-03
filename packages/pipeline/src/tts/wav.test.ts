import { describe, expect, it } from "vitest";
import { concatWav, parseWavDurationSec, splitWav } from "./wav.js";

function makeFakeWav(
  sampleRate = 24_000,
  channels = 1,
  bitsPerSample = 16,
  durationSec = 1.5,
): Uint8Array {
  const blockAlign = (channels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = Math.round(durationSec * byteRate);
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  bytes.set(new TextEncoder().encode("RIFF"), 0);
  view.setUint32(4, 36 + dataSize, true);
  bytes.set(new TextEncoder().encode("WAVE"), 8);
  bytes.set(new TextEncoder().encode("fmt "), 12);
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  bytes.set(new TextEncoder().encode("data"), 36);
  view.setUint32(40, dataSize, true);

  return bytes;
}

describe("parseWavDurationSec", () => {
  it("calculates duration from PCM WAV headers", () => {
    expect(parseWavDurationSec(makeFakeWav(24_000, 1, 16, 1.5))).toBeCloseTo(1.5, 5);
    expect(parseWavDurationSec(makeFakeWav(48_000, 2, 16, 2.25))).toBeCloseTo(2.25, 5);
  });

  it("throws for an invalid RIFF magic number", () => {
    const wav = makeFakeWav();
    wav.set(new TextEncoder().encode("NOPE"), 0);

    expect(() => parseWavDurationSec(wav)).toThrow("Invalid WAV RIFF header");
  });
});

describe("splitWav", () => {
  it("splits a PCM WAV into header, data, and format metadata", () => {
    const wav = makeFakeWav(24_000, 1, 16, 1.5);
    const parts = splitWav(wav);

    expect(parts.header).toHaveLength(44);
    expect(parts.data).toHaveLength(24_000 * 2 * 1.5);
    expect(parts.sampleRate).toBe(24_000);
    expect(parts.channels).toBe(1);
    expect(parts.bitsPerSample).toBe(16);
  });
});

describe("concatWav", () => {
  it("concatenates PCM data and rewrites WAV sizes", () => {
    const wav = concatWav([
      splitWav(makeFakeWav(24_000, 1, 16, 1.5)),
      splitWav(makeFakeWav(24_000, 1, 16, 1.5)),
      splitWav(makeFakeWav(24_000, 1, 16, 1.5)),
    ]);

    expect(parseWavDurationSec(wav)).toBeCloseTo(4.5, 5);
    expect(new DataView(wav.buffer, wav.byteOffset, wav.byteLength).getUint32(40, true)).toBe(
      24_000 * 2 * 4.5,
    );
  });

  it("throws when WAV formats differ", () => {
    expect(() => concatWav([splitWav(makeFakeWav(24_000)), splitWav(makeFakeWav(48_000))])).toThrow(
      "Cannot concatenate WAV files with different formats",
    );
  });
});
