/**
 * Run `fn` over `items` with a bounded number of concurrent executions.
 * Results are returned in the same order as the input. Used to fan out
 * per-recipient worker calls without firing hundreds of requests at once
 * (fast) or blocking sequentially one-by-one (slow).
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  const limit = Math.max(1, Math.min(concurrency, items.length));
  let cursor = 0;

  const workers = Array.from({ length: limit }, async () => {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await fn(items[index], index);
    }
  });

  await Promise.all(workers);
  return results;
}
