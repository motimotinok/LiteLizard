import path from 'node:path';
import os from 'node:os';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { buildApp } from './app.js';
import { resetRateLimitState } from './services/rateLimit.js';

async function createSession(app: ReturnType<typeof buildApp>) {
  const email = 'test@example.com';
  const requestResult = await app.inject({
    method: 'POST',
    url: '/v1/auth/email-link/request',
    payload: { email },
  });
  const requested = requestResult.json() as { requestId: string; devCode: string };

  const verifyResult = await app.inject({
    method: 'POST',
    url: '/v1/auth/email-link/verify',
    payload: { email, code: requested.devCode, requestId: requested.requestId },
  });

  return verifyResult.json() as { accessToken: string };
}

describe('API integration', () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    resetRateLimitState();
    const dbPath = path.join(
      os.tmpdir(),
      `litelizard-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.sqlite3`,
    );
    process.env.LITELIZARD_DB_PATH = dbPath;
    app = buildApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns 401 for analysis without token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/analysis/paragraphs',
      payload: {
        documentId: 'doc_xxxxxx',
        promptVersion: 'v1.0.0',
        personaMode: 'general-reader',
        paragraphs: [{ paragraphId: 'p_xxxxxx', text: 'hello' }],
      },
    });

    expect(res.statusCode).toBe(401);
  });

  it('returns 429 when over per-minute rate limit', async () => {
    const { accessToken } = await createSession(app);

    for (let i = 0; i < 10; i += 1) {
      const ok = await app.inject({
        method: 'POST',
        url: '/v1/analysis/paragraphs',
        headers: { Authorization: `Bearer ${accessToken}` },
        payload: {
          documentId: 'doc_xxxxxx',
          promptVersion: 'v1.0.0',
          personaMode: 'general-reader',
          paragraphs: [{ paragraphId: `p_xxxxxx${i}`, text: 'hello' }],
        },
      });
      expect(ok.statusCode).toBe(200);
    }

    const blocked = await app.inject({
      method: 'POST',
      url: '/v1/analysis/paragraphs',
      headers: { Authorization: `Bearer ${accessToken}` },
      payload: {
        documentId: 'doc_xxxxxx',
        promptVersion: 'v1.0.0',
        personaMode: 'general-reader',
        paragraphs: [{ paragraphId: 'p_over', text: 'hello' }],
      },
    });

    expect(blocked.statusCode).toBe(429);
  });

  it('returns all-or-nothing failure and no partial apply on forced error', async () => {
    const { accessToken } = await createSession(app);

    const response = await app.inject({
      method: 'POST',
      url: '/v1/analysis/paragraphs',
      headers: { Authorization: `Bearer ${accessToken}` },
      payload: {
        documentId: 'doc_xxxxxx',
        promptVersion: 'v1.0.0',
        personaMode: 'general-reader',
        paragraphs: [
          { paragraphId: 'p_ok', text: 'hello' },
          { paragraphId: 'p_fail', text: '[[FAIL]]' },
        ],
      },
    });

    expect(response.statusCode).toBe(500);
    const body = response.json() as { error: { code: string } };
    expect(body.error.code).toBe('ANALYSIS_ABORTED');
  });

  it('updates usage after successful request', async () => {
    const { accessToken } = await createSession(app);

    await app.inject({
      method: 'POST',
      url: '/v1/analysis/paragraphs',
      headers: { Authorization: `Bearer ${accessToken}` },
      payload: {
        documentId: 'doc_xxxxxx',
        promptVersion: 'v1.0.0',
        personaMode: 'general-reader',
        paragraphs: [{ paragraphId: 'p_01abcd', text: 'hello world' }],
      },
    });

    const usageResponse = await app.inject({
      method: 'GET',
      url: '/v1/me/usage',
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    expect(usageResponse.statusCode).toBe(200);
    const usage = usageResponse.json() as { today: { requestCount: number } };
    expect(usage.today.requestCount).toBeGreaterThan(0);
  });
});
