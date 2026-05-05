export type Lock = <T>(fn: () => Promise<T>) => Promise<T>;

export function createLock(): Lock {
  let chain: Promise<unknown> = Promise.resolve();

  return <T>(fn: () => Promise<T>): Promise<T> => {
    const next = chain.then(fn, fn);
    chain = next.then(
      () => undefined,
      () => undefined,
    );

    return next;
  };
}
