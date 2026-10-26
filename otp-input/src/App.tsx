import { useCallback, useEffect, useRef, useState } from "react";
import {
  MotionConfig,
  motion,
  useReducedMotion,
} from "framer-motion";
import { OTPInput } from "./components/OTPInput";

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function BackGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M14.6 5.4 8 12l6.6 6.6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DotsGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="12" r="1.9" />
      <circle cx="12" cy="12" r="1.9" />
      <circle cx="19" cy="12" r="1.9" />
    </svg>
  );
}

function SignalGlyph() {
  return (
    <svg viewBox="0 0 22 12" fill="currentColor" aria-hidden="true">
      <rect x="0" y="7" width="3.4" height="4.5" rx="1" />
      <rect x="5.4" y="4.8" width="3.4" height="6.7" rx="1" />
      <rect x="10.8" y="2.4" width="3.4" height="9.1" rx="1" />
      <rect x="16.2" y="0.5" width="3.4" height="11" rx="1" opacity="0.35" />
    </svg>
  );
}

function WifiGlyph() {
  return (
    <svg viewBox="0 0 24 18" fill="none" aria-hidden="true">
      <path
        d="M2.8 7.6a13.2 13.2 0 0 1 18.4 0M6.2 11a8.6 8.6 0 0 1 11.6 0"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="12" cy="15" r="1.7" fill="currentColor" stroke="none" />
    </svg>
  );
}

function BatteryGlyph() {
  return (
    <svg viewBox="0 0 30 13" fill="none" aria-hidden="true">
      <rect
        x="0.7"
        y="0.7"
        width="24.6"
        height="11.6"
        rx="3.4"
        stroke="currentColor"
        strokeOpacity="0.5"
        strokeWidth="1.4"
      />
      <rect
        x="2.6"
        y="2.6"
        width="17"
        height="7.8"
        rx="1.9"
        fill="currentColor"
      />
      <path
        d="M27.4 4.6v3.8a2.2 2.2 0 0 0 0-3.8Z"
        fill="currentColor"
        fillOpacity="0.5"
      />
    </svg>
  );
}

function ResetGlyph() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M15.4 10.2a5.4 5.4 0 1 1-1.7-3.9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M15.6 2.8v3.8h-3.8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SwitchGlyph({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 34 20" aria-hidden="true">
      <rect
        x="0.75"
        y="0.75"
        width="32.5"
        height="18.5"
        rx="9.25"
        fill={on ? "var(--success)" : "var(--paper)"}
        stroke={on ? "var(--success)" : "var(--line)"}
        strokeWidth="1.5"
      />
      <circle cx={on ? 22.4 : 11.6} cy="9.9" r="6.1" fill="#fdfcf9" />
    </svg>
  );
}

function DemoSheet({
  open,
  reducedMotion,
  onClose,
  onToggleMotion,
  onReset,
}: {
  open: boolean;
  reducedMotion: boolean;
  onClose: () => void;
  onToggleMotion: () => void;
  onReset: () => void;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        sheetRef.current &&
        !sheetRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <>
      <div className="scrim" aria-hidden="true" />
      <div
        ref={sheetRef}
        className="sheet-stack"
        role="dialog"
        aria-label="Preview controls"
      >
        <div className="sheet">
          <div className="sheet-key">
            <span className="sheet-key-label">Valid key</span>
            <code>123456</code>
          </div>
          <p className="sheet-note">Anything else bounces back.</p>

          <button
            type="button"
            className="sheet-row"
            role="switch"
            aria-checked={reducedMotion}
            onClick={onToggleMotion}
          >
            <span>Reduced motion</span>
            <span className="sheet-switch" aria-hidden="true">
              <SwitchGlyph on={reducedMotion} />
            </span>
          </button>

          <button type="button" className="sheet-row" onClick={onReset}>
            <span>Reset session</span>
            <span className="sheet-reset-ic" aria-hidden="true">
              <ResetGlyph />
            </span>
          </button>
        </div>

        <button type="button" className="sheet-cancel" onClick={onClose}>
          Cancel
        </button>
      </div>
    </>
  );
}

export default function App() {
  const [sessionKey, setSessionKey] = useState(0);
  const [motionOverride, setMotionOverride] = useState<boolean | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const systemReducedMotion = useReducedMotion();
  const reducedMotion = motionOverride ?? Boolean(systemReducedMotion);

  const handleComplete = useCallback(async (code: string) => {
    await wait(420);

    if (code === "123456") {
      return {
        success: true,
        message: "You're in. The key is spent.",
      };
    }

    return {
      success: false,
      message: "That key isn't right.",
    };
  }, []);

  const handleResend = useCallback(async () => {
    await wait(300);
  }, []);

  const handleReset = useCallback(() => {
    setSheetOpen(false);
    setSessionKey((current) => current + 1);
  }, []);

  const handleToggleMotion = useCallback(() => {
    setMotionOverride((current) => {
      const active = current ?? Boolean(systemReducedMotion);
      return !active;
    });
  }, [systemReducedMotion]);

  return (
    <MotionConfig reducedMotion={reducedMotion ? "always" : "never"}>
      <div
        className="otp-app"
        data-reduced-motion={reducedMotion ? "true" : "false"}
      >
        <motion.div
          key={sessionKey}
          className="phone"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="screen">
            <span className="island" aria-hidden="true" />

            <header className="statusbar">
              <span className="statusbar-time">9:41</span>
              <span className="statusbar-icons" aria-hidden="true">
                <SignalGlyph />
                <WifiGlyph />
                <BatteryGlyph />
              </span>
            </header>

            <div className="appbar">
              <button
                type="button"
                className="appbar-back"
                aria-label="Start over"
                onClick={handleReset}
              >
                <BackGlyph />
              </button>
              <span className="appbar-title">Verification</span>
              <button
                type="button"
                className="appbar-more"
                aria-label="Preview controls"
                aria-expanded={sheetOpen}
                onClick={() => setSheetOpen((open) => !open)}
              >
                <DotsGlyph />
              </button>
            </div>

            <OTPInput
              onComplete={handleComplete}
              onResend={handleResend}
              resendCooldown={60}
              maxAttempts={3}
              autoFocus
              onRestart={handleReset}
            />

            <div className="phone-foot">
              <span className="homebar" aria-hidden="true" />
            </div>

            <DemoSheet
              open={sheetOpen}
              reducedMotion={reducedMotion}
              onClose={() => setSheetOpen(false)}
              onToggleMotion={handleToggleMotion}
              onReset={handleReset}
            />
          </div>
        </motion.div>
      </div>
    </MotionConfig>
  );
}
