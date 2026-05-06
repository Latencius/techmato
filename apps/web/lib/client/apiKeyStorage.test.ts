import { afterEach, describe, expect, it, vi } from "vitest";
import { clearApiKey, maskApiKey, readApiKey, writeApiKey } from "./apiKeyStorage.js";

describe("apiKeyStorage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reads, writes, and clears the stored API key", () => {
    const storage = createStorage();
    vi.stubGlobal("window", { localStorage: storage });

    writeApiKey("sk-ant-valid-key");
    expect(readApiKey()).toBe("sk-ant-valid-key");

    clearApiKey();
    expect(readApiKey()).toBeNull();
  });

  it.each(["", "   ", "null", "undefined"])("rejects invalid stored value %s", (value) => {
    const storage = createStorage();
    storage.setItem("techmato:anthropicApiKey", value);
    vi.stubGlobal("window", { localStorage: storage });

    expect(readApiKey()).toBeNull();
  });

  it("does not throw when window is unavailable", () => {
    vi.stubGlobal("window", undefined);

    expect(readApiKey()).toBeNull();
    expect(() => writeApiKey("sk-ant-valid-key")).not.toThrow();
    expect(() => clearApiKey()).not.toThrow();
  });
});

describe("maskApiKey", () => {
  it("masks a normal Anthropic key and keeps the last four characters", () => {
    expect(maskApiKey(`sk-ant-${"a".repeat(20)}WXYZ`)).toBe("sk-ant-...WXYZ");
  });

  it.each(["", "short"])("returns a generic mask for short values", (value) => {
    expect(maskApiKey(value)).toBe("***");
  });
});

function createStorage(): Storage {
  const values = new Map<string, string>();

  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}
