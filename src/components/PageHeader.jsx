// src/components/PageHeader.jsx
import React from "react";

/**
 * Consistent page header used across the app.
 * Props:
 *  - title: string (required)
 *  - subtitle: string (optional)
 *  - right: ReactNode (optional) — controls/actions shown on the right side
 */
export default function PageHeader({ title, subtitle, right = null }) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-3xl font-extrabold grad-title">{title}</h2>
        {subtitle ? <p className="text-muted mt-1">{subtitle}</p> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </header>
  );
}
