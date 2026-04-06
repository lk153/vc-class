"use client";

import { useEffect, useRef } from "react";

type Props = {
  result: "correct" | "incorrect" | null;
};

// Pre-generate short beep sounds using Web Audio API
function playSound(type: "correct" | "incorrect") {
  try {
    if (typeof AudioContext === "undefined") return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "correct") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    } else {
      osc.type = "square";
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.setValueAtTime(180, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch {
    // silent — Web Audio not available
  }
}

function triggerHaptic(type: "correct" | "incorrect") {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(type === "correct" ? 50 : [30, 50, 30]);
    }
  } catch {
    // silent
  }
}

export default function AnswerFeedback({ result }: Props) {
  const prevResult = useRef<string | null>(null);

  useEffect(() => {
    if (result && result !== prevResult.current) {
      playSound(result);
      triggerHaptic(result);
      prevResult.current = result;
    }
    if (!result) {
      prevResult.current = null;
    }
  }, [result]);

  // This component only triggers side effects (sound + haptic).
  // Visual feedback is handled inline in PracticeSession.
  return null;
}
