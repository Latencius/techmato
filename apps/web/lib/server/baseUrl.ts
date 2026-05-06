import { headers } from "next/headers";

const FALLBACK_BASE_URL = "http://localhost:3000";

export async function resolveBaseUrl(): Promise<string> {
  const configured = process.env.PUBLIC_BASE_URL?.trim();
  if (configured) {
    return trimTrailingSlash(configured);
  }

  try {
    const headerStore = await headers();
    const host = headerStore.get("host")?.trim();

    if (!host) {
      return FALLBACK_BASE_URL;
    }

    const proto = headerStore.get("x-forwarded-proto")?.split(",")[0]?.trim() || "http";
    return `${proto}://${host}`;
  } catch {
    return FALLBACK_BASE_URL;
  }
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}
