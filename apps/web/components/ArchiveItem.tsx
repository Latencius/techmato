"use client";

import type { HistoryEntry } from "@techmato/pipeline";

type Props = {
  entry: HistoryEntry;
  onToggleFavorite: (broadcastId: string, next: boolean) => void;
  onDelete: (broadcastId: string) => void;
};

export function ArchiveItem({ entry, onToggleFavorite, onDelete }: Props) {
  function handleDelete() {
    const message = entry.favorite
      ? `「${entry.title}」を削除しますか? お気に入りも削除されます。`
      : `「${entry.title}」を削除しますか?`;

    if (window.confirm(message)) {
      onDelete(entry.id);
    }
  }

  return (
    <article
      className={`relative border bg-[#fffaf0] p-5 transition hover:-translate-y-0.5 hover:shadow-[8px_8px_0_#ded4c1] ${
        entry.favorite ? "border-[#171717]" : "border-[#d8cfbd]"
      }`}
    >
      {entry.favorite ? <div className="absolute inset-y-0 left-0 w-1.5 bg-[#171717]" /> : null}

      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 pl-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="border border-[#171717] bg-[#171717] px-2 py-1 text-xs font-semibold text-[#fffaf0]">
              {entry.mode === "long" ? "5分版" : "1分版"}
            </span>
            <span className="border border-[#d8cfbd] bg-[#f6f4ef] px-2 py-1 text-xs font-semibold text-[#5a5147]">
              {formatDuration(entry.durationSec)}
            </span>
            <span className="border border-[#d8cfbd] bg-[#f6f4ef] px-2 py-1 text-xs font-semibold text-[#5a5147]">
              {entry.storyCount}件
            </span>
          </div>

          <h2 className="break-words text-xl font-semibold leading-8 text-[#171717]">
            {entry.title}
          </h2>
          <p className="mt-2 text-sm text-[#6f665b]">{formatDate(entry.generatedAt)}</p>
          <p className="mt-2 break-all font-mono text-xs text-[#8a8175]">{entry.id}</p>
        </div>

        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            aria-label={entry.favorite ? "お気に入りから外す" : "お気に入りに追加"}
            onClick={() => onToggleFavorite(entry.id, !entry.favorite)}
            className="grid size-11 place-items-center border border-[#171717] bg-[#fffaf0] text-xl font-bold text-[#171717] transition hover:bg-[#171717] hover:text-[#fffaf0]"
          >
            {entry.favorite ? "★" : "☆"}
          </button>
          <button
            type="button"
            aria-label="削除"
            onClick={handleDelete}
            className="grid size-11 place-items-center border border-[#c96f62] bg-[#fff0ed] text-lg font-bold text-[#8d2e24] transition hover:bg-[#8d2e24] hover:text-[#fff0ed]"
          >
            ×
          </button>
        </div>
      </div>
    </article>
  );
}

function formatDuration(value: number): string {
  const rounded = Math.round(value);
  if (rounded < 60) {
    return `${rounded}秒`;
  }

  const minutes = Math.floor(rounded / 60);
  const seconds = rounded % 60;
  return seconds === 0 ? `${minutes}分` : `${minutes}分${seconds}秒`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
