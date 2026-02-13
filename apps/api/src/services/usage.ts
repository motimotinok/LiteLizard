import type { Database } from 'better-sqlite3';

export interface UsageDelta {
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
}

function ymd(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function incrementUsage(db: Database, userId: string, delta: UsageDelta) {
  const today = ymd(new Date());

  db.prepare(
    `INSERT INTO api_usage_daily (user_id, ymd, request_count, input_tokens, output_tokens, estimated_cost)
     VALUES (?, ?, 1, ?, ?, ?)
     ON CONFLICT(user_id, ymd)
     DO UPDATE SET
      request_count = request_count + 1,
      input_tokens = input_tokens + excluded.input_tokens,
      output_tokens = output_tokens + excluded.output_tokens,
      estimated_cost = estimated_cost + excluded.estimated_cost`
  ).run(userId, today, delta.inputTokens, delta.outputTokens, delta.estimatedCost);
}

export function getUsage(db: Database, userId: string) {
  const today = new Date();
  const todayYmd = ymd(today);
  const monthPrefix = todayYmd.slice(0, 7);

  const day =
    (db
      .prepare(
        `SELECT request_count, input_tokens, output_tokens, estimated_cost
         FROM api_usage_daily
         WHERE user_id = ? AND ymd = ?`
      )
      .get(userId, todayYmd) as
      | {
          request_count: number;
          input_tokens: number;
          output_tokens: number;
          estimated_cost: number;
        }
      | undefined) ??
    {
      request_count: 0,
      input_tokens: 0,
      output_tokens: 0,
      estimated_cost: 0,
    };

  const month =
    (db
      .prepare(
        `SELECT
          COALESCE(SUM(request_count), 0) as request_count,
          COALESCE(SUM(input_tokens), 0) as input_tokens,
          COALESCE(SUM(output_tokens), 0) as output_tokens,
          COALESCE(SUM(estimated_cost), 0) as estimated_cost
         FROM api_usage_daily
         WHERE user_id = ? AND ymd LIKE ?`
      )
      .get(userId, `${monthPrefix}%`) as {
      request_count: number;
      input_tokens: number;
      output_tokens: number;
      estimated_cost: number;
    }) ??
    {
      request_count: 0,
      input_tokens: 0,
      output_tokens: 0,
      estimated_cost: 0,
    };

  return {
    today: {
      requestCount: day.request_count,
      inputTokens: day.input_tokens,
      outputTokens: day.output_tokens,
      estimatedCost: day.estimated_cost,
    },
    month: {
      requestCount: month.request_count,
      inputTokens: month.input_tokens,
      outputTokens: month.output_tokens,
      estimatedCost: month.estimated_cost,
    },
  };
}

export function getTodayInputTokens(db: Database, userId: string) {
  const today = ymd(new Date());
  const row = db
    .prepare(`SELECT input_tokens FROM api_usage_daily WHERE user_id = ? AND ymd = ?`)
    .get(userId, today) as { input_tokens: number } | undefined;
  return row?.input_tokens ?? 0;
}
