"use client";

import type { HistoryEntry } from "@techmato/pipeline";
import { useEffect, useState } from "react";
import { deleteBroadcast, fetchHistory, setFavorite } from "../lib/client/historyApi";
import {
  type ArchiveFavoriteFilter,
  ArchiveFilters,
  type ArchiveModeFilter,
} from "./ArchiveFilters";
import { ArchiveItem } from "./ArchiveItem";

export function ArchiveList() {
  const [items, setItems] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modeFilter, setModeFilter] = useState<ArchiveModeFilter>("all");
  const [favoriteFilter, setFavoriteFilter] = useState<ArchiveFavoriteFilter>("all");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchHistory({
      mode: modeFilter,
      ...(favoriteFilter === "favorite_only" ? { favorite: true } : {}),
    }).then((result) => {
      if (cancelled) {
        return;
      }

      if (result.ok) {
        setItems(result.items);
        setLoading(false);
        return;
      }

      setError(result.message);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [modeFilter, favoriteFilter]);

  async function handleToggleFavorite(broadcastId: string, next: boolean) {
    const previous = items;
    setItems((current) =>
      current.map((item) => (item.id === broadcastId ? { ...item, favorite: next } : item)),
    );
    setError(null);

    const result = await setFavorite(broadcastId, next);
    if (result.ok) {
      setItems((current) => current.map((item) => (item.id === broadcastId ? result.entry : item)));
      return;
    }

    setItems(previous);
    setError(result.reason === "not_found" ? "放送が見つかりませんでした。" : result.message);
  }

  async function handleDelete(broadcastId: string) {
    const previous = items;
    setItems((current) => current.filter((item) => item.id !== broadcastId));
    setError(null);

    const result = await deleteBroadcast(broadcastId);
    if (result.ok) {
      return;
    }

    setItems(previous);
    setError(result.reason === "not_found" ? "放送が見つかりませんでした。" : result.message);
  }

  return (
    <section className="mt-8">
      <ArchiveFilters
        modeFilter={modeFilter}
        favoriteFilter={favoriteFilter}
        onModeChange={setModeFilter}
        onFavoriteChange={setFavoriteFilter}
      />

      {error ? (
        <div className="mt-6 border border-[#c96f62] bg-[#fff0ed] px-4 py-3 text-[#8d2e24]">
          <p className="font-semibold">{error}</p>
        </div>
      ) : null}

      {loading ? (
        <div className="mt-8 border border-[#d8cfbd] bg-[#fffaf0] px-5 py-6 text-[#6f665b]">
          履歴を読み込んでいます。
        </div>
      ) : null}

      {!loading && items.length === 0 ? (
        <div className="mt-8 border border-[#d8cfbd] bg-[#fffaf0] px-5 py-8 text-[#6f665b] shadow-[7px_7px_0_#ded4c1]">
          放送がまだありません。
        </div>
      ) : null}

      {!loading && items.length > 0 ? (
        <div className="mt-8 grid gap-4">
          {items.map((entry) => (
            <ArchiveItem
              key={entry.id}
              entry={entry}
              onToggleFavorite={handleToggleFavorite}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
