export type ResendMode = "live" | "success" | "locked";

interface ResendTimerProps {
  remaining: number;
  cooldown: number;
  disabled: boolean;
  busy: boolean;
  mode: ResendMode;
  onResend: () => void;
}

function formatRemaining(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}

export function ResendTimer({
  remaining,
  cooldown,
  disabled,
  busy,
  mode,
  onResend,
}: ResendTimerProps) {
  if (mode !== "live") {
    return null;
  }

  const isCoolingDown = remaining > 0;
  const isDisabled = disabled || busy || isCoolingDown;
  const safeCooldown = Math.max(1, cooldown);
  const progress = Math.max(0, Math.min(1, 1 - remaining / safeCooldown));

  return (
    <div className="resend-panel">
      <div className="resend-row">
        <span className="resend-label">Didn&apos;t receive it?</span>
        <button
          type="button"
          className="resend-link"
          onClick={onResend}
          disabled={isDisabled}
          data-ready={!isDisabled}
          aria-label={
            isCoolingDown
              ? `Resend code available in ${remaining} seconds`
              : "Resend verification code"
          }
        >
          {busy ? (
            "Sending…"
          ) : isCoolingDown ? (
            <span className="resend-time">
              Resend in {formatRemaining(remaining)}
            </span>
          ) : (
            "Resend code"
          )}
        </button>
      </div>

      <span className="resend-track" aria-hidden="true">
        <span
          className="resend-fill"
          style={{ width: `${progress * 100}%` }}
        />
      </span>

      <span className="sr-only" aria-live="polite">
        {!isCoolingDown && !busy ? "Resend code is now available." : ""}
      </span>
    </div>
  );
}
