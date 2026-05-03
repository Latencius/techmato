import type { ProgressEvent } from "@techmato/pipeline";
import { err, ok, type Result } from "neverthrow";

export type JobStatus = "running" | "completed" | "failed";

export type JobState = {
  broadcastId: string;
  outputDir: string;
  status: JobStatus;
  startedAt: Date;
  completedAt?: Date;
  events: ProgressEvent[];
  subscribers: Set<(event: ProgressEvent) => void>;
  error?: { stage: string; message: string };
};

export type JobStore = {
  getCurrent(): JobState | null;
  get(broadcastId: string): JobState | null;
  create(broadcastId: string, outputDir: string): Result<JobState, "already_running">;
  appendEvent(broadcastId: string, event: ProgressEvent): void;
  subscribe(broadcastId: string, listener: (event: ProgressEvent) => void): () => void;
  complete(broadcastId: string): void;
  fail(broadcastId: string, error: { stage: string; message: string }): void;
};

export function createJobStore(): JobStore {
  const jobs = new Map<string, JobState>();
  let currentJobId: string | null = null;

  return {
    getCurrent() {
      return currentJobId ? (jobs.get(currentJobId) ?? null) : null;
    },
    get(broadcastId) {
      return jobs.get(broadcastId) ?? null;
    },
    create(broadcastId, outputDir) {
      const current = currentJobId ? jobs.get(currentJobId) : null;
      if (current?.status === "running") {
        return err("already_running");
      }

      const job: JobState = {
        broadcastId,
        outputDir,
        status: "running",
        startedAt: new Date(),
        events: [],
        subscribers: new Set(),
      };
      jobs.set(broadcastId, job);
      currentJobId = broadcastId;

      return ok(job);
    },
    appendEvent(broadcastId, event) {
      const job = jobs.get(broadcastId);
      if (!job) {
        return;
      }

      job.events.push(event);
      for (const subscriber of job.subscribers) {
        subscriber(event);
      }
    },
    subscribe(broadcastId, listener) {
      const job = jobs.get(broadcastId);
      if (!job) {
        return () => {};
      }

      job.subscribers.add(listener);

      return () => {
        job.subscribers.delete(listener);
      };
    },
    complete(broadcastId) {
      const job = jobs.get(broadcastId);
      if (!job) {
        return;
      }

      job.status = "completed";
      job.completedAt = new Date();
      job.subscribers.clear();
      if (currentJobId === broadcastId) {
        currentJobId = null;
      }
    },
    fail(broadcastId, error) {
      const job = jobs.get(broadcastId);
      if (!job) {
        return;
      }

      job.status = "failed";
      job.completedAt = new Date();
      job.error = error;
      job.subscribers.clear();
      if (currentJobId === broadcastId) {
        currentJobId = null;
      }
    },
  };
}

declare global {
  var __techmatoJobStore: JobStore | undefined;
}

if (!globalThis.__techmatoJobStore) {
  globalThis.__techmatoJobStore = createJobStore();
}

export const jobStore: JobStore = globalThis.__techmatoJobStore;
