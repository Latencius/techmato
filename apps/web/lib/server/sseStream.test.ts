import type { ProgressEvent } from "@techmato/pipeline";
import { describe, expect, it, vi } from "vitest";
import { createSseStream } from "./sseStream.js";

const started: ProgressEvent = {
  type: "step_start",
  step: "fetch",
  stepIndex: 1,
  totalSteps: 7,
};

describe("createSseStream", () => {
  it("writes past events in SSE data format on first read", async () => {
    const stream = createSseStream(() => () => {}, [started]);

    const chunk = await readFirstChunk(stream);

    expect(chunk).toBe(
      'data: {"type":"step_start","step":"fetch","stepIndex":1,"totalSteps":7}\n\n',
    );
  });

  it("writes subscribed events and closes after done", async () => {
    let writeEvent: ((event: ProgressEvent) => void) | undefined;
    const unsubscribe = vi.fn();
    const stream = createSseStream((write) => {
      writeEvent = write;
      return unsubscribe;
    }, []);
    const reader = stream.getReader();

    writeEvent?.({
      type: "done",
      broadcastId: "broadcast-1",
      outputDir: "/tmp/out",
      durationSec: 1,
    });

    const first = await reader.read();
    const second = await reader.read();

    expect(decode(first.value)).toBe(
      'data: {"type":"done","broadcastId":"broadcast-1","outputDir":"/tmp/out","durationSec":1}\n\n',
    );
    expect(second.done).toBe(true);
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it("unsubscribes when the stream is cancelled", async () => {
    const unsubscribe = vi.fn();
    const stream = createSseStream(() => unsubscribe, []);
    const reader = stream.getReader();

    await reader.cancel();

    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});

async function readFirstChunk(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const chunk = await reader.read();

  return decode(chunk.value);
}

function decode(value: Uint8Array | undefined): string {
  return new TextDecoder().decode(value);
}
