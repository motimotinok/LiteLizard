import React from 'react';

const ICON_SIZE = 20;

function DocumentIcon() {
  return (
    <svg viewBox="0 0 24 24" width={ICON_SIZE} height={ICON_SIZE} aria-hidden>
      <path
        d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm6 1.5V9h4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9 13.2h6M9 16.7h6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" width={ICON_SIZE} height={ICON_SIZE} aria-hidden>
      <path
        d="M10.36 3.62a1 1 0 0 1 1.28 0l1.12.9a1 1 0 0 0 .82.2l1.38-.22a1 1 0 0 1 1.1.66l.46 1.32a1 1 0 0 0 .6.6l1.32.46a1 1 0 0 1 .66 1.1l-.22 1.38a1 1 0 0 0 .2.82l.9 1.12a1 1 0 0 1 0 1.28l-.9 1.12a1 1 0 0 0-.2.82l.22 1.38a1 1 0 0 1-.66 1.1l-1.32.46a1 1 0 0 0-.6.6l-.46 1.32a1 1 0 0 1-1.1.66l-1.38-.22a1 1 0 0 0-.82.2l-1.12.9a1 1 0 0 1-1.28 0l-1.12-.9a1 1 0 0 0-.82-.2l-1.38.22a1 1 0 0 1-1.1-.66l-.46-1.32a1 1 0 0 0-.6-.6l-1.32-.46a1 1 0 0 1-.66-1.1l.22-1.38a1 1 0 0 0-.2-.82l-.9-1.12a1 1 0 0 1 0-1.28l.9-1.12a1 1 0 0 0 .2-.82l-.22-1.38a1 1 0 0 1 .66-1.1l1.32-.46a1 1 0 0 0 .6-.6l.46-1.32a1 1 0 0 1 1.1-.66l1.38.22a1 1 0 0 0 .82-.2l1.12-.9Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.8" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

interface LeftIconRailProps {
  onSettingsClick?: () => void;
}

export function LeftIconRail({ onSettingsClick }: LeftIconRailProps) {
  return (
    <aside className="left-icon-rail" aria-label="primary-navigation">
      <button className="rail-icon-button is-active" aria-label="Documents" title="Documents">
        <DocumentIcon />
      </button>
      <button
        className="rail-icon-button"
        aria-label="Settings"
        title="Settings"
        onClick={() => onSettingsClick?.()}
      >
        <SettingsIcon />
      </button>
    </aside>
  );
}
