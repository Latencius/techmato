"use client";

import { useEffect, useReducer } from "react";
import {
  type BroadcastMetadataResponse,
  fetchBroadcast,
  startBroadcast,
} from "../lib/client/broadcastApi";
import {
  clearLastBroadcastId,
  readLastBroadcastId,
  writeLastBroadcastId,
} from "../lib/client/lastBroadcast";
import { useProgressStream } from "../lib/client/useProgressStream";
import { BroadcastButton } from "./BroadcastButton";
import { BroadcastPlayer } from "./BroadcastPlayer";
import { ProgressIndicator } from "./ProgressIndicator";

type BroadcastMetadata = NonNullable<BroadcastMetadataResponse["metadata"]>;

type GeneratorState = {
  generation: { broadcastId: string | null; outputDir: string | null };
  starting: boolean;
  startError: string | null;
  conflict: { broadcastId?: string } | null;
  lastCompleted: { broadcastId: string; metadata: BroadcastMetadata } | null;
  player: { broadcastId: string; metadata: BroadcastMetadata } | null;
  loadingLast: boolean;
};

type GeneratorAction =
  | { type: "start_requested" }
  | { type: "start_ok"; broadcastId: string; outputDir: string }
  | { type: "start_conflict"; broadcastId?: string }
  | { type: "start_error"; message: string }
  | { type: "connect_running"; broadcastId: string }
  | { type: "last_loading" }
  | { type: "last_loaded"; broadcastId: string; metadata: BroadcastMetadata }
  | { type: "last_missing" }
  | { type: "show_player"; broadcastId: string; metadata: BroadcastMetadata }
  | { type: "reset" };

const INITIAL_STATE: GeneratorState = {
  generation: { broadcastId: null, outputDir: null },
  starting: false,
  startError: null,
  conflict: null,
  lastCompleted: null,
  player: null,
  loadingLast: false,
};

export function BroadcastGenerator() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const progress = useProgressStream(state.generation.broadcastId);
  const busy =
    state.starting || progress.status === "connecting" || progress.status === "streaming";
  const canRegenerate =
    progress.status === "done" ||
    progress.status === "error" ||
    progress.status === "closed" ||
    (!!state.startError && !state.starting) ||
    !!state.player;

  useEffect(() => {
    const lastBroadcastId = readLastBroadcastId();
    if (!lastBroadcastId) {
      return;
    }

    let cancelled = false;
    dispatch({ type: "last_loading" });

    fetchBroadcast(lastBroadcastId).then((result) => {
      if (cancelled) {
        return;
      }

      if (result.ok && result.data.status === "completed" && result.data.metadata) {
        dispatch({
          type: "last_loaded",
          broadcastId: result.data.broadcastId,
          metadata: result.data.metadata,
        });
        return;
      }

      clearLastBroadcastId();
      dispatch({ type: "last_missing" });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const done = latestDone(progress.events);
    if (!done || state.player?.broadcastId === done.broadcastId) {
      return;
    }

    let cancelled = false;

    fetchCompletedBroadcast(done.broadcastId).then((metadata) => {
      if (cancelled) {
        return;
      }

      if (metadata) {
        writeLastBroadcastId(done.broadcastId);
        dispatch({
          type: "show_player",
          broadcastId: done.broadcastId,
          metadata,
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [progress.events, state.player?.broadcastId]);

  async function handleStart() {
    dispatch({ type: "start_requested" });

    const result = await startBroadcast();

    if (result.ok) {
      dispatch({
        type: "start_ok",
        broadcastId: result.broadcastId,
        outputDir: result.outputDir,
      });
      return;
    }

    if (result.reason === "conflict") {
      dispatch({
        type: "start_conflict",
        ...(result.runningBroadcastId ? { broadcastId: result.runningBroadcastId } : {}),
      });
      return;
    }

    dispatch({ type: "start_error", message: result.message });
  }

  function connectToRunningJob() {
    if (state.conflict?.broadcastId) {
      dispatch({ type: "connect_running", broadcastId: state.conflict.broadcastId });
    }
  }

  function showLastBroadcast() {
    if (state.lastCompleted) {
      dispatch({
        type: "show_player",
        broadcastId: state.lastCompleted.broadcastId,
        metadata: state.lastCompleted.metadata,
      });
    }
  }

  return (
    <div className="mt-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <BroadcastButton busy={busy} onClick={handleStart} />
        {state.lastCompleted && !state.player ? (
          <button
            type="button"
            onClick={showLastBroadcast}
            className="min-h-14 border border-[#171717] bg-[#fffaf0] px-5 py-3 text-sm font-semibold text-[#171717] shadow-[4px_4px_0_#ded4c1] transition hover:-translate-y-0.5"
          >
            最後の放送を再生
          </button>
        ) : null}
        {canRegenerate ? (
          <button
            type="button"
            onClick={() => dispatch({ type: "reset" })}
            className="min-h-14 border border-[#d8cfbd] bg-[#fffaf0] px-5 py-3 text-sm font-semibold text-[#171717] transition hover:border-[#171717]"
          >
            もう一度生成
          </button>
        ) : null}
      </div>

      {state.loadingLast ? (
        <p className="mt-4 text-sm text-[#6f665b]">前回の放送を確認しています</p>
      ) : null}

      {state.generation.broadcastId ? (
        <div className="mt-5 border-l-2 border-[#171717] pl-4 text-sm text-[#5a5147]">
          <p className="break-all">broadcastId: {state.generation.broadcastId}</p>
          {state.generation.outputDir ? (
            <p className="mt-1 break-all">outputDir: {state.generation.outputDir}</p>
          ) : null}
        </div>
      ) : null}

      {state.startError ? (
        <div className="mt-6 max-w-3xl border border-[#c96f62] bg-[#fff0ed] px-4 py-3 text-[#8d2e24]">
          <p className="font-semibold">{state.startError}</p>
        </div>
      ) : null}

      {state.conflict ? (
        <div className="mt-6 max-w-3xl border border-[#d8b35d] bg-[#fff7dc] px-4 py-4 text-[#6d5720]">
          <p className="font-semibold">他のジョブが実行中です</p>
          {state.conflict.broadcastId ? (
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
              <p className="break-all text-sm">broadcastId: {state.conflict.broadcastId}</p>
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

      {state.generation.broadcastId ? <ProgressIndicator state={progress} /> : null}

      {state.player ? (
        <BroadcastPlayer
          broadcastId={state.player.broadcastId}
          metadata={state.player.metadata}
          onRegenerate={() => dispatch({ type: "reset" })}
        />
      ) : null}
    </div>
  );
}

function reducer(state: GeneratorState, action: GeneratorAction): GeneratorState {
  switch (action.type) {
    case "start_requested":
      return {
        ...state,
        generation: { broadcastId: null, outputDir: null },
        starting: true,
        startError: null,
        conflict: null,
        player: null,
      };
    case "start_ok":
      return {
        ...state,
        generation: { broadcastId: action.broadcastId, outputDir: action.outputDir },
        starting: false,
      };
    case "start_conflict":
      return {
        ...state,
        starting: false,
        conflict: action.broadcastId ? { broadcastId: action.broadcastId } : {},
      };
    case "start_error":
      return { ...state, starting: false, startError: action.message };
    case "connect_running":
      return {
        ...state,
        generation: { broadcastId: action.broadcastId, outputDir: null },
        conflict: null,
        startError: null,
        player: null,
      };
    case "last_loading":
      return { ...state, loadingLast: true };
    case "last_loaded":
      return {
        ...state,
        loadingLast: false,
        lastCompleted: { broadcastId: action.broadcastId, metadata: action.metadata },
      };
    case "last_missing":
      return { ...state, loadingLast: false, lastCompleted: null };
    case "show_player":
      return {
        ...state,
        player: { broadcastId: action.broadcastId, metadata: action.metadata },
        lastCompleted: { broadcastId: action.broadcastId, metadata: action.metadata },
      };
    case "reset":
      return {
        ...INITIAL_STATE,
        lastCompleted: state.lastCompleted,
      };
  }
}

function latestDone(events: ReturnType<typeof useProgressStream>["events"]) {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event?.type === "done") {
      return event;
    }
  }

  return null;
}

async function fetchCompletedBroadcast(
  broadcastId: string,
  attempts = 6,
): Promise<BroadcastMetadata | null> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const result = await fetchBroadcast(broadcastId);
    if (result.ok && result.data.status === "completed" && result.data.metadata) {
      return result.data.metadata;
    }

    if (!result.ok || result.data.status === "failed") {
      return null;
    }

    await delay(400);
  }

  return null;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
