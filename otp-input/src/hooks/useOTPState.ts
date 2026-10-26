import { useCallback, useEffect, useReducer } from "react";

export type OTPPhase =
  | "idle"
  | "typing"
  | "verifying"
  | "error"
  | "success"
  | "locked";

interface OTPState {
  phase: OTPPhase;
  attemptsRemaining: number;
  resendRemaining: number;
  lockRemaining: number;
}

type OTPAction =
  | { type: "type" }
  | { type: "verify" }
  | { type: "success" }
  | { type: "fail" }
  | { type: "releaseError" }
  | { type: "lock"; cooldown: number }
  | { type: "tickLock"; maxAttempts: number }
  | { type: "tickResend" }
  | {
      type: "resend";
      cooldown: number;
      maxAttempts: number;
    };

interface UseOTPStateOptions {
  maxAttempts: number;
  resendCooldown: number;
  lockCooldown: number;
}

function createInitialState({
  maxAttempts,
  resendCooldown,
}: UseOTPStateOptions): OTPState {
  return {
    phase: "idle",
    attemptsRemaining: maxAttempts,
    resendRemaining: resendCooldown,
    lockRemaining: 0,
  };
}

function reducer(state: OTPState, action: OTPAction): OTPState {
  switch (action.type) {
    case "type":
      if (state.phase !== "idle" && state.phase !== "typing") {
        return state;
      }
      return { ...state, phase: "typing" };

    case "verify":
      return { ...state, phase: "verifying" };

    case "success":
      return { ...state, phase: "success" };

    case "fail":
      return {
        ...state,
        phase: "error",
        attemptsRemaining: Math.max(0, state.attemptsRemaining - 1),
      };

    case "releaseError":
      return { ...state, phase: "typing" };

    case "lock":
      return {
        ...state,
        phase: "locked",
        lockRemaining: action.cooldown,
      };

    case "tickLock": {
      if (state.phase !== "locked") {
        return state;
      }

      const next = state.lockRemaining - 1;

      if (next <= 0) {
        return {
          ...state,
          phase: "idle",
          attemptsRemaining: action.maxAttempts,
          lockRemaining: 0,
        };
      }

      return { ...state, lockRemaining: next };
    }

    case "tickResend":
      return {
        ...state,
        resendRemaining: Math.max(0, state.resendRemaining - 1),
      };

    case "resend":
      return {
        ...state,
        phase: "idle",
        attemptsRemaining: action.maxAttempts,
        resendRemaining: action.cooldown,
        lockRemaining: 0,
      };
  }
}

export function useOTPState({
  maxAttempts,
  resendCooldown,
  lockCooldown,
}: UseOTPStateOptions) {
  const [state, dispatch] = useReducer(
    reducer,
    { maxAttempts, resendCooldown, lockCooldown },
    createInitialState,
  );

  useEffect(() => {
    if (state.phase !== "error") {
      return;
    }

    const timer = window.setTimeout(() => {
      if (state.attemptsRemaining === 0) {
        dispatch({ type: "lock", cooldown: lockCooldown });
        return;
      }

      dispatch({ type: "releaseError" });
    }, 900);

    return () => window.clearTimeout(timer);
  }, [lockCooldown, state.attemptsRemaining, state.phase]);

  useEffect(() => {
    if (state.resendRemaining <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      dispatch({ type: "tickResend" });
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [state.resendRemaining]);

  useEffect(() => {
    if (state.phase !== "locked" || state.lockRemaining <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      dispatch({ type: "tickLock", maxAttempts });
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [maxAttempts, state.lockRemaining, state.phase]);

  const markTyping = useCallback(() => {
    dispatch({ type: "type" });
  }, []);

  const markVerifying = useCallback(() => {
    dispatch({ type: "verify" });
  }, []);

  const markSuccess = useCallback(() => {
    dispatch({ type: "success" });
  }, []);

  const markFailure = useCallback(() => {
    dispatch({ type: "fail" });
  }, []);

  const completeResend = useCallback(() => {
    dispatch({ type: "resend", cooldown: resendCooldown, maxAttempts });
  }, [maxAttempts, resendCooldown]);

  return {
    ...state,
    markTyping,
    markVerifying,
    markSuccess,
    markFailure,
    completeResend,
  };
}
