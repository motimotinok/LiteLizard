import React from 'react';

interface Props {
  overline?: string;
  title: string;
  subtitle?: React.ReactNode;
}

export function CenteredHeader({ overline, title, subtitle }: Props) {
  return (
    <header className="centered-header">
      {overline ? <div className="centered-header-overline">{overline}</div> : null}
      <h1 className="centered-header-title">{title}</h1>
      <div className="centered-header-rule" />
      {subtitle ? <p className="centered-header-subtitle">{subtitle}</p> : null}
    </header>
  );
}
