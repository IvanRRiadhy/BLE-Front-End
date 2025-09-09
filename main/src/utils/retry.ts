// Simple delay
const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

type RetryOpts = {
  // keep retrying until succeed, but let’s be safe:
  timeoutMs?: number;        // cap total time spent retrying
  minDelay?: number;         // base delay for backoff
  maxDelay?: number;         // cap delay between tries
  signal?: AbortSignal;      // allow cancellation
  isRetryableError?: (err: any) => boolean;
};

const defaultIsRetryable = (err: any) => {
  // Network or no response at all
  if (!err?.response) return true;

  const status = err.response.status;
  // Retry on 5xx, 429 (rate limit), 408 (timeout)
  if (status >= 500 || status === 429 || status === 408) return true;

  // Don’t retry on typical 4xx (validation, auth, not found)
  return false;
};

export async function retryUntilSuccess<T>(
  task: () => Promise<T>,
  {
    timeoutMs = 2 * 60 * 1000, // 2 minutes safety cap
    minDelay = 500,
    maxDelay = 8000,
    signal,
    isRetryableError = defaultIsRetryable,
  }: RetryOpts = {}
): Promise<T> {
  const start = Date.now();
  let attempt = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    try {
      return await task();
    } catch (err: any) {
      if (!isRetryableError(err)) {
        // Non-retryable -> fail immediately
        throw err;
      }

      // Check global timeout
      const elapsed = Date.now() - start;
      if (elapsed >= timeoutMs) {
        // Attach original error for debugging
        const e = new Error(`Retry timeout after ${elapsed}ms`);
        (e as any).cause = err;
        throw e;
      }

      // Exponential backoff with jitter
      const backoff = Math.min(maxDelay, minDelay * 2 ** attempt);
      const jitter = Math.floor(Math.random() * Math.floor(minDelay / 2));
      const wait = backoff + jitter;

      attempt += 1;
      await sleep(wait);
      continue;
    }
  }
}

export const ensureMinLatency = async (started: number, minMs = 500) => {
  const elapsed = Date.now() - started;
  if (elapsed < minMs) await sleep(minMs - elapsed);
};
