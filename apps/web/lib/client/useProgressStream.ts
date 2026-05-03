"use client";

import type { ProgressEvent } from "@techmato/pipeline/broadcast/progressEvents";
import { useEffect, useState } from "react";

export type ProgressStreamState = {
  events: ProgressEvent[];
  status: "idle" | "connecting" | "streaming" | "done" | "error" | "closed";
  error?: string;
};

const IDLE_STATE: ProgressStreamState = {
  events: [],
  status: "idle",
};

export function useProgressStream(broadcastId: string | null): ProgressStreamState {
  const [state, setState] = useState<ProgressStreamState>(IDLE_STATE);

  useEffect(() => {
    if (!broadcastId) {
      setState(IDLE_STATE);
      return;
    }

    setState({ events: [], status: "connecting" });

    const source = new EventSource(`/api/broadcast/${encodeURIComponent(broadcastId)}/events`);
    let terminal = false;

    source.onopen = () => {
      setState((current) => ({ ...current, status: "streaming" }));
    };

    source.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data) as ProgressEvent;
        setState((current) => ({
          events: [...current.events, event],
          status: event.type === "done" ? "done" : event.type === "error" ? "error" : "streaming",
          ...(event.type === "error" ? { error: event.message } : {}),
        }));

        if (event.type === "done" || event.type === "error") {
          terminal = true;
          source.close();
        }
      } catch {
        terminal = true;
        source.close();
        setState((current) => ({
          ...current,
          status: "error",
          error: "進捗イベントを読み取れませんでした",
        }));
      }
    };

    source.onerror = () => {
      if (!terminal) {
        source.close();
        setState((current) => ({
          ...current,
          status: "closed",
          error: "進捗ストリームが切断されました",
        }));
      }
    };

    return () => {
      source.close();
    };
  }, [broadcastId]);

  return state;
}
