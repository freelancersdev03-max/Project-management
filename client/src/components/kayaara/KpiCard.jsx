import React from "react";
import { motion } from "framer-motion";
import AnimatedNumber from "./AnimatedNumber";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

/**
 * KAYAARA KpiCard v2 — premium metric card.
 * White card, grey label, blue (accent) or ink (neutral) number,
 * icon in a blue-tint chip, animated count-up, glow hover,
 * optional trend indicator and animated bottom-bar.
 *
 * <KpiCard label="Total Task" value={128} icon={<LayoutGrid />} accent index={0} />
 * <KpiCard label="Score" value={87.5} decimals={1} suffix="%" trend="up" bar={87.5} accent index={1} />
 */
const KpiCard = ({
  label,
  value,
  icon,
  accent = false,
  decimals = 0,
  suffix = "",
  prefix = "",
  index = 0,
  trend,       // "up" | "down" | "neutral" | undefined
  bar,         // 0-100 — if provided, shows animated progress bar at bottom
  subtitle,    // optional small sub-label under the number
}) => {
  const trendConfig = {
    up:      { icon: TrendingUp,   color: "var(--k-blue)",     label: "Trending up" },
    down:    { icon: TrendingDown, color: "var(--k-grey-500)",  label: "Trending down" },
    neutral: { icon: Minus,        color: "var(--k-grey-300)",  label: "Stable" },
  };

  const TrendIcon = trend && trendConfig[trend]?.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] } }}
      className="k-card flex flex-col justify-between overflow-hidden"
      style={{ minHeight: 104 }}
    >
      {/* Top row: label + icon */}
      <div className="px-4 pt-4 pb-2 flex items-start justify-between gap-2">
        <p className="k-eyebrow flex-1 min-w-0" style={{ fontSize: 10 }}>{label}</p>
        {icon && (
          <motion.span
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, delay: index * 0.07 + 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
            style={{ background: "var(--k-blue-tint)", color: "var(--k-blue)" }}
          >
            {React.cloneElement(icon, { size: 16 })}
          </motion.span>
        )}
      </div>

      {/* Number + trend */}
      <div className="px-4 pb-3 flex items-end justify-between gap-2">
        <div>
          <h2
            className="text-2xl md:text-3xl font-bold tabular-nums leading-none"
            style={{ color: accent ? "var(--k-blue)" : "var(--k-ink)" }}
          >
            <AnimatedNumber value={value} decimals={decimals} suffix={suffix} prefix={prefix} />
          </h2>
          {subtitle && (
            <p className="text-[11px] font-medium mt-1" style={{ color: "var(--k-grey-500)" }}>
              {subtitle}
            </p>
          )}
        </div>

        {TrendIcon && (
          <motion.span
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, delay: index * 0.07 + 0.3 }}
            className="flex items-center gap-1 text-[11px] font-semibold mb-0.5 shrink-0"
            style={{ color: trendConfig[trend].color }}
            title={trendConfig[trend].label}
          >
            <TrendIcon size={13} />
          </motion.span>
        )}
      </div>

      {/* Animated bottom progress bar */}
      {bar !== undefined && (
        <div className="px-4 pb-4">
          <div className="k-progress-track">
            <motion.div
              className="k-progress-fill"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: bar / 100 }}
              transition={{ duration: 1.1, delay: index * 0.07 + 0.2, ease: [0.22, 1, 0.36, 1] }}
              style={{ transformOrigin: "left" }}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default KpiCard;
