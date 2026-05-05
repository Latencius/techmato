import { describe, expect, it } from "vitest";
import { createLock } from "./mutex.js";

describe("createLock", () => {
  it("runs concurrent tasks sequentially in call order", async () => {
    const lock = createLock();
    const started: number[] = [];
    const finished: number[] = [];

    await Promise.all(
      [0, 1, 2, 3, 4].map((value) =>
        lock(async () => {
          started.push(value);
          await delay(2);
          finished.push(value);
          return value;
        }),
      ),
    );

    expect(started).toEqual([0, 1, 2, 3, 4]);
    expect(finished).toEqual([0, 1, 2, 3, 4]);
  });

  it("continues running later tasks after one task rejects", async () => {
    const lock = createLock();
    const order: string[] = [];

    const first = lock(async () => {
      order.push("first");
      throw new Error("boom");
    });
    const second = lock(async () => {
      order.push("second");
      return "ok";
    });

    await expect(first).rejects.toThrow("boom");
    await expect(second).resolves.toBe("ok");
    expect(order).toEqual(["first", "second"]);
  });

  it("resolves with the task return value", async () => {
    const lock = createLock();

    await expect(lock(async () => 42)).resolves.toBe(42);
  });
});

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
