import { describe, expect, it } from 'vitest';
import {
  fetchLatestRelease,
  isNewerVersion,
  pickLatestVersion,
  RELEASE_ASSET_FILENAME,
  RELEASE_DOWNLOAD_URL,
  RELEASE_TAG,
} from './updateChecker.js';

describe('release constants', () => {
  it('RELEASE_DOWNLOAD_URL points to the mvp-latest tagged asset', () => {
    expect(RELEASE_TAG).toBe('mvp-latest');
    expect(RELEASE_ASSET_FILENAME).toBe('LiteLizard-latest-arm64.dmg');
    expect(RELEASE_DOWNLOAD_URL).toBe(
      'https://github.com/motimotinok/LiteLizard/releases/download/mvp-latest/LiteLizard-latest-arm64.dmg',
    );
  });
});

describe('isNewerVersion', () => {
  it('returns true when patch advances', () => {
    expect(isNewerVersion('0.1.1', '0.1.0')).toBe(true);
  });
  it('returns true when minor advances', () => {
    expect(isNewerVersion('0.2.0', '0.1.9')).toBe(true);
  });
  it('returns false when versions are equal', () => {
    expect(isNewerVersion('0.1.0', '0.1.0')).toBe(false);
  });
  it('returns false when current is newer', () => {
    expect(isNewerVersion('0.1.0', '0.1.1')).toBe(false);
  });
  it('returns false for malformed versions', () => {
    expect(isNewerVersion('not-a-version', '0.1.0')).toBe(false);
  });
});

describe('pickLatestVersion', () => {
  it('extracts version from release body when asset/tag use "latest" naming', () => {
    expect(
      pickLatestVersion({
        tag_name: 'mvp-latest',
        assets: [{ name: 'LiteLizard-latest-arm64.dmg' }],
        body: 'LiteLizard MVP の最新ビルドです (v0.1.0, commit abc1234)。',
      }),
    ).toBe('0.1.0');
  });
  it('prefers asset filename version when present', () => {
    expect(
      pickLatestVersion({
        tag_name: 'mvp-latest',
        assets: [{ name: 'LiteLizard-0.2.3-arm64.dmg' }],
      }),
    ).toBe('0.2.3');
  });
  it('falls back to tag_name if no asset matches', () => {
    expect(pickLatestVersion({ tag_name: 'v1.4.2', assets: [] })).toBe('1.4.2');
  });
  it('falls back to body if tag_name lacks a semver', () => {
    expect(
      pickLatestVersion({
        tag_name: 'mvp-latest',
        body: 'リリース v0.5.1 を公開しました',
      }),
    ).toBe('0.5.1');
  });
  it('returns null when no version can be extracted', () => {
    expect(pickLatestVersion({ tag_name: 'mvp-latest' })).toBe(null);
  });
});

describe('fetchLatestRelease', () => {
  it('returns updateAvailable=true when latest is newer', async () => {
    const fakeFetch = (async () =>
      new Response(
        JSON.stringify({
          tag_name: 'mvp-latest',
          assets: [{ name: 'LiteLizard-latest-arm64.dmg' }],
          body: 'LiteLizard MVP の最新ビルドです (v0.2.0, commit abc1234)。',
          html_url: 'https://example.test/release',
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      )) as unknown as typeof fetch;

    const result = await fetchLatestRelease('0.1.0', { fetchImpl: fakeFetch });
    expect(result.latestVersion).toBe('0.2.0');
    expect(result.updateAvailable).toBe(true);
    expect(result.releaseUrl).toBe('https://example.test/release');
    expect(result.error).toBeUndefined();
  });

  it('returns updateAvailable=false when versions match', async () => {
    const fakeFetch = (async () =>
      new Response(
        JSON.stringify({
          tag_name: 'mvp-latest',
          assets: [{ name: 'LiteLizard-latest-arm64.dmg' }],
          body: 'LiteLizard MVP の最新ビルドです (v0.1.0, commit abc1234)。',
        }),
        { status: 200 },
      )) as unknown as typeof fetch;

    const result = await fetchLatestRelease('0.1.0', { fetchImpl: fakeFetch });
    expect(result.updateAvailable).toBe(false);
    expect(result.latestVersion).toBe('0.1.0');
  });

  it('records error and keeps updateAvailable=false when network fails', async () => {
    const fakeFetch = (async () => {
      throw new Error('boom');
    }) as unknown as typeof fetch;

    const result = await fetchLatestRelease('0.1.0', { fetchImpl: fakeFetch });
    expect(result.updateAvailable).toBe(false);
    expect(result.latestVersion).toBe(null);
    expect(result.error).toBe('boom');
  });

  it('records error when GitHub responds non-2xx', async () => {
    const fakeFetch = (async () => new Response('', { status: 404 })) as unknown as typeof fetch;
    const result = await fetchLatestRelease('0.1.0', { fetchImpl: fakeFetch });
    expect(result.updateAvailable).toBe(false);
    expect(result.error).toContain('404');
  });
});
