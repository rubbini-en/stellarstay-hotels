export async function withRetry(fn, { retries = 3, baseDelayMs = 200, jitterMs = 100, onRetry } = {}) {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt += 1;
      if (attempt > retries) throw err;
      const delay = baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * jitterMs;
      if (onRetry) onRetry(err, attempt, delay);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}
