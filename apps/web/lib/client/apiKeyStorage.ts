const KEY = "techmato:anthropicApiKey";

export function readApiKey(): string | null {
  try {
    if (typeof window === "undefined") {
      return null;
    }

    const value = window.localStorage.getItem(KEY);
    return isValidStoredKey(value) ? value.trim() : null;
  } catch {
    return null;
  }
}

export function writeApiKey(value: string): void {
  try {
    if (typeof window !== "undefined" && value.trim()) {
      window.localStorage.setItem(KEY, value.trim());
    }
  } catch {
    // localStorage may be disabled; generation can still continue for the current attempt.
  }
}

export function clearApiKey(): void {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(KEY);
    }
  } catch {
    // localStorage may be disabled; nothing else to clean up.
  }
}

export function maskApiKey(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length < 8) {
    return "***";
  }

  return `sk-ant-...${trimmed.slice(-4)}`;
}

function isValidStoredKey(value: string | null): value is string {
  const trimmed = value?.trim();

  return !!trimmed && trimmed !== "null" && trimmed !== "undefined";
}
