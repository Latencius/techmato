import { beforeEach, describe, expect, it, vi } from "vitest";

const { headersMock } = vi.hoisted(() => ({
  headersMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

import { resolveBaseUrl } from "./baseUrl";

describe("resolveBaseUrl", () => {
  beforeEach(() => {
    headersMock.mockReset();
    vi.unstubAllEnvs();
  });

  it("uses PUBLIC_BASE_URL when configured", async () => {
    vi.stubEnv("PUBLIC_BASE_URL", "https://techmato.example.com");

    await expect(resolveBaseUrl()).resolves.toBe("https://techmato.example.com");
  });

  it("trims trailing slashes from PUBLIC_BASE_URL", async () => {
    vi.stubEnv("PUBLIC_BASE_URL", "https://techmato.example.com///");

    await expect(resolveBaseUrl()).resolves.toBe("https://techmato.example.com");
  });

  it("builds a URL from request headers when PUBLIC_BASE_URL is not configured", async () => {
    headersMock.mockResolvedValue(
      new Headers({
        host: "preview.techmato.example",
        "x-forwarded-proto": "https",
      }),
    );

    await expect(resolveBaseUrl()).resolves.toBe("https://preview.techmato.example");
  });

  it("falls back to localhost when neither environment nor headers are available", async () => {
    headersMock.mockRejectedValue(new Error("headers unavailable"));

    await expect(resolveBaseUrl()).resolves.toBe("http://localhost:3000");
  });
});
