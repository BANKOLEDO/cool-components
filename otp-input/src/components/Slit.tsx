import { motion, useReducedMotion, type Transition } from "framer-motion";
import type { OTPPhase } from "../hooks/useOTPState";

const TILES = ["", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", ""];
export const WHEEL_H = 62;

interface SlitProps {
  digit: string;
  phase: OTPPhase;
  order: number;
  entryDelay: number;
}

export function Slit({
  digit,
  phase,
  order,
  entryDelay,
}: SlitProps) {
  const shouldReduceMotion = useReducedMotion();

  const rest = digit ? -(Number(digit) + 1) * WHEEL_H : 0;
  const empty = !digit;

  let target: number | number[] = rest;
  let transition: Transition =
    shouldReduceMotion || empty
      ? { duration: 0 }
      : {
          type: "spring",
          stiffness: 340,
          damping: 30,
          delay: entryDelay,
        };

  if (!empty && phase === "error") {
    target = [rest, rest - 11, rest + 7, rest - 3, rest];
    transition = {
      duration: 0.38,
      ease: "easeInOut",
      delay: order * 0.026,
    };
  } else if (!empty && phase === "success") {
    target = [
      rest,
      rest - WHEEL_H * 0.55,
      rest + 2,
      rest,
    ];
    transition = {
      duration: 0.5,
      ease: "easeOut",
      delay: order * 0.05,
    };
  }

  return (
    <span className="otp-digit-shell" aria-hidden="true">
      <motion.span
        className="wheel-strip"
        animate={{ y: target }}
        transition={transition}
      >
        {TILES.map((tile, index) => (
          <span key={index} className="wheel-tile">
            {tile}
          </span>
        ))}
      </motion.span>
      {!digit ? <span className="wheel-idle" aria-hidden="true" /> : null}
    </span>
  );
}
