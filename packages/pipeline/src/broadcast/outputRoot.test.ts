import { describe, expect, it } from "vitest";
import { resolveDefaultOutputRoot } from "./outputRoot.js";

describe("resolveDefaultOutputRoot", () => {
  it("resolves workspace output from a package app source file", () => {
    const root = resolveDefaultOutputRoot(
      new URL("file:///C:/workspace/techmato/apps/cli/src/runBroadcast.ts"),
    );

    expect(root.replaceAll("\\", "/")).toBe("C:/workspace/techmato/output");
  });

  it("resolves workspace output from a web server helper source file", () => {
    const root = resolveDefaultOutputRoot(
      new URL("file:///C:/workspace/techmato/apps/web/lib/server/outputStore.ts"),
    );

    expect(root.replaceAll("\\", "/")).toBe("C:/workspace/techmato/output");
  });
});
