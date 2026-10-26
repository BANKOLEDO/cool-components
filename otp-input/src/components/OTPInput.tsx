import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  useOTPState,
  type OTPPhase,
} from "../hooks/useOTPState";
import { ResendTimer } from "./ResendTimer";
import { Slit } from "./Slit";
import { StatusLine, type StatusTone } from "./StatusLine";

export interface OTPInputProps {
  length?: number;
  onComplete: (
    code: string,
  ) => Promise<{ success: boolean; message?: string }>;
  onResend: () => Promise<void>;
  resendCooldown?: number;
  maxAttempts?: number;
  errorMessage?: string;
  successMessage?: string;
  autoFocus?: boolean;
  onRestart?: () => void;
}

interface CellMotion {
  revision: number;
  delay: number;
}

interface Feedback {
  message: string;
  tone: StatusTone;
  context?: "verification" | "resend";
}

const MIN_VERIFICATION_MS = 520;
const TYPE_VERIFY_DELAY = 120;
const PASTE_STAGGER_SECONDS = 0.034;
const PASTE_VERIFY_DELAY = 330;
const LOCK_COOLDOWN_SECONDS = 30;

function createDigits(length: number) {
  return Array.from({ length }, () => "");
}

function createCellMotion(length: number): CellMotion[] {
  return Array.from({ length }, () => ({ revision: 0, delay: 0 }));
}

function countPrefix(digits: string[]) {
  const firstEmpty = digits.findIndex((digit) => digit === "");
  return firstEmpty === -1 ? digits.length : firstEmpty;
}

function sentence(text: string) {
  const value = text.trim();
  return /[.!?]$/.test(value) ? value : `${value}.`;
}

function formatClock(seconds: number) {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function LockIllu() {
  const cx = 104;
  const cy = 92;

  const ticks = Array.from({ length: 60 }, (_, i) => {
    const angle = ((-90 + i * 6) * Math.PI) / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const major = i % 6 === 0;
    const r1 = major ? 47 : 52.5;
    return {
      major,
      digit: major ? i / 6 : null,
      dx1: cos * r1,
      dy1: sin * r1,
      dx2: cos * 58,
      dy2: sin * 58,
      tdx: cos * 37.5,
      tdy: sin * 37.5,
    };
  });

  return (
    <svg className="illu" viewBox="0 0 208 176" fill="none" aria-hidden="true">
      <path
        d="M104 28v128M40 92h128"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.35"
      />
      <circle cx={cx} cy={cy} r="64" stroke="currentColor" strokeWidth="1.2" />
      <circle cx={cx} cy={cy} r="61.5" stroke="currentColor" strokeWidth="0.8" opacity="0.55" />

      <g className="illu-spin">
        {ticks
          .filter((tick) => !tick.major)
          .map((tick, index) => (
            <path
              key={`m${index}`}
              d={`M${(cx + tick.dx1).toFixed(2)} ${(cy + tick.dy1).toFixed(2)}L${(cx + tick.dx2).toFixed(2)} ${(cy + tick.dy2).toFixed(2)}`}
              stroke="currentColor"
              strokeWidth="0.9"
              opacity="0.45"
            />
          ))}
      </g>

      {ticks
        .filter((tick) => tick.major)
        .map((tick) => (
          <path
            key={`M${tick.digit}`}
            d={`M${(cx + tick.dx1).toFixed(2)} ${(cy + tick.dy1).toFixed(2)}L${(cx + tick.dx2).toFixed(2)} ${(cy + tick.dy2).toFixed(2)}`}
            stroke="currentColor"
            strokeWidth="1.6"
          />
        ))}

      {ticks
        .filter((tick) => tick.digit !== null)
        .map((tick) => (
          <text
            key={`t${tick.digit}`}
            x={(cx + tick.tdx).toFixed(2)}
            y={(cy + tick.tdy).toFixed(2)}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="9"
            fill="currentColor"
          >
            {tick.digit}
          </text>
        ))}

      <path d="M97 14L111 14L104 25Z" fill="currentColor" />
      <circle cx={cx} cy={cy} r="6" fill="var(--paper)" stroke="currentColor" strokeWidth="1.6" />
      <circle cx={cx} cy={cy} r="1.8" fill="var(--accent)" />
    </svg>
  );
}

export function OTPInput({
  length = 6,
  onComplete,
  onResend,
  resendCooldown = 60,
  maxAttempts = 3,
  errorMessage,
  successMessage,
  autoFocus = false,
  onRestart,
}: OTPInputProps) {
  const codeLength = Math.max(1, Math.floor(length));
  const attemptsLimit = Math.max(1, Math.floor(maxAttempts));
  const cooldownSeconds = Math.max(0, Math.floor(resendCooldown));
  const uid = useId();
  const statusId = `${uid}-status`;
  const helpId = `${uid}-help`;

  const otp = useOTPState({
    maxAttempts: attemptsLimit,
    resendCooldown: cooldownSeconds,
    lockCooldown: LOCK_COOLDOWN_SECONDS,
  });

  const [digits, setDigits] = useState<string[]>(() =>
    createDigits(codeLength),
  );
  const [cellMotion, setCellMotion] = useState<CellMotion[]>(() =>
    createCellMotion(codeLength),
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const wheelsRef = useRef<HTMLDivElement>(null);
  const verificationTimer = useRef<number | null>(null);
  const verificationId = useRef(0);
  const mountedRef = useRef(true);
  const previousPhase = useRef<OTPPhase>(otp.phase);

  const prefixLength = countPrefix(digits);
  const inputValue = digits.join("");
  const isBusy = isSubmitting || otp.phase === "verifying";
  const inputDisabled =
    isBusy ||
    resendBusy ||
    otp.phase === "error" ||
    otp.phase === "success" ||
    otp.phase === "locked";

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      verificationId.current += 1;
      if (verificationTimer.current !== null) {
        window.clearTimeout(verificationTimer.current);
      }
    };
  }, []);

  const focusInput = useCallback(() => {
    window.requestAnimationFrame(() => {
      inputRef.current?.focus({ preventScroll: true });
    });
  }, []);

  useEffect(() => {
    if (!autoFocus) {
      return;
    }

    const timer = window.setTimeout(focusInput, 180);
    return () => window.clearTimeout(timer);
  }, [autoFocus, focusInput]);

  useEffect(() => {
    setDigits(createDigits(codeLength));
    setCellMotion(createCellMotion(codeLength));
    setActiveIndex(0);
    setIsSubmitting(false);
    setFeedback(null);
    verificationId.current += 1;

    if (verificationTimer.current !== null) {
      window.clearTimeout(verificationTimer.current);
      verificationTimer.current = null;
    }
  }, [codeLength]);

  useLayoutEffect(() => {
    const previous = previousPhase.current;
    previousPhase.current = otp.phase;

    if (previous === "error" && otp.phase !== "error") {
      setDigits(createDigits(codeLength));
      setActiveIndex(0);
      setFeedback((current) =>
        current?.tone === "error" ? current : null,
      );

      if (otp.phase === "typing" || otp.phase === "idle") {
        window.setTimeout(focusInput, 40);
      }
    }

    if (previous === "locked" && otp.phase === "idle") {
      setActiveIndex(0);
      setFeedback(null);
      window.setTimeout(focusInput, 40);
    }
  }, [codeLength, focusInput, otp.phase]);

  useEffect(() => {
    return () => {
      if (verificationTimer.current !== null) {
        window.clearTimeout(verificationTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (inputDisabled) {
      setIsFocused(false);
    }
  }, [inputDisabled]);

  function animateCells(indexes: number[], stagger: boolean) {
    setCellMotion((current) =>
      current.map((cell, index) => {
        const order = indexes.indexOf(index);

        if (order === -1) {
          return cell;
        }

        return {
          revision: cell.revision + 1,
          delay: stagger ? order * PASTE_STAGGER_SECONDS : 0,
        };
      }),
    );
  }

  function clearCode() {
    setDigits(createDigits(codeLength));
    setCellMotion((current) =>
      current.map((cell) => ({ ...cell, revision: cell.revision + 1 })),
    );
    setActiveIndex(0);
    setIsSubmitting(false);
  }

  async function runVerification(token: number, submittedCode: string) {
    if (token !== verificationId.current) {
      return;
    }

    otp.markVerifying();
    const startedAt = performance.now();
    let result: { success: boolean; message?: string };

    try {
      result = await onComplete(submittedCode);
    } catch {
      result = {
        success: false,
        message: "The wheels rejected that code.",
      };
    }

    const remainingTime = Math.max(
      0,
      MIN_VERIFICATION_MS - (performance.now() - startedAt),
    );

    if (remainingTime > 0) {
      await wait(remainingTime);
    }

    if (
      token !== verificationId.current ||
      !mountedRef.current
    ) {
      return;
    }

    setIsSubmitting(false);
    setActiveIndex(-1);

    if (result.success) {
      setFeedback({
        message: result.message?.trim() || successMessage || "Access granted.",
        tone: "success",
        context: "verification",
      });
      otp.markSuccess();
      return;
    }

    setFeedback({
      message:
        result.message?.trim() ||
        errorMessage ||
        "That code did not work.",
      tone: "error",
      context: "verification",
    });
    otp.markFailure();
  }

  function scheduleVerification(code: string, delay: number) {
    if (verificationTimer.current !== null) {
      window.clearTimeout(verificationTimer.current);
    }

    setIsSubmitting(true);
    setActiveIndex(-1);
    const token = verificationId.current + 1;
    verificationId.current = token;

    verificationTimer.current = window.setTimeout(() => {
      verificationTimer.current = null;
      void runVerification(token, code);
    }, delay);
  }

  function resetFeedback() {
    setFeedback((current) =>
      current && current.tone !== "success" ? null : current,
    );
  }

  function writeDigit(nextDigit: string) {
    if (inputDisabled) {
      return;
    }

    const position = Math.min(
      Math.max(0, activeIndex),
      prefixLength,
      codeLength - 1,
    );
    const nextDigits = [...digits];
    nextDigits[position] = nextDigit;
    const nextCode = nextDigits.join("");
    const complete = nextDigits.every((digit) => digit !== "");

    setDigits(nextDigits);
    animateCells([position], false);
    otp.markTyping();
    resetFeedback();
    setActiveIndex(
      complete ? -1 : Math.min(position + 1, codeLength - 1),
    );

    if (complete) {
      scheduleVerification(nextCode, TYPE_VERIFY_DELAY);
    }
  }

  function removeDigit() {
    if (inputDisabled || prefixLength === 0) {
      return;
    }

    const target =
      activeIndex < prefixLength
        ? Math.max(0, activeIndex)
        : Math.max(0, prefixLength - 1);
    const nextDigits = digits.map((digit, index) =>
      index < target ? digit : "",
    );

    setDigits(nextDigits);
    setActiveIndex(target);
    otp.markTyping();
    resetFeedback();
  }

  function commitText(rawText: string, stagger: boolean, fromPaste: boolean) {
    const incoming = rawText.replace(/\D/g, "").slice(0, codeLength);

    if (!incoming) {
      return;
    }

    const nextDigits = createDigits(codeLength);
    const changed: number[] = [];

    for (let index = 0; index < incoming.length; index += 1) {
      nextDigits[index] = incoming[index];

      if (digits[index] !== incoming[index]) {
        changed.push(index);
      }
    }

    const valueChanged = nextDigits.some(
      (digit, index) => digit !== digits[index],
    );

    if (!valueChanged) {
      return;
    }

    const complete = nextDigits.every((digit) => digit !== "");
    const nextCode = nextDigits.join("");

    setDigits(nextDigits);
    animateCells(changed, stagger);
    otp.markTyping();
    resetFeedback();
    setActiveIndex(
      complete ? -1 : Math.min(incoming.length, codeLength - 1),
    );

    if (complete) {
      scheduleVerification(
        nextCode,
        fromPaste || stagger ? PASTE_VERIFY_DELAY : TYPE_VERIFY_DELAY,
      );
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (inputDisabled) {
      return;
    }

    const { key, metaKey, ctrlKey, altKey } = event;

    if (metaKey || ctrlKey || altKey) {
      return;
    }

    if (key.length === 1 && key >= "0" && key <= "9") {
      event.preventDefault();
      writeDigit(key);
      return;
    }

    if (key === "Backspace") {
      event.preventDefault();
      removeDigit();
      return;
    }

    if (key === "ArrowLeft") {
      event.preventDefault();
      setActiveIndex((current) =>
        Math.max(0, Math.min(current, prefixLength) - 1),
      );
      return;
    }

    if (key === "ArrowRight") {
      event.preventDefault();
      setActiveIndex((current) =>
        Math.min(prefixLength, Math.max(0, current) + 1),
      );
      return;
    }

    if (key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
      return;
    }

    if (key === "End") {
      event.preventDefault();
      setActiveIndex(Math.min(prefixLength, codeLength - 1));
    }
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    if (inputDisabled) {
      return;
    }

    const incoming = event.currentTarget.value
      .replace(/\D/g, "")
      .slice(0, codeLength);

    if (!incoming) {
      const hadDigits = digits.some(Boolean);
      setDigits(createDigits(codeLength));
      setActiveIndex(0);
      setFeedback(null);

      if (hadDigits) {
        setCellMotion((current) =>
          current.map((cell) => ({
            ...cell,
            revision: cell.revision + 1,
          })),
        );
      }
      return;
    }

    commitText(incoming, incoming.length > 1, false);
  }

  function handlePaste(event: React.ClipboardEvent<HTMLInputElement>) {
    if (inputDisabled) {
      return;
    }

    const pasted = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, codeLength);

    if (!pasted) {
      return;
    }

    event.preventDefault();
    commitText(pasted, pasted.length > 1, true);
  }

  function handlePointerDown(
    event: ReactPointerEvent<HTMLInputElement>,
  ) {
    const wheels = wheelsRef.current;

    if (!wheels || inputDisabled) {
      return;
    }

    const rect = wheels.getBoundingClientRect();

    if (rect.width === 0) {
      return;
    }

    const offset = Math.max(
      0,
      Math.min(rect.width - 1, event.clientX - rect.left),
    );
    const clickedIndex = Math.floor(
      (offset / rect.width) * codeLength,
    );
    setActiveIndex(Math.min(clickedIndex, prefixLength));
  }

  function handleFocus() {
    setIsFocused(true);
    window.requestAnimationFrame(() => {
      const input = inputRef.current;

      if (input) {
        const end = input.value.length;
        input.setSelectionRange(end, end);
      }
    });
  }

  async function handleResend() {
    if (
      resendBusy ||
      inputDisabled ||
      otp.resendRemaining > 0
    ) {
      return;
    }

    setResendBusy(true);

    try {
      await onResend();

      if (!mountedRef.current) {
        return;
      }

      otp.completeResend();
      clearCode();
      setFeedback({
        message: "A fresh code is on the way.",
        tone: "info",
        context: "resend",
      });
      window.setTimeout(focusInput, 60);
    } catch {
      if (!mountedRef.current) {
        return;
      }

      setFeedback({
        message: "The code could not be resent. Try again.",
        tone: "error",
        context: "resend",
      });
      window.setTimeout(focusInput, 60);
    } finally {
      if (mountedRef.current) {
        setResendBusy(false);
      }
    }
  }

  const failureBase =
    feedback?.message ||
    errorMessage ||
    "That code did not work.";
  const attemptsCopy =
    otp.attemptsRemaining === 0
      ? "No attempts left."
      : otp.attemptsRemaining === 1
        ? "1 attempt left."
        : `${otp.attemptsRemaining} attempts left.`;

  let statusMessage = "Type it once. The rest happens on its own.";
  let statusTone: StatusTone = "muted";

  if (otp.phase === "success") {
    statusMessage =
      feedback?.message || successMessage || "Access granted.";
    statusTone = "success";
  } else if (otp.phase === "locked") {
    statusMessage = `Too many attempts. Try again in ${formatClock(otp.lockRemaining)}.`;
    statusTone = "error";
  } else if (otp.phase === "error") {
    statusMessage = `${sentence(failureBase)} ${attemptsCopy}`;
    statusTone = "error";
  } else if (otp.phase === "verifying" || isSubmitting) {
    statusMessage = "Checking.";
    statusTone = "info";
  } else if (resendBusy) {
    statusMessage = "Sending a fresh code.";
    statusTone = "info";
  } else if (feedback) {
    statusMessage =
      feedback.context === "verification" && feedback.tone === "error"
        ? `${sentence(feedback.message)} ${attemptsCopy}`
        : feedback.message;
    statusTone = feedback.tone;
  }

  const showBeam =
    isFocused &&
    !inputDisabled &&
    activeIndex >= 0 &&
    prefixLength < codeLength;

  return (
    <section
      className="screen-body"
      data-phase={otp.phase}
      aria-labelledby={`${uid}-title`}
    >
      <div className="body-center">
        <LockIllu />
        <div className="body-title">
          <h2 id={`${uid}-title`}>Enter the code</h2>
          <p className="body-sub">Sent to mobile •• •• 7890</p>
        </div>

      <div
        className="otp-field"
        data-submitting={isSubmitting ? "true" : "false"}
      >
        <div
          ref={wheelsRef}
          className="wheels"
          data-error={otp.phase === "error" ? "true" : "false"}
          data-locked={otp.phase === "locked" ? "true" : "false"}
          data-focus={isFocused && !inputDisabled ? "true" : "false"}
          aria-hidden="true"
        >
          {digits.map((digit, index) => (
            <div
              key={index}
              className="wheel"
              data-digit={digit}
              data-filled={digit ? "true" : "false"}
              data-active={
                showBeam && activeIndex === index ? "true" : "false"
              }
            >
              <Slit
                digit={digit}
                phase={otp.phase}
                order={index}
                entryDelay={cellMotion[index]?.delay ?? 0}
              />
              <span className="wheel-gate" aria-hidden="true" />
            </div>
          ))}
        </div>

        {otp.phase === "success" ? (
          <>
            <span className="success-scrim" aria-hidden="true" />
            <div className="success-card" role="status">
              <svg className="success-badge" viewBox="0 0 96 96" fill="none" aria-hidden="true">
                <circle cx="48" cy="48" r="40" fill="var(--success)" />
                <circle
                  cx="48"
                  cy="48"
                  r="45.5"
                  stroke="var(--success)"
                  strokeWidth="7"
                  strokeDasharray="12 8"
                  strokeLinecap="round"
                />
                <path
                  d="M32 49.5 43.5 61 65 35.5"
                  stroke="var(--paper)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <h3>Unlocked</h3>
              <p>{statusMessage}</p>
              <button
                type="button"
                className="pill-done"
                onClick={onRestart}
              >
                Done
              </button>
            </div>
          </>
        ) : null}

        <input
          ref={inputRef}
          className="otp-capture"
          type="text"
          name="one-time-code"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onPointerDown={handlePointerDown}
          onFocus={handleFocus}
          onBlur={() => setIsFocused(false)}
          aria-label={`${codeLength}-digit verification code`}
          aria-describedby={`${statusId} ${helpId}`}
          aria-invalid={otp.phase === "error"}
          aria-busy={isBusy}
          autoComplete="one-time-code"
          autoCorrect="off"
          autoCapitalize="off"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={codeLength}
          enterKeyHint="done"
          spellCheck={false}
          disabled={inputDisabled}
        />
      </div>

      <StatusLine id={statusId} message={statusMessage} tone={statusTone} />
      </div>

      {otp.phase === "locked" ? (
        <div className="lockrow">
          <span aria-hidden="true">
            <svg viewBox="0 0 20 20" fill="none">
              <path
                d="M6.2 9V6.8a3.8 3.8 0 1 1 7.6 0V9"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <rect
                x="4.4"
                y="8.8"
                width="11.2"
                height="8"
                rx="2.2"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
          </span>
          <strong>{formatClock(Math.max(0, otp.lockRemaining))}</strong>
          <span className="lockrow-note">session paused</span>
        </div>
      ) : (
        <ResendTimer
          remaining={otp.resendRemaining}
          cooldown={cooldownSeconds}
          disabled={inputDisabled}
          busy={resendBusy}
          mode={otp.phase === "success" ? "success" : "live"}
          onResend={() => void handleResend()}
        />
      )}

      <p id={helpId} className="sr-only">
        Enter the {codeLength}-digit code. It submits automatically when
        every digit is set. Use the arrow keys to move between wheels and
        backspace to clear one.
      </p>
    </section>
  );
}
