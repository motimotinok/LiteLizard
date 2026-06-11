import type { UpdateCheckResult } from '@litelizard/shared';

export const RELEASE_TAG = 'mvp-latest';
export const RELEASE_REPO = 'motimotinok/LiteLizard';
export const RELEASE_ASSET_FILENAME = 'LiteLizard-latest-arm64.dmg';
export const RELEASES_PAGE_URL = `https://github.com/${RELEASE_REPO}/releases/tag/${RELEASE_TAG}`;
export const RELEASE_DOWNLOAD_URL = `https://github.com/${RELEASE_REPO}/releases/download/${RELEASE_TAG}/${RELEASE_ASSET_FILENAME}`;
const RELEASE_API_URL = `https://api.github.com/repos/${RELEASE_REPO}/releases/tags/${RELEASE_TAG}`;

const VERSION_PATTERN = /v?(\d+)\.(\d+)\.(\d+)(?:[-+][\w.-]+)?/;

interface GitHubReleaseResponse {
  tag_name?: string;
  name?: string;
  body?: string;
  html_url?: string;
  assets?: Array<{ name?: string }>;
}

function extractVersion(text: string | undefined | null): string | null {
  if (!text) return null;
  const match = text.match(VERSION_PATTERN);
  if (!match) return null;
  return `${match[1]}.${match[2]}.${match[3]}`;
}

function parseSemver(version: string): [number, number, number] | null {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

export function isNewerVersion(latest: string, current: string): boolean {
  const a = parseSemver(latest);
  const b = parseSemver(current);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i += 1) {
    if (a[i] > b[i]) return true;
    if (a[i] < b[i]) return false;
  }
  return false;
}

export function pickLatestVersion(payload: GitHubReleaseResponse): string | null {
  const fromAsset = payload.assets?.map((entry) => extractVersion(entry.name)).find(Boolean) ?? null;
  if (fromAsset) return fromAsset;
  return extractVersion(payload.tag_name) ?? extractVersion(payload.name) ?? extractVersion(payload.body) ?? null;
}

export async function fetchLatestRelease(
  currentVersion: string,
  options: { signal?: AbortSignal; fetchImpl?: typeof fetch } = {},
): Promise<UpdateCheckResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseResult: UpdateCheckResult = {
    currentVersion,
    latestVersion: null,
    releaseUrl: RELEASES_PAGE_URL,
    updateAvailable: false,
    checkedAt: new Date().toISOString(),
  };

  try {
    const response = await fetchImpl(RELEASE_API_URL, {
      method: 'GET',
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': `LiteLizard/${currentVersion}`,
      },
      signal: options.signal,
    });

    if (!response.ok) {
      return { ...baseResult, error: `GitHub API responded with ${response.status}` };
    }

    const payload = (await response.json()) as GitHubReleaseResponse;
    const latestVersion = pickLatestVersion(payload);
    const releaseUrl = typeof payload.html_url === 'string' ? payload.html_url : RELEASES_PAGE_URL;
    const updateAvailable = latestVersion ? isNewerVersion(latestVersion, currentVersion) : false;
    return {
      ...baseResult,
      latestVersion,
      releaseUrl,
      updateAvailable,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { ...baseResult, error: message };
  }
}
