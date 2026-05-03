"use client";

import type { ProgressEvent, ProgressEventStep } from "@techmato/pipeline/broadcast/progressEvents";
import type { ProgressStreamState } from "../lib/client/useProgressStream";

type Props = {
  state: ProgressStreamState;
};

type StepStatus = "pending" | "active" | "complete" | "error";

const STEPS: { step: ProgressEventStep; label: string; description: string }[] = [
  { step: "fetch", label: "ニュース取得", description: "ニュースソースを巡回しています" },
  { step: "select", label: "記事選定", description: "重要度の高い記事を選んでいます" },
  { step: "extract", label: "本文抽出", description: "選ばれた記事の本文を読みに行っています" },
  { step: "script", label: "台本生成", description: "1分で聞ける日本語台本に整えています" },
  { step: "tts", label: "音声合成", description: "VOICEVOXで読み上げ音声を作っています" },
  { step: "merge", label: "音声結合", description: "音声ファイルを1本にまとめています" },
  { step: "write", label: "保存", description: "放送データを書き出しています" },
];

export function ProgressIndicator({ state }: Props) {
  const activeStep = latestStepStart(state.events);
  const completed = new Set(
    state.events
      .filter((event): event is Extract<ProgressEvent, { type: "step_complete" }> => {
        return event.type === "step_complete";
      })
      .map((event) => event.step),
  );
  const error = latestError(state.events);
  const done = latestDone(state.events);
  const warnings = state.events
    .filter((event): event is Extract<ProgressEvent, { type: "warn" }> => event.type === "warn")
    .slice(-3);
  const cue = latestCue(state.events);

  return (
    <section className="mt-10 max-w-3xl border border-[#d8cfbd] bg-[#fffaf0] p-5 shadow-[0_18px_45px_rgba(45,35,20,0.08)] sm:p-6">
      <div className="mb-5 flex items-end justify-between gap-4 border-b border-[#e7ddca] pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#756b5e]">
            Progress
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-[#171717]">生成状況</h2>
        </div>
        <p className="text-sm text-[#6f665b]">{statusLabel(state.status)}</p>
      </div>

      <ol className="space-y-3">
        {STEPS.map(({ step, label, description }) => {
          const status = stepStatus(step, activeStep, completed, error);
          const isActive = status === "active";

          return (
            <li
              key={step}
              className={`border px-4 py-3 transition ${
                status === "complete"
                  ? "border-[#a4c4a0] bg-[#eff7ec]"
                  : status === "error"
                    ? "border-[#d59288] bg-[#fff1ee]"
                    : isActive
                      ? "border-[#171717] bg-[#f8efd9]"
                      : "border-[#e4dac8] bg-[#fffdf8]"
              }`}
            >
              <div className="flex items-start gap-3">
                <StepMark status={status} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <p className="font-semibold text-[#171717]">{label}</p>
                    <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#7a7166]">
                      {step}
                    </p>
                  </div>
                  {isActive ? (
                    <p className="mt-1 text-sm leading-6 text-[#4f463d]">
                      {step === "tts" && cue
                        ? `${cue.cueIndex + 1} / ${cue.totalCues} cue 完了`
                        : description}
                    </p>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {warnings.length > 0 ? (
        <div className="mt-5 border border-[#ead9ac] bg-[#fff7dc] px-4 py-3 text-sm text-[#6d5720]">
          <p className="font-semibold">一部の取得をスキップしました</p>
          <ul className="mt-2 space-y-1">
            {warnings.map((warning) => (
              <li key={`${warning.stage}-${warning.message}`}>{warning.message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {error ? (
        <div className="mt-5 border border-[#c96f62] bg-[#fff0ed] px-4 py-3 text-[#8d2e24]">
          <p className="font-semibold">
            [{error.stage}] {error.message}
          </p>
        </div>
      ) : null}

      {done ? (
        <div className="mt-5 border border-[#92b58b] bg-[#edf8e9] px-4 py-3 text-[#315c2d]">
          <p className="font-semibold">完成しました</p>
          <p className="mt-1 break-all text-sm">broadcastId: {done.broadcastId}</p>
          <p className="mt-1 break-all text-sm">outputDir: {done.outputDir}</p>
        </div>
      ) : null}
    </section>
  );
}

function StepMark({ status }: { status: StepStatus }) {
  if (status === "active") {
    return (
      <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border border-[#171717]">
        <span className="size-3 animate-spin rounded-full border-2 border-[#171717]/25 border-t-[#171717]" />
      </span>
    );
  }

  const mark = status === "complete" ? "✓" : status === "error" ? "✕" : "";

  return (
    <span
      className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border text-sm font-bold ${
        status === "complete"
          ? "border-[#557c4f] text-[#315c2d]"
          : status === "error"
            ? "border-[#a83b30] text-[#8d2e24]"
            : "border-[#cfc4b3] text-[#a1988b]"
      }`}
    >
      {mark}
    </span>
  );
}

function latestStepStart(events: ProgressEvent[]): ProgressEventStep | null {
  return findLastEvent(events, "step_start")?.step ?? null;
}

function latestCue(
  events: ProgressEvent[],
): Extract<ProgressEvent, { type: "cue_complete" }> | null {
  return findLastEvent(events, "cue_complete");
}

function latestError(events: ProgressEvent[]): Extract<ProgressEvent, { type: "error" }> | null {
  return findLastEvent(events, "error");
}

function latestDone(events: ProgressEvent[]): Extract<ProgressEvent, { type: "done" }> | null {
  return findLastEvent(events, "done");
}

function findLastEvent<TType extends ProgressEvent["type"]>(
  events: ProgressEvent[],
  type: TType,
): Extract<ProgressEvent, { type: TType }> | null {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event?.type === type) {
      return event as Extract<ProgressEvent, { type: TType }>;
    }
  }

  return null;
}

function stepStatus(
  step: ProgressEventStep,
  activeStep: ProgressEventStep | null,
  completed: Set<ProgressEventStep>,
  error: Extract<ProgressEvent, { type: "error" }> | null,
): StepStatus {
  if (error?.stage === step) {
    return "error";
  }
  if (completed.has(step)) {
    return "complete";
  }
  if (activeStep === step && !error) {
    return "active";
  }

  return "pending";
}

function statusLabel(status: ProgressStreamState["status"]): string {
  switch (status) {
    case "idle":
      return "待機中";
    case "connecting":
      return "接続中";
    case "streaming":
      return "生成中";
    case "done":
      return "完了";
    case "error":
      return "エラー";
    case "closed":
      return "切断";
  }
}
