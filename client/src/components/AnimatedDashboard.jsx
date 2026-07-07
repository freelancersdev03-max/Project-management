import React, { useState, useEffect, useRef } from "react";
import { motion, useMotionValue, useTransform, useSpring, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  CheckCircle2,
  Clock,
  Beaker,
  BarChart3,
  Activity,
  Plus,
} from "lucide-react";

/**
 * Premium 3D-Interactive AnimatedDashboard component.
 * Features:
 * - Dynamic mouse hover 3D tilt effect
 * - Active glowing border beam animation
 * - Live real-time fluctuating statistics and charts
 * - Click-to-spawn interactive particle bursts
 * - High-fidelity micro-interactions
 */

const MiniBar = ({ height, delay, active }) => {
  // Live fluctuating heights for active bars
  const [pulseHeight, setPulseHeight] = useState(height);

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      // Fluctuate height by +/- 8px
      setPulseHeight(Math.max(10, Math.min(65, height + (Math.random() * 16 - 8))));
    }, 2500 + Math.random() * 1500);
    return () => clearInterval(interval);
  }, [active, height]);

  return (
    <div className="relative flex flex-col justify-end h-full">
      <motion.div
        className="rounded-t-[4px] w-[11px] md:w-[13px] relative overflow-hidden"
        style={{
          background: active
            ? "linear-gradient(to top, var(--k-blue), var(--k-blue-light))"
            : "var(--k-grey-200)",
        }}
        initial={{ height: 0 }}
        animate={{ height: pulseHeight }}
        transition={{ type: "spring", stiffness: 100, damping: 15, delay }}
      >
        {active && (
          <motion.div
            className="absolute top-0 left-0 right-0 h-1 bg-white/40"
            animate={{ y: [0, 60, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
          />
        )}
      </motion.div>
    </div>
  );
};

const ProgressRing = ({ progress, size = 76, stroke = 6 }) => {
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (progress / 100) * circ;

  return (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} className="block select-none">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--k-grey-100)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--k-blue)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-base font-bold tracking-tight" style={{ color: "var(--k-ink)" }}>
          {progress}%
        </span>
      </div>
    </div>
  );
};

const KpiMini = ({ icon: Icon, label, defaultValue, delay, trend, active }) => {
  const [val, setVal] = useState(defaultValue);

  // Live value updates for KPI cards
  useEffect(() => {
    if (!active) return;
    const isPercent = typeof defaultValue === "string" && defaultValue.includes("%");
    const numericDefault = parseInt(defaultValue, 10);

    const interval = setInterval(() => {
      const change = Math.floor(Math.random() * 5) - 2; // change by -2 to +2
      const newVal = Math.max(1, numericDefault + change);
      setVal(isPercent ? `${newVal}%` : `${newVal}`);
    }, 4000 + Math.random() * 2000);

    return () => clearInterval(interval);
  }, [active, defaultValue]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -2, scale: 1.01 }}
      className="flex items-center gap-3 px-3.5 py-3 rounded-2xl border transition-all duration-300"
      style={{
        background: "var(--k-white)",
        borderColor: "var(--k-grey-200)",
        boxShadow: "0 4px 12px -4px rgba(0,0,0,0.03)",
      }}
    >
      <div
        className="flex items-center justify-center w-8.5 h-8.5 rounded-xl shrink-0"
        style={{ background: "var(--k-blue-tint)", color: "var(--k-blue)" }}
      >
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--k-grey-500)" }}>
          {label}
        </p>
        <div className="flex items-center gap-2">
          <p className="text-base font-black tabular-nums leading-none mt-1" style={{ color: "var(--k-ink)" }}>
            {val}
          </p>
          {trend && (
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: "rgba(0, 134, 255, 0.08)", color: "var(--k-blue)" }}
            >
              {trend}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

const AnimatedDashboard = () => {
  const containerRef = useRef(null);
  const [particles, setParticles] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");

  // Framer Motion 3D perspective mouse variables
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Smooth springs for tilt values
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [6, -6]), { stiffness: 120, damping: 20 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-6, 6]), { stiffness: 120, damping: 20 });

  const handleMouseMove = (event) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = event.clientX - rect.left - width / 2;
    const mouseY = event.clientY - rect.top - height / 2;

    x.set(mouseX / width);
    y.set(mouseY / height);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  // Spark burst particles on click
  const handleCardClick = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const newParticles = Array.from({ length: 8 }).map((_, i) => ({
      id: Date.now() + i,
      x: clickX,
      y: clickY,
      tx: (Math.random() - 0.5) * 120,
      ty: (Math.random() - 0.5) * 120,
      size: Math.random() * 4 + 2,
    }));

    setParticles((prev) => [...prev, ...newParticles].slice(-30));
  };

  return (
    <div
      style={{ perspective: 1000 }}
      className="w-full h-auto cursor-pointer"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleCardClick}
    >
      <motion.div
        ref={containerRef}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
          background: "var(--k-white)",
          borderColor: "var(--k-grey-200)",
        }}
        className="relative w-full rounded-[2rem] overflow-hidden border p-1"
      >
        {/* Animated laser/neon border beam */}
        <div
          className="absolute inset-0 pointer-events-none rounded-[2rem]"
          style={{
            border: "1.5px solid transparent",
            background: "linear-gradient(90deg, var(--k-blue), var(--k-blue-light), var(--k-blue)) border-box",
            WebkitMask: "linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)",
            WebkitMaskComposite: "destination-out",
            maskComposite: "exclude",
            opacity: 0.85,
          }}
        />

        {/* Content Wrapper */}
        <div className="relative bg-white rounded-[1.85rem] overflow-hidden p-4 sm:p-5 md:p-6 space-y-4 select-none">

          {/* Particle burst canvas */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-25">
            <AnimatePresence>
              {particles.map((p) => (
                <motion.div
                  key={p.id}
                  className="absolute rounded-full"
                  style={{
                    left: p.x,
                    top: p.y,
                    width: p.size,
                    height: p.size,
                    background: "var(--k-blue)",
                    boxShadow: "0 0 8px var(--k-blue)",
                  }}
                  animate={{
                    x: p.tx,
                    y: p.ty,
                    opacity: 0,
                    scale: 0.1,
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              ))}
            </AnimatePresence>
          </div>

          {/* macOS Title Bar */}
          <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: "var(--k-grey-100)" }}>
            <div className="flex items-center gap-1.5">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[var(--k-grey-300)] hover:scale-105 transition-transform" />
                <span className="w-3 h-3 rounded-full bg-[var(--k-blue-light)] hover:scale-105 transition-transform" />
                <span className="w-3 h-3 rounded-full bg-[var(--k-blue)] hover:scale-105 transition-transform" />
              </div>
              <span className="text-[11px] font-bold ml-2.5" style={{ color: "var(--k-grey-500)" }}>
                KAYAARA Redesign — Live Operations
              </span>
            </div>
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-[rgba(0,134,255,0.06)]">
              <span className="k-live-dot shrink-0" style={{ width: 6, height: 6 }} />
              <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: "var(--k-blue)" }}>
                Live Stream
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiMini icon={CheckCircle2} label="Tasks Completed" defaultValue="148" delay={0.1} trend="+14%" active />
            <KpiMini icon={Clock} label="Operational SLA" defaultValue="96%" delay={0.2} trend="+4%" active />
            <KpiMini icon={Beaker} label="Pharma Projects" defaultValue="18" delay={0.3} active={false} />
            <KpiMini icon={Activity} label="Transformation Score" defaultValue="89%" delay={0.4} trend="+7%" active />
          </div>

          {/* Middle Layout — Interactive tab options + charts */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">

            {/* Left side: Interactive Bar Chart */}
            <div
              className="md:col-span-7 rounded-2xl p-4 border"
              style={{ borderColor: "var(--k-grey-200)" }}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--k-grey-500)" }}>
                    Velocity Tracker
                  </p>
                  <h4 className="text-sm font-bold mt-0.5" style={{ color: "var(--k-ink)" }}>Weekly Task Output</h4>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--k-blue)" }} />
                  <span className="text-[10px] font-bold" style={{ color: "var(--k-grey-700)" }}>Completed</span>
                </div>
              </div>
              <div className="flex items-end justify-between gap-1 h-[78px] px-1">
                {[22, 38, 16, 52, 45, 62, 35, 48, 59, 28, 42, 60].map((h, i) => (
                  <MiniBar key={i} height={h} delay={0.2 + i * 0.04} active />
                ))}
              </div>
            </div>

            {/* Right side: Completion Ring */}
            <div
              className="md:col-span-5 rounded-2xl p-4 border flex flex-col items-center justify-center relative overflow-hidden"
              style={{ borderColor: "var(--k-grey-200)" }}
            >
              {/* Soft decorative background circles */}
              <div className="absolute -right-8 -bottom-8 w-24 h-24 rounded-full blur-2xl" style={{ background: "var(--k-blue-tint)" }} />

              <p className="text-[10px] font-bold uppercase tracking-wider mb-2 self-start" style={{ color: "var(--k-grey-500)" }}>
                Execution Ratio
              </p>
              <ProgressRing progress={82} />
              <p className="text-[10px] font-semibold mt-2.5" style={{ color: "var(--k-grey-700)" }}>
                82% Target Met
              </p>
            </div>
          </div>

          {/* Bottom interactive cards row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { title: "R&D Formulations", percentage: 95, color: "var(--k-blue)" },
              { title: "Implementation", percentage: 76, color: "var(--k-blue-light)" },
              { title: "Training", percentage: 58, color: "var(--k-grey-300)" },
            ].map((card, i) => (
              <div
                key={i}
                className="rounded-2xl p-3 border transition-all duration-300 hover:border-transparent hover:shadow-md"
                style={{ borderColor: "var(--k-grey-200)" }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold" style={{ color: "var(--k-grey-700)" }}>
                    {card.title}
                  </span>
                  <span className="text-[11px] font-black" style={{ color: "var(--k-ink)" }}>
                    {card.percentage}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden bg-[var(--k-grey-100)]">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: card.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${card.percentage}%` }}
                    transition={{ duration: 1.2, delay: 0.6 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              </div>
            ))}
          </div>

        </div>
      </motion.div>
    </div>
  );
};

export default AnimatedDashboard;
