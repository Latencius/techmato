import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearLastBroadcastId,
  readLastBroadcastId,
  writeLastBroadcastId,
} from "./lastBroadcast.js";

describe("lastBroadcast storage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("writes, reads, and clears the last broadcast id", () => {
    const storage = createStorage();
    vi.stubGlobal("window", { localStorage: storage });

    writeLastBroadcastId("broadcast-1");

    expect(readLastBroadcastId()).toBe("broadcast-1");

    clearLastBroadcastId();

    expect(readLastBroadcastId()).toBeNull();
  });

  it("does not return empty or null-like values", () => {
    const storage = createStorage();
    vi.stubGlobal("window", { localStorage: storage });

    storage.setItem("techmato:lastBroadcastId", "");
    expect(readLastBroadcastId()).toBeNull();

    storage.setItem("techmato:lastBroadcastId", "null");
    expect(readLastBroadcastId()).toBeNull();

    storage.setItem("techmato:lastBroadcastId", "undefined");
    expect(readLastBroadcastId()).toBeNull();
  });

  it("does not throw when localStorage access fails", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => {
          throw new Error("blocked");
        },
        setItem: () => {
          throw new Error("blocked");
        },
        removeItem: () => {
          throw new Error("blocked");
        },
      },
    });

    expect(readLastBroadcastId()).toBeNull();
    expect(() => writeLastBroadcastId("broadcast-1")).not.toThrow();
    expect(() => clearLastBroadcastId()).not.toThrow();
  });
});

function createStorage(): Storage {
  const items = new Map<string, string>();

  return {
    get length() {
      return items.size;
    },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (index) => Array.from(items.keys())[index] ?? null,
    removeItem: (key) => items.delete(key),
    setItem: (key, value) => {
      items.set(key, value);
    },
  };
}
