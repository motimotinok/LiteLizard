import crypto from 'node:crypto';
import type { Database } from 'better-sqlite3';

export function requestEmailLink(db: Database, email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const requestId = `req_${crypto.randomUUID()}`;
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  db.prepare(
    `INSERT INTO email_link_codes (request_id, email, code, expires_at) VALUES (?, ?, ?, ?)`
  ).run(requestId, normalizedEmail, code, expiresAt);

  return { requestId, devCode: code, expiresAt };
}

export function verifyEmailLink(db: Database, email: string, requestId: string, code: string) {
  const normalizedEmail = email.trim().toLowerCase();

  const row = db
    .prepare(
      `SELECT request_id, email, code, expires_at, used_at
       FROM email_link_codes
       WHERE request_id = ?`
    )
    .get(requestId) as
    | {
        request_id: string;
        email: string;
        code: string;
        expires_at: string;
        used_at: string | null;
      }
    | undefined;

  if (!row || row.email !== normalizedEmail || row.code !== code || row.used_at) {
    throw new Error('Invalid verification code');
  }

  if (new Date(row.expires_at).getTime() < Date.now()) {
    throw new Error('Verification code expired');
  }

  db.prepare(`UPDATE email_link_codes SET used_at = ? WHERE request_id = ?`).run(
    new Date().toISOString(),
    requestId
  );

  const existing = db.prepare(`SELECT id, email FROM users WHERE email = ?`).get(normalizedEmail) as
    | { id: string; email: string }
    | undefined;

  if (existing) {
    return existing;
  }

  const id = `usr_${crypto.randomUUID()}`;
  db.prepare(`INSERT INTO users (id, email, created_at, status) VALUES (?, ?, ?, ?)`).run(
    id,
    normalizedEmail,
    new Date().toISOString(),
    'active'
  );

  return { id, email: normalizedEmail };
}
