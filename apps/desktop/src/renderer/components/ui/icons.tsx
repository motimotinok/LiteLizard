import React from 'react';

interface IconProps {
  size?: number;
  stroke?: number;
  fill?: string;
}

interface BaseIconProps extends IconProps {
  children: React.ReactNode;
}

function BaseIcon({ size = 16, stroke = 1.25, fill = 'none', children }: BaseIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

export const IconFolder = (props: IconProps) => (
  <BaseIcon {...props}>
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  </BaseIcon>
);

export const IconFolderOpen = (props: IconProps) => (
  <BaseIcon {...props}>
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2" />
    <path d="M3 9h18l-2 8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  </BaseIcon>
);

export const IconFile = (props: IconProps) => (
  <BaseIcon {...props}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
  </BaseIcon>
);

export const IconAgent = (props: IconProps) => (
  <BaseIcon {...props}>
    <circle cx="12" cy="9" r="3" />
    <path d="M5 20c1-4 4-6 7-6s6 2 7 6" />
    <path d="M12 3v2" />
  </BaseIcon>
);

export const IconSearch = (props: IconProps) => (
  <BaseIcon {...props}>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" />
  </BaseIcon>
);

export const IconSettings = (props: IconProps) => (
  <BaseIcon {...props}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3 1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8 1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </BaseIcon>
);

export const IconPanel = (props: IconProps) => (
  <BaseIcon {...props}>
    <rect x="3" y="4" width="18" height="16" rx="1.5" />
    <path d="M15 4v16" />
  </BaseIcon>
);

export const IconChevronDown = (props: IconProps) => (
  <BaseIcon {...props}>
    <path d="M6 9l6 6 6-6" />
  </BaseIcon>
);

export const IconChevronRight = (props: IconProps) => (
  <BaseIcon {...props}>
    <path d="M9 6l6 6-6 6" />
  </BaseIcon>
);

export const IconPlus = (props: IconProps) => (
  <BaseIcon {...props}>
    <path d="M12 5v14M5 12h14" />
  </BaseIcon>
);

export const IconPlay = (props: IconProps) => (
  <BaseIcon {...props} fill="currentColor" stroke={0}>
    <path d="M6 4l14 8-14 8z" />
  </BaseIcon>
);

export const IconNewFile = (props: IconProps) => (
  <BaseIcon {...props}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
    <path d="M12 12v5M9.5 14.5h5" />
  </BaseIcon>
);

export const IconNewFolder = (props: IconProps) => (
  <BaseIcon {...props}>
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <path d="M12 11v5M9.5 13.5h5" />
  </BaseIcon>
);

export const IconImport = (props: IconProps) => (
  <BaseIcon {...props}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
    <path d="M12 11v6m-2.5-2.5L12 17l2.5-2.5" />
  </BaseIcon>
);

export const IconRefresh = (props: IconProps) => (
  <BaseIcon {...props}>
    <path d="M3 12a9 9 0 0 1 15.5-6.3L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-15.5 6.3L3 16" />
    <path d="M3 21v-5h5" />
  </BaseIcon>
);
