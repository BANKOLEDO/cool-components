import { useCallback, useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";

const MIN = 0;
const MAX = 9999;
const DIGITS = 4;
const TILES = 30;
const TILE_MAX = 28;

function startTile(roll: number) {
  const digit = ((roll % 10) + 10) % 10;
  return digit === 0 ? 10 : digit;
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

export function TallyCounter({ step = 1 }: TallyCounterProps) {
  const stepSize = Math.max(1, Math.floor(step));
  const reduced = Boolean(useReducedMotion());
  const [count, setCount] = useState(MIN);

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
    move(stepSize);
  }, [atMax, stepSize, move]);

  const decrement = useCallback(() => {
    if (atMin) {
      return;
    }
    move(-stepSize);
  }, [atMin, stepSize, move]);

  const reset = useCallback(() => {
    setCount((current) => (current === MIN ? current : MIN));
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) {
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
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [increment, decrement, reset]);

  const significant = DIGITS - String(count).length;

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
              − {stepSize}
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
              className="tally-button"
              onClick={increment}
              disabled={atMax}
            >
              + {stepSize}
            </button>
          </div>
        </div>

        <p className="tally-status">
          {atMax
            ? "At max. Reset to keep counting."
            : atMin
              ? "At zero."
              : `Counting by ${stepSize}.`}
        </p>

        <span className="sr-only" role="status">
          {count}
        </span>
      </div>
    </section>
  );
}
