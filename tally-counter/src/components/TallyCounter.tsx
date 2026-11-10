import { useCallback, useEffect, useId, useRef, useState } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";

const MIN = 0;
const MAX = 9999;
const DIGITS = 4;
const TILES = 30;
const TILE_MAX = 28;
const AUTO_MS = 600;
const STEP_MAX = 999;

function startTile(roll: number) {
  const digit = ((roll % 10) + 10) % 10;
  return digit === 0 ? 10 : digit;
}

function clampStep(value: number) {
  if (Number.isNaN(value)) {
    return 1;
  }
  return Math.min(STEP_MAX, Math.max(1, Math.floor(value)));
}

function RollWheel({
  roll,
  dimmed,
  reduced,
}: {
  roll: number;
  dimmed: boolean;
  reduced: boolean;
}) {
  const t = useMotionValue(startTile(roll));
  const y = useTransform(t, (v) => `${-(v / TILES) * 100}%`);
  const tile = useRef(startTile(roll));
  const prevRoll = useRef(roll);

  useEffect(() => {
    const previous = prevRoll.current;
    prevRoll.current = roll;

    if (roll === previous) {
      return;
    }

    if (roll === 0 && previous > 0) {
      // reset: spin every wheel back down to zero
      const steps = ((tile.current % 10) + 10) % 10;
      if (steps === 0) {
        return;
      }
      let base = tile.current;
      if (base - steps < 1) {
        base += 10;
        tile.current = base;
        t.jump(t.get() + 10);
      }
      const rewind = base - steps;
      tile.current = rewind;
      animate(
        t,
        rewind,
        reduced
          ? { duration: 0 }
          : { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
      );
      return;
    }

    let target = tile.current + (roll - previous);
    let jump = 0;

    while (target > TILE_MAX) {
      target -= 10;
      jump -= 10;
    }
    while (target < 1) {
      target += 10;
      jump += 10;
    }

    if (jump !== 0) {
      tile.current += jump;
      t.jump(t.get() + jump);
    }

    tile.current = target;
    animate(
      t,
      target,
      reduced
        ? { duration: 0 }
        : { type: "spring", stiffness: 380, damping: 34 },
    );
  }, [roll, reduced, t]);

  return (
    <span
      className="tally-wheel"
      data-dim={dimmed ? "true" : "false"}
      aria-hidden="true"
    >
      <motion.span className="tally-strip" style={{ y }}>
        {Array.from({ length: TILES }, (_, index) => (
          <span key={index} className="tally-tile">
            {index % 10}
          </span>
        ))}
      </motion.span>
      <span className="tally-gate" />
    </span>
  );
}

function Clicker({
  onPress,
  disabled,
}: {
  onPress: () => void;
  disabled: boolean;
}) {
  const [down, setDown] = useState(false);

  const release = useCallback(() => {
    setDown(false);
  }, []);

  const handlePointerDown = () => {
    setDown(true);
    if (!disabled) {
      onPress();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.repeat) {
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setDown(true);
      if (!disabled) {
        onPress();
      }
    }
  };

  const handleKeyUp = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      release();
    }
  };

  return (
    <button
      type="button"
      className="tally-clicker"
      data-down={down ? "true" : "false"}
      disabled={disabled}
      onPointerDown={handlePointerDown}
      onPointerUp={release}
      onPointerLeave={release}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      aria-label="Count up"
    >
      <span className="tally-clicker-glyph" aria-hidden="true">
        +
      </span>
    </button>
  );
}

export interface TallyCounterProps {
  step?: number;
}

export function TallyCounter({ step: initialStep = 1 }: TallyCounterProps) {
  const reduced = Boolean(useReducedMotion());
  const stepId = useId();
  const [count, setCount] = useState(MIN);
  const [step, setStep] = useState(() => clampStep(initialStep));
  const [auto, setAuto] = useState(false);

  const atMin = count <= MIN;
  const atMax = count >= MAX;

  const move = useCallback((delta: number) => {
    setCount((current) =>
      Math.min(MAX, Math.max(MIN, current + delta)),
    );
  }, []);

  const increment = useCallback(() => {
    if (atMax) {
      return;
    }
    move(step);
  }, [atMax, step, move]);

  const decrement = useCallback(() => {
    if (atMin) {
      return;
    }
    move(-step);
  }, [atMin, step, move]);

  const reset = useCallback(() => {
    setCount((current) => (current === MIN ? current : MIN));
  }, []);

  const toggleAuto = useCallback(() => {
    setAuto((current) => (atMax ? false : !current));
  }, [atMax]);

  const adjustStep = useCallback((delta: number) => {
    setStep((current) => clampStep(current + delta));
  }, []);

  const handleStepChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value.trim();
    if (raw === "") {
      return;
    }
    setStep(clampStep(Number(raw)));
  };

  // auto engine: one tick every AUTO_MS, rolling by the current step
  useEffect(() => {
    if (!auto || atMax) {
      return;
    }
    const id = window.setInterval(() => {
      move(step);
    }, AUTO_MS);
    return () => window.clearInterval(id);
  }, [auto, atMax, step, move]);

  useEffect(() => {
    if (atMax) {
      setAuto(false);
    }
  }, [atMax]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        increment();
      } else if (event.key === "-") {
        event.preventDefault();
        decrement();
      } else if (event.key === "r" || event.key === "R") {
        event.preventDefault();
        reset();
      } else if (event.key === "a" || event.key === "A") {
        event.preventDefault();
        toggleAuto();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [increment, decrement, reset, toggleAuto]);

  const significant = DIGITS - String(count).length;

  let statusText: string;
  if (atMax) {
    statusText = "At max. Reset to keep counting.";
  } else if (auto) {
    statusText = `Auto counting by ${step}.`;
  } else if (atMin) {
    statusText = "At zero.";
  } else {
    statusText = `Counting by ${step}.`;
  }

  return (
    <section
      className="tally-app"
      data-reduced-motion={reduced ? "true" : "false"}
    >
      <div className="tally-frame">
        <header className="tally-head">
          <span className="tally-head-title">Tally</span>
          <span className="tally-head-meta">max {MAX}</span>
        </header>

        <div className="tally-body">
          <div className="tally-readout" role="img" aria-label={`Count ${count}`}>
            {Array.from({ length: DIGITS }, (_, index) => (
              <RollWheel
                key={index}
                roll={Math.floor(count / 10 ** (DIGITS - 1 - index))}
                dimmed={index < significant}
                reduced={reduced}
              />
            ))}
          </div>

          <Clicker onPress={increment} disabled={atMax} />

          <span className="tally-hint">press to count</span>

          <div className="tally-controls">
            <button
              type="button"
              className="tally-button"
              onClick={decrement}
              disabled={atMin}
            >
              − {step}
            </button>
            <button
              type="button"
              className="tally-button tally-button-reset"
              onClick={reset}
              disabled={atMin}
            >
              reset
            </button>
            <button
              type="button"
              className="tally-button tally-button-auto"
              data-auto={auto ? "true" : "false"}
              aria-pressed={auto}
              onClick={toggleAuto}
              disabled={atMax}
            >
              auto
            </button>
            <button
              type="button"
              className="tally-button"
              onClick={increment}
              disabled={atMax}
            >
              + {step}
            </button>
          </div>

          <div className="tally-step">
            <label className="tally-step-label" htmlFor={stepId}>
              count by
            </label>
            <div className="tally-step-control">
              <button
                type="button"
                className="tally-step-btn"
                onClick={() => adjustStep(-1)}
                disabled={step <= 1}
                aria-label="Smaller step"
              >
                −
              </button>
              <input
                id={stepId}
                className="tally-step-input"
                type="number"
                min={1}
                max={STEP_MAX}
                value={step}
                onChange={handleStepChange}
                inputMode="numeric"
                aria-label="Step size"
              />
              <button
                type="button"
                className="tally-step-btn"
                onClick={() => adjustStep(1)}
                disabled={step >= STEP_MAX}
                aria-label="Bigger step"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <p className="tally-status">{statusText}</p>

        <span className="sr-only" role="status">
          {count}
        </span>
      </div>
    </section>
  );
}
