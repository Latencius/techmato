import type { ProgressEvent } from "@techmato/pipeline";
import { describe, expect, it, vi } from "vitest";
import { createJobStore } from "./jobStore.js";

const started: ProgressEvent = {
  type: "step_start",
  step: "fetch",
  stepIndex: 1,
  totalSteps: 7,
};

describe("createJobStore", () => {
  it("creates a job when no job is running", () => {
    const store = createJobStore();

    const result = store.create("broadcast-1", "/tmp/output/broadcast-1");

    expect(result.isOk()).toBe(true);
    expect(store.getCurrent()?.broadcastId).toBe("broadcast-1");
    expect(store.get("broadcast-1")?.outputDir).toBe("/tmp/output/broadcast-1");
  });

  it("rejects a second job while one is running", () => {
    const store = createJobStore();
    store.create("broadcast-1", "/tmp/output/broadcast-1");

    const result = store.create("broadcast-2", "/tmp/output/broadcast-2");

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBe("already_running");
    expect(store.getCurrent()?.broadcastId).toBe("broadcast-1");
  });

  it("notifies every subscriber when events are appended", () => {
    const store = createJobStore();
    store.create("broadcast-1", "/tmp/output/broadcast-1");
    const first = vi.fn();
    const second = vi.fn();
    store.subscribe("broadcast-1", first);
    store.subscribe("broadcast-1", second);

    store.appendEvent("broadcast-1", started);

    expect(first).toHaveBeenCalledWith(started);
    expect(second).toHaveBeenCalledWith(started);
    expect(store.get("broadcast-1")?.events).toEqual([started]);
  });

  it("stops notifying a subscriber after unsubscribe", () => {
    const store = createJobStore();
    store.create("broadcast-1", "/tmp/output/broadcast-1");
    const listener = vi.fn();
    const unsubscribe = store.subscribe("broadcast-1", listener);

    unsubscribe();
    store.appendEvent("broadcast-1", started);

    expect(listener).not.toHaveBeenCalled();
  });

  it("allows a new job after completion and keeps past jobs readable", () => {
    const store = createJobStore();
    store.create("broadcast-1", "/tmp/output/broadcast-1");
    store.complete("broadcast-1");

    const result = store.create("broadcast-2", "/tmp/output/broadcast-2");

    expect(result.isOk()).toBe(true);
    expect(store.get("broadcast-1")?.status).toBe("completed");
    expect(store.get("broadcast-1")?.completedAt).toBeInstanceOf(Date);
    expect(store.getCurrent()?.broadcastId).toBe("broadcast-2");
  });

  it("records failures and clears the running job", () => {
    const store = createJobStore();
    store.create("broadcast-1", "/tmp/output/broadcast-1");

    store.fail("broadcast-1", { stage: "tts", message: "VOICEVOX failed" });

    expect(store.get("broadcast-1")?.status).toBe("failed");
    expect(store.get("broadcast-1")?.error).toEqual({
      stage: "tts",
      message: "VOICEVOX failed",
    });
    expect(store.getCurrent()).toBeNull();
  });
});
