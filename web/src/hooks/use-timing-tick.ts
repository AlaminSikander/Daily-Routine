"use client";

import { useEffect, useState } from "react";

/** Re-render periodically so Start/Complete enable when the 5-minute window opens. */
export function useTimingTick(intervalMs = 2000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
