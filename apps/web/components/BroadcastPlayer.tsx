"use client";

import type { SegmentsJson, StoriesJson } from "@techmato/pipeline/broadcast/render";
import { useMemo, useRef, useState } from "react";
import { computeCurrentSegmentIndex, pairStoriesWithSegments } from "../lib/client/segmentTimeline";

type Props = {
  broadcastId: string;
  metadata: { segments: SegmentsJson; stories: StoriesJson };
  onRegenerate?: () => void;
};

export function BroadcastPlayer({ broadcastId, metadata, onRegenerate }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioUrl = `/api/broadcast/${encodeURIComponent(broadcastId)}/audio`;
  const captionsUrl = `/api/broadcast/${encodeURIComponent(broadcastId)}/captions`;
  const pairs = useMemo(
    () => pairStoriesWithSegments(metadata.stories, metadata.segments.segments),
    [metadata],
  );
  const currentSegmentIndex = useMemo(
    () => computeCurrentSegmentIndex(currentTime, metadata.segments.segments),
    [currentTime, metadata.segments.segments],
  );

  function seekTo(startSec: number) {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    audio.currentTime = startSec;
    void audio.play();
  }

  return (
    <section className="mt-8 max-w-3xl border border-[#171717] bg-[#fffaf0] p-5 shadow-[10px_10px_0_#ded4c1] sm:p-6">
      <div className="flex flex-col gap-3 border-b border-[#e7ddca] pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#756b5e]">Player</p>
          <h2 className="mt-1 text-2xl font-semibold text-[#171717]">今日の放送</h2>
          <p className="mt-1 break-all text-sm text-[#6f665b]">{broadcastId}</p>
        </div>
        <p className="text-sm text-[#5a5147]">
          {formatSeconds(currentTime)} / {formatSeconds(metadata.segments.durationSec)}
        </p>
      </div>

      {/* biome-ignore lint/a11y/useMediaCaption: WebVTT subtitles are provided through the default subtitles track requested for this player. */}
      <audio
        ref={audioRef}
        controls
        preload="auto"
        className="mt-5 w-full"
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
      >
        <source src={audioUrl} type="audio/wav" />
        <track default kind="subtitles" src={captionsUrl} srcLang="ja" label="日本語" />
      </audio>

      <div className="mt-6 space-y-3">
        {pairs.map(({ story, segment }, index) => {
          const active = currentSegmentIndex === index;

          return (
            <article
              key={segment.url}
              className={`border px-4 py-4 transition ${
                active
                  ? "border-[#171717] bg-[#f8efd9] shadow-[5px_5px_0_#171717]"
                  : "border-[#e4dac8] bg-[#fffdf8] hover:border-[#171717]"
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <button
                  type="button"
                  className="min-w-0 flex-1 cursor-pointer text-left"
                  onClick={() => seekTo(segment.startSec)}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#756b5e]">
                    {formatSeconds(segment.startSec)} - {formatSeconds(segment.endSec)}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold leading-7 text-[#171717]">
                    {story?.title ?? segment.title}
                  </h3>
                  <p className="mt-2 text-sm text-[#6f665b]">
                    {story?.source ?? segment.source}
                    {story ? ` / ${formatDate(story.publishedAt)}` : ""}
                  </p>
                  {story ? (
                    <p className="mt-3 inline-flex border border-[#d8cfbd] bg-[#f6f4ef] px-2 py-1 text-xs font-semibold text-[#5a5147]">
                      {story.selectionReason}
                    </p>
                  ) : null}
                </button>

                <a
                  href={segment.url}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-sm font-semibold text-[#171717] underline underline-offset-4"
                  onClick={(event) => event.stopPropagation()}
                >
                  元記事
                </a>
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-6 flex flex-col gap-3 border-t border-[#e7ddca] pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[#6f665b]">
          {isPlaying
            ? "再生中のストーリーをハイライトしています。"
            : "ストーリーを選ぶと、その位置から再生します。"}
        </p>
        {onRegenerate ? (
          <button
            type="button"
            onClick={onRegenerate}
            className="min-h-12 border border-[#171717] bg-[#171717] px-5 py-3 text-sm font-semibold text-[#f8f4ea] transition hover:-translate-y-0.5"
          >
            もう一度生成
          </button>
        ) : null}
      </div>
    </section>
  );
}

function formatSeconds(value: number): string {
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${seconds}`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
