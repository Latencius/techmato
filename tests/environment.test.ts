import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("environment setup", () => {
  it("declares the expected workspace packages", async () => {
    const workspace = await readFile("pnpm-workspace.yaml", "utf8");

    expect(workspace).toContain('"apps/*"');
    expect(workspace).toContain('"packages/*"');
  });

  it("documents required local environment variables", async () => {
    const envExample = await readFile(".env.example", "utf8");

    expect(envExample).toContain("ANTHROPIC_API_KEY=");
    expect(envExample).toContain("VOICEVOX_BASE_URL=http://localhost:50021");
  });

  it("includes a local VOICEVOX compose service", async () => {
    const compose = await readFile("infra/voicevox/docker-compose.yml", "utf8");

    expect(compose).toContain("voicevox/voicevox_engine:cpu-latest");
    expect(compose).toContain('"50021:50021"');
  });
});
