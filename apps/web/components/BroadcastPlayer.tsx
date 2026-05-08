"use client";

import type { SegmentsJson, StoriesJson } from "@techmato/pipeline/broadcast/render";
import { useEffect, useMemo, useRef, useState } from "react";
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
  const [activeCueText, setActiveCueText] = useState("");
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
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

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    const maybeTrack = audio.textTracks[0];
    if (!maybeTrack) {
      return;
    }

    const track = maybeTrack;
    track.mode = "hidden";

    function handleCueChange() {
      const activeCues = track.activeCues;
      if (!activeCues || activeCues.length === 0) {
        setActiveCueText("");
        return;
      }

      setActiveCueText(
        Array.from(activeCues)
          .map((cue) => (cue as VTTCue).text)
          .join("\n"),
      );
    }

    handleCueChange();
    track.addEventListener("cuechange", handleCueChange);

    return () => {
      track.removeEventListener("cuechange", handleCueChange);
    };
  }, []);

  function seekTo(startSec: number) {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    audio.currentTime = startSec;
    void audio.play();
  }

  return (
    <section className="mt-4 w-full border border-[#171717] bg-[#fffaf0] p-4 shadow-[8px_8px_0_#ded4c1] sm:p-5">
      <div className="flex flex-col gap-2 border-b border-[#e7ddca] pb-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#756b5e]">Player</p>
          <h2 className="mt-1 text-xl font-semibold text-[#171717] sm:text-2xl">今日の放送</h2>
          <p className="mt-1 break-all font-mono text-xs text-[#6f665b]">{broadcastId}</p>
        </div>
        <p className="shrink-0 text-sm font-semibold text-[#5a5147]">
          {formatSeconds(currentTime)} / {formatSeconds(metadata.segments.durationSec)}
        </p>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(260px,0.82fr)_minmax(300px,1.18fr)] xl:items-start">
        <div className="min-w-0">
          {/* biome-ignore lint/a11y/useMediaCaption: WebVTT subtitles are read from the default track and rendered inline below the audio controls. */}
          <audio
            ref={audioRef}
            controls
            preload="auto"
            className="w-full"
            onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
          >
            <source src={audioUrl} type="audio/wav" />
            <track default kind="subtitles" src={captionsUrl} srcLang="ja" label="日本語" />
          </audio>

          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs leading-5 text-[#6f665b]">
              {isPlaying ? "再生中の字幕を表示しています。" : "再生すると字幕がここに出ます。"}
            </p>
            <button
              type="button"
              onClick={() => setCaptionsEnabled((value) => !value)}
              className="shrink-0 border border-[#171717] bg-[#fffaf0] px-3 py-1 text-xs font-semibold text-[#171717] transition hover:bg-[#171717] hover:text-[#fffaf0]"
              aria-pressed={captionsEnabled}
            >
              字幕 {captionsEnabled ? "ON" : "OFF"}
            </button>
          </div>

          {captionsEnabled && activeCueText ? (
            <div
              aria-live="polite"
              className="mt-2 max-h-28 min-h-16 overflow-y-auto whitespace-pre-line border border-[#171717] bg-[#fffdf8] px-4 py-3 text-base leading-7 text-[#171717] shadow-[5px_5px_0_#ded4c1]"
            >
              {activeCueText}
            </div>
          ) : (
            <div className="mt-2 min-h-16 border border-dashed border-[#d8cfbd] bg-[#fffdf8] px-4 py-3 text-sm leading-6 text-[#756b5e]">
              字幕は再生中の文に合わせて表示されます。
            </div>
          )}

          {onRegenerate ? (
            <button
              type="button"
              onClick={onRegenerate}
              className="mt-3 min-h-11 border border-[#171717] bg-[#171717] px-5 py-2 text-sm font-semibold text-[#f8f4ea] transition hover:-translate-y-0.5"
            >
              もう一度生成
            </button>
          ) : null}
        </div>

        <div className="min-w-0">
          <div className="mb-2 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#756b5e]">
                Stories
              </p>
              <h3 className="text-lg font-semibold text-[#171717]">本日の記事</h3>
            </div>
            <p className="shrink-0 text-xs text-[#6f665b]">{pairs.length}件</p>
          </div>

          <div className="space-y-2 xl:max-h-[calc(100vh-21rem)] xl:overflow-y-auto xl:pr-2">
            {pairs.map(({ story, segment }, index) => {
              const active = currentSegmentIndex === index;

              return (
                <article
                  key={segment.url}
                  className={`border px-3 py-3 transition ${
                    active
                      ? "border-[#171717] bg-[#f8efd9] shadow-[4px_4px_0_#171717]"
                      : "border-[#e4dac8] bg-[#fffdf8] hover:border-[#171717]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      className="min-w-0 flex-1 cursor-pointer text-left"
                      onClick={() => seekTo(segment.startSec)}
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#756b5e]">
                        {formatSeconds(segment.startSec)} - {formatSeconds(segment.endSec)}
                      </p>
                      <h4 className="mt-1 break-words text-base font-semibold leading-6 text-[#171717]">
                        {story?.title ?? segment.title}
                      </h4>
                      <p className="mt-1 text-xs leading-5 text-[#6f665b]">
                        {story?.source ?? segment.source}
                        {story ? ` / ${formatDate(story.publishedAt)}` : ""}
                      </p>
                      {story ? (
                        <p className="mt-2 inline-flex border border-[#d8cfbd] bg-[#f6f4ef] px-2 py-1 text-xs font-semibold text-[#5a5147]">
                          {story.selectionReason}
                        </p>
                      ) : null}
                    </button>

                    <a
                      href={segment.url}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 text-xs font-semibold text-[#171717] underline underline-offset-4"
                      onClick={(event) => event.stopPropagation()}
                    >
                      元記事
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-4 border-t border-[#e7ddca] pt-3">
        <p className="text-xs leading-5 text-[#6f665b]">
          {isPlaying
            ? "再生中の記事を右側でハイライトしています。"
            : "記事を選ぶと、その位置から再生します。"}
        </p>
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
