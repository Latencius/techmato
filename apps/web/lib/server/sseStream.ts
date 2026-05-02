import type { ProgressEvent } from "@techmato/pipeline";

export function createSseStream(
  onSubscribe: (write: (event: ProgressEvent) => void) => () => void,
  pastEvents: ProgressEvent[],
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | undefined;

  return new ReadableStream<Uint8Array>({
    start(controller) {
      const write = (event: ProgressEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));

        if (event.type === "done" || event.type === "error") {
          unsubscribe?.();
          controller.close();
        }
      };

      unsubscribe = onSubscribe(write);
      for (const event of pastEvents) {
        write(event);
      }
    },
    cancel() {
      unsubscribe?.();
    },
  });
}
