import React, { useEffect, useRef, useState } from "react";

/**
 * KAYAARA AnimatedNumber — counts from 0 to `value` with ease-out.
 * Usage: <AnimatedNumber value={stats.totalTasks} />
 *        <AnimatedNumber value={stats.atsScore} decimals={1} suffix="%" />
 * Respects prefers-reduced-motion (renders final value instantly).
 */
const AnimatedNumber = ({ value = 0, decimals = 0, suffix = "", prefix = "", duration = 1100 }) => {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef(null);
  const fromRef = useRef(0);

  useEffect(() => {
    const target = Number(value) || 0;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      setDisplay(target);
      fromRef.current = target;
      return;
    }

    const from = fromRef.current;
    const start = performance.now();

    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
      setDisplay(from + (target - from) * eased);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = target;
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  return (
    <span>
      {prefix}
      {display.toFixed(decimals)}
      {suffix}
    </span>
  );
};

export default AnimatedNumber;
