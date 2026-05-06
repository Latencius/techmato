"use client";

import type { HistoryEntry } from "@techmato/pipeline";
import type { SegmentsJson, StoriesJson } from "@techmato/pipeline/broadcast/render";
import Link from "next/link";
import { BroadcastPlayer } from "./BroadcastPlayer";

type Props = {
  entry: HistoryEntry;
  metadata: { segments: SegmentsJson; stories: StoriesJson };
};

export function ArchiveBroadcastView({ entry, metadata }: Props) {
  return (
    <main className="min-h-screen bg-[#f6f4ef] px-6 py-8 text-[#171717]">
      <section className="mx-auto max-w-6xl">
        <header className="border-b border-[#ddd3c1] pb-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#6f6a5f]">
                techmato archive
              </p>
              <h1 className="mt-5 max-w-4xl break-words text-4xl font-semibold leading-tight md:text-6xl">
                {entry.title}
              </h1>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <span className="border border-[#171717] bg-[#171717] px-2 py-1 text-xs font-semibold text-[#fffaf0]">
                  {entry.mode === "long" ? "5分版" : "1分版"}
                </span>
                <span className="border border-[#d8cfbd] bg-[#fffaf0] px-2 py-1 text-xs font-semibold text-[#5a5147]">
                  {formatDuration(entry.durationSec)}
                </span>
                <span className="border border-[#d8cfbd] bg-[#fffaf0] px-2 py-1 text-xs font-semibold text-[#5a5147]">
                  {entry.storyCount}件
                </span>
                <span className="border border-[#d8cfbd] bg-[#fffaf0] px-2 py-1 text-xs font-semibold text-[#5a5147]">
                  {formatDate(entry.generatedAt)}
                </span>
              </div>
              <p className="mt-3 break-all font-mono text-xs text-[#8a8175]">{entry.id}</p>
            </div>

            <nav className="flex shrink-0 flex-wrap gap-3">
              <Link
                href="/archive"
                className="min-h-12 border border-[#171717] bg-[#fffaf0] px-5 py-3 text-sm font-semibold text-[#171717] shadow-[5px_5px_0_#ded4c1] transition hover:-translate-y-0.5"
              >
                一覧に戻る
              </Link>
              <Link
                href="/"
                className="min-h-12 border border-[#d8cfbd] bg-[#fffaf0] px-5 py-3 text-sm font-semibold text-[#171717] transition hover:border-[#171717]"
              >
                ホームに戻る
              </Link>
            </nav>
          </div>
        </header>

        <BroadcastPlayer broadcastId={entry.id} metadata={metadata} />
      </section>
    </main>
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
