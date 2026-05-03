const KEY = "techmato:lastBroadcastId";

export function readLastBroadcastId(): string | null {
  try {
    if (typeof window === "undefined") {
      return null;
    }

    const value = window.localStorage.getItem(KEY);
    return isValidBroadcastId(value) ? value : null;
  } catch {
    return null;
  }
}

export function writeLastBroadcastId(broadcastId: string): void {
  try {
    if (typeof window !== "undefined" && isValidBroadcastId(broadcastId)) {
      window.localStorage.setItem(KEY, broadcastId);
    }
  } catch {
    // localStorage may be disabled; the app can still run without recall.
  }
}

export function clearLastBroadcastId(): void {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(KEY);
    }
  } catch {
    // localStorage may be disabled; nothing else to clean up.
  }
}

function isValidBroadcastId(value: string | null): value is string {
  const trimmed = value?.trim();

  return !!trimmed && trimmed !== "null" && trimmed !== "undefined";
}
