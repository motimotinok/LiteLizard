interface Counter {
  count: number;
  resetAt: number;
}

const minuteWindow = new Map<string, Counter>();
const hourWindow = new Map<string, Counter>();
const concurrentJobs = new Map<string, number>();

const LIMITS = {
  perMinute: 10,
  perHour: 100,
  concurrentJobs: 2,
};

function updateWindow(store: Map<string, Counter>, key: string, limit: number, ttlMs: number) {
  const now = Date.now();
  const current = store.get(key);
  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + ttlMs });
    return true;
  }

  if (current.count >= limit) {
    return false;
  }

  current.count += 1;
  store.set(key, current);
  return true;
}

export function assertRateLimit(userId: string) {
  const minOk = updateWindow(minuteWindow, userId, LIMITS.perMinute, 60_000);
  const hourOk = updateWindow(hourWindow, userId, LIMITS.perHour, 3_600_000);

  if (!minOk || !hourOk) {
    throw new Error('RATE_LIMIT_EXCEEDED');
  }
}

export function startJob(userId: string) {
  const running = concurrentJobs.get(userId) ?? 0;
  if (running >= LIMITS.concurrentJobs) {
    throw new Error('RATE_LIMIT_EXCEEDED');
  }
  concurrentJobs.set(userId, running + 1);
}

export function finishJob(userId: string) {
  const running = concurrentJobs.get(userId) ?? 0;
  concurrentJobs.set(userId, Math.max(0, running - 1));
}

export function resetRateLimitState() {
  minuteWindow.clear();
  hourWindow.clear();
  concurrentJobs.clear();
}
