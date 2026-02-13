import type { AnalysisRunInput, AnalysisRunResult, Session, UsageResponse } from '@litelizard/shared';

const API_BASE_URL = process.env.LITELIZARD_API_BASE_URL ?? 'http://127.0.0.1:8787';

async function request(path: string, init?: RequestInit & { timeoutMs?: number }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), init?.timeoutMs ?? 15_000);
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    signal: controller.signal,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  }).finally(() => {
    clearTimeout(timeout);
  });

  const data = (await response.json()) as unknown;
  if (!response.ok) {
    throw new Error(JSON.stringify(data));
  }

  return data;
}

export async function authRequestEmailLink(email: string): Promise<{ requestId: string; devCode?: string }> {
  return (await request('/v1/auth/email-link/request', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })) as { requestId: string; devCode?: string };
}

export async function authVerifyEmailLink(email: string, code: string, requestId: string): Promise<Session> {
  return (await request('/v1/auth/email-link/verify', {
    method: 'POST',
    body: JSON.stringify({ email, code, requestId }),
  })) as Session;
}

export async function runAnalysis(input: AnalysisRunInput, accessToken: string): Promise<AnalysisRunResult> {
  const execute = () =>
    request('/v1/analysis/paragraphs', {
      method: 'POST',
      timeoutMs: 10_000,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(input),
    }) as Promise<AnalysisRunResult>;

  try {
    return await execute();
  } catch {
    return execute();
  }
}

export async function getUsage(accessToken: string): Promise<UsageResponse> {
  return (await request('/v1/me/usage', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })) as UsageResponse;
}
