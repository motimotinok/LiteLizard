import React from 'react';
import type { RecentProjectEntry } from '@litelizard/shared';
import { CenteredHeader } from './ui/CenteredHeader.js';
import { IconFolder } from './ui/icons.js';
import { LeftIconRail } from './LeftIconRail.js';
import { toKanjiIndex } from './ui/kanji.js';

interface Props {
  onSelectFolder: () => void;
  recentProjects: RecentProjectEntry[];
  onOpenRecent: (folderPath: string) => void;
  onRemoveRecent: (folderPath: string) => void;
}

function basenameFromPath(folderPath: string): string {
  const normalized = folderPath.replace(/\\/g, '/').replace(/\/+$/, '');
  const segments = normalized.split('/');
  return segments[segments.length - 1] || folderPath;
}

function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const time = new Date(iso).getTime();
  if (!Number.isFinite(time)) return '';
  const diffMs = now.getTime() - time;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'たった今';
  if (minutes < 60) return `${minutes}分前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}日前`;
  return new Date(iso).toLocaleDateString();
}

export function ProjectSetupScreen({
  onSelectFolder,
  recentProjects,
  onOpenRecent,
  onRemoveRecent,
}: Props) {
  return (
    <div className="workspace-root has-no-sidebar">
      <LeftIconRail
        activePanel="editor"
        onSelectPanel={() => {
          // フォルダ未選択時はパネル切替不可
        }}
      />
      <main className="aux-main">
        <div className="workspace-titlebar" aria-hidden>
          <span className="workspace-titlebar-spacer" />
          <span className="workspace-titlebar-center" />
          <span className="workspace-titlebar-actions" />
        </div>
        <div className="welcome-screen">
          <div className="welcome-content">
            <CenteredHeader
              overline="LiteLizard"
              title="静かに、段落の手応えを"
              subtitle={
                <>
                  段落ごとに、想定する読者がどう感じるかを
                  <br />
                  書き手が見られるエディタです。
                </>
              }
            />
            <div className="welcome-actions">
              <button type="button" className="button-primary" onClick={onSelectFolder}>
                <IconFolder size={13} />
                フォルダを開く
              </button>
            </div>
            <p className="welcome-empty-message">
              既存の作業フォルダを選ぶか、フォルダ選択画面で新しい作業フォルダを作成できます。
            </p>
            {recentProjects.length > 0 ? (
              <div className="welcome-recent">
                <div className="welcome-recent-label">最近のフォルダ</div>
                {recentProjects.map((entry, index) => {
                  const exists = entry.exists !== false;
                  return (
                    <button
                      key={entry.path}
                      type="button"
                      className="welcome-recent-item"
                      onClick={() => {
                        if (exists) {
                          onOpenRecent(entry.path);
                        } else {
                          onRemoveRecent(entry.path);
                        }
                      }}
                      title={exists ? entry.path : `${entry.path}（フォルダが見つかりません。クリックでリストから除外）`}
                      style={exists ? undefined : { opacity: 0.55 }}
                    >
                      <span className="welcome-recent-item-left">
                        <span className="welcome-recent-kanji">{toKanjiIndex(index + 1)}</span>
                        <span className="welcome-recent-name">{basenameFromPath(entry.path)}</span>
                        <span className="welcome-recent-path">{entry.path}</span>
                      </span>
                      <span className="welcome-recent-time">
                        {exists ? formatRelativeTime(entry.lastOpenedAt) : 'なし'}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="welcome-empty-message">
                作業フォルダを選ぶと、`.litelizard/` を自動作成し
                <br />
                分析結果や設定をそこに保存します。
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
