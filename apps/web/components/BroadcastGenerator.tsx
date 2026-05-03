"use client";

import { useState } from "react";
import { startBroadcast } from "../lib/client/broadcastApi";
import { useProgressStream } from "../lib/client/useProgressStream";
import { BroadcastButton } from "./BroadcastButton";
import { ProgressIndicator } from "./ProgressIndicator";

type ConflictState = {
  broadcastId?: string;
};

export function BroadcastGenerator() {
  const [broadcastId, setBroadcastId] = useState<string | null>(null);
  const [outputDir, setOutputDir] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<ConflictState | null>(null);
  const progress = useProgressStream(broadcastId);
  const busy = starting || progress.status === "connecting" || progress.status === "streaming";
  const canRegenerate =
    progress.status === "done" ||
    progress.status === "error" ||
    progress.status === "closed" ||
    (!!startError && !starting);

  async function handleStart() {
    setStarting(true);
    setStartError(null);
    setConflict(null);

    const result = await startBroadcast();
    setStarting(false);

    if (result.ok) {
      setBroadcastId(result.broadcastId);
      setOutputDir(result.outputDir);
      return;
    }

    if (result.reason === "conflict") {
      setConflict(result.runningBroadcastId ? { broadcastId: result.runningBroadcastId } : {});
      return;
    }

    setStartError(result.message);
  }

  function connectToRunningJob() {
    if (conflict?.broadcastId) {
      setBroadcastId(conflict.broadcastId);
      setOutputDir(null);
      setConflict(null);
      setStartError(null);
    }
  }

  function resetForRegenerate() {
    setBroadcastId(null);
    setOutputDir(null);
    setStartError(null);
    setConflict(null);
  }

  return (
    <div className="mt-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <BroadcastButton busy={busy} onClick={handleStart} />
        {canRegenerate ? (
          <button
            type="button"
            onClick={resetForRegenerate}
            className="min-h-14 border border-[#d8cfbd] bg-[#fffaf0] px-5 py-3 text-sm font-semibold text-[#171717] transition hover:border-[#171717]"
          >
            もう一度生成
          </button>
        ) : null}
      </div>

      {broadcastId ? (
        <div className="mt-5 border-l-2 border-[#171717] pl-4 text-sm text-[#5a5147]">
          <p className="break-all">broadcastId: {broadcastId}</p>
          {outputDir ? <p className="mt-1 break-all">outputDir: {outputDir}</p> : null}
        </div>
      ) : null}

      {startError ? (
        <div className="mt-6 max-w-3xl border border-[#c96f62] bg-[#fff0ed] px-4 py-3 text-[#8d2e24]">
          <p className="font-semibold">{startError}</p>
        </div>
      ) : null}

      {conflict ? (
        <div className="mt-6 max-w-3xl border border-[#d8b35d] bg-[#fff7dc] px-4 py-4 text-[#6d5720]">
          <p className="font-semibold">他のジョブが実行中です</p>
          {conflict.broadcastId ? (
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
              <p className="break-all text-sm">broadcastId: {conflict.broadcastId}</p>
              <button
                type="button"
                onClick={connectToRunningJob}
                className="min-h-11 border border-[#6d5720] px-4 py-2 text-sm font-semibold transition hover:bg-[#6d5720] hover:text-[#fff7dc]"
              >
                この進捗に接続
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {broadcastId ? <ProgressIndicator state={progress} /> : null}
    </div>
  );
}
