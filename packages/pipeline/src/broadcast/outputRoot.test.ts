import { describe, expect, it, vi } from "vitest";

vi.mock("node:url", () => ({
  fileURLToPath: (url: URL | string) => new URL(url).pathname,
}));

import { resolveDefaultOutputRoot } from "./outputRoot.js";

describe("resolveDefaultOutputRoot", () => {
  it("resolves workspace output from a package app source file", () => {
    const root = resolveDefaultOutputRoot(
      new URL("file:///workspace/techmato/apps/cli/src/runBroadcast.ts"),
    );

    expect(normalizePath(root)).toBe("/workspace/techmato/output");
  });

  it("resolves workspace output from a web server helper source file", () => {
    const root = resolveDefaultOutputRoot(
      new URL("file:///workspace/techmato/apps/web/lib/server/outputStore.ts"),
    );

    expect(normalizePath(root)).toBe("/workspace/techmato/output");
  });
});

function normalizePath(path: string): string {
  return path.replaceAll("\\", "/").replace(/^[A-Z]:/i, "");
}
