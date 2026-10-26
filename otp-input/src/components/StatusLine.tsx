export type StatusTone = "muted" | "info" | "error" | "success";

interface StatusLineProps {
  id: string;
  message: string;
  tone: StatusTone;
}

function StatusGlyph({ tone }: { tone: StatusTone }) {
  if (tone === "success") {
    return (
      <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M3.5 8.4 6.4 11.2 12.5 4.8"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (tone === "error") {
    return (
      <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M8 4.2v4.2M8 11.5v.3"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <span
      className={`status-orbit${tone === "info" ? " status-orbit--live" : ""}`}
      aria-hidden="true"
    />
  );
}

export function StatusLine({ id, message, tone }: StatusLineProps) {
  return (
    <div
      id={id}
      className="status-line flex items-center justify-center"
      data-tone={tone}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="status-glyph">
        <StatusGlyph tone={tone} />
      </span>
      <p>{message}</p>
    </div>
  );
}
