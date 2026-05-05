import { stat } from "node:fs/promises";
import type { BroadcastMode, HistoryEntry } from "@techmato/pipeline";
import { NextResponse } from "next/server";
import { historyStore } from "../../../lib/server/historyStoreSingleton";
import { createOutputStore, resolveWebOutputRoot } from "../../../lib/server/outputStore";

export const runtime = "nodejs";

type ModeFilter = BroadcastMode | "all";

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const mode = readModeFilter(url.searchParams.get("mode"));
  const favorite = readFavoriteFilter(url.searchParams.get("favorite"));

  if (!mode.ok) {
    return NextResponse.json({ error: "mode must be short, long, or all" }, { status: 400 });
  }
  if (!favorite.ok) {
    return NextResponse.json({ error: "favorite must be true or false" }, { status: 400 });
  }

  const readResult = await historyStore.read();
  if (readResult.isErr()) {
    return NextResponse.json({ error: readResult.error.message }, { status: 500 });
  }

  const outputStore = createOutputStore(resolveWebOutputRoot());
  const existingItems = await removeMissingEntries(readResult.value.items, (id) =>
    outputStore.resolveDir(id),
  );
  const filteredItems = existingItems
    .filter((item) => mode.value === "all" || item.mode === mode.value)
    .filter((item) => favorite.value === null || item.favorite === favorite.value)
    .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));

  return NextResponse.json({ items: filteredItems });
}

async function removeMissingEntries(
  items: HistoryEntry[],
  resolveDir: (id: string) => string,
): Promise<HistoryEntry[]> {
  const checks = await Promise.all(
    items.map(async (item) => {
      try {
        await stat(resolveDir(item.id));
        return { item, exists: true };
      } catch (cause) {
        if (isNotFound(cause)) {
          return { item, exists: false };
        }
        return { item, exists: true };
      }
    }),
  );
  const missing = checks.filter((check) => !check.exists).map((check) => check.item.id);

  await Promise.all(missing.map((id) => historyStore.removeEntry(id)));

  return checks.filter((check) => check.exists).map((check) => check.item);
}

function readModeFilter(value: string | null): { ok: true; value: ModeFilter } | { ok: false } {
  if (value === null || value === "all") {
    return { ok: true, value: "all" };
  }
  if (value === "short" || value === "long") {
    return { ok: true, value };
  }

  return { ok: false };
}

function readFavoriteFilter(
  value: string | null,
): { ok: true; value: boolean | null } | { ok: false } {
  if (value === null) {
    return { ok: true, value: null };
  }
  if (value === "true") {
    return { ok: true, value: true };
  }
  if (value === "false") {
    return { ok: true, value: false };
  }

  return { ok: false };
}

function isNotFound(cause: unknown): boolean {
  return (
    typeof cause === "object" &&
    cause !== null &&
    "code" in cause &&
    (cause as { code?: unknown }).code === "ENOENT"
  );
}
