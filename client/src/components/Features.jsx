import React, { useState } from "react";
import { Zap, BarChart3, MessageCircle, Play, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const workflowSteps = [
  {
    icon: Zap,
    title: "Process Automation",
    description: "Automate repetitive workflows and standard operating procedures to improve efficiency and reduce human error.",
    accent: "Formulation R&D Pipeline",
    details: [
      { name: "Stability Batch Launch", status: "completed", time: "09:00 AM" },
      { name: "Chemical Composition Review", status: "active", time: "11:30 AM" },
      { name: "FDA Integrity Validation", status: "pending", time: "02:15 PM" },
    ]
  },
  {
    icon: BarChart3,
    title: "Strategic Analytics",
    description: "Data-driven insights, KPIs, and structured roadmaps to execute transformation with clarity and control.",
    accent: "Batch Yield Insights",
    details: [
      { name: "Batch #104 Purity", value: "98.4%", color: "var(--k-blue)" },
      { name: "Solvent Recovery Rate", value: "87.1%", color: "var(--k-blue-light)" },
      { name: "Cycle Time Optimization", value: "-14%", color: "var(--k-ink)" },
    ]
  },
  {
    icon: MessageCircle,
    title: "Division Collaboration",
    description: "Real-time communication and continuous expert guidance to keep teams aligned and accountable.",
    accent: "Cross-Functional Action Deck",
    details: [
      { name: "Regulatory Compliance", assigned: "Sarah K.", status: "Review" },
      { name: "Quality Assurance", assigned: "Jignesh D.", status: "Testing" },
      { name: "Formulation Science", assigned: "Dr. Amanda", status: "Completed" },
    ]
  }
];

const Features = () => {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <section
      id="media"
      className="border-t border-b"
      style={{ background: "var(--k-white)", borderColor: "var(--k-grey-200)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-16 md:py-24">

        {/* ── Section Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center max-w-3xl mx-auto mb-14 md:mb-20"
        >
          {/* Eyebrow */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <span
              className="inline-block w-8 h-0.5 rounded-full"
              style={{ background: "var(--k-blue)" }}
            />
            <span
              className="text-[11px] font-semibold uppercase tracking-[0.22em]"
              style={{ color: "var(--k-blue)", fontFamily: "'Cabin', sans-serif" }}
            >
              System Capabilities
            </span>
            <span
              className="inline-block w-8 h-0.5 rounded-full"
              style={{ background: "var(--k-blue)" }}
            />
          </div>

          <h2
            className="font-bold tracking-tight mb-4"
            style={{
              fontFamily: "'Cabin', sans-serif",
              color: "var(--k-ink)",
              fontSize: "clamp(1.7rem, 3.5vw, 2.6rem)",
            }}
          >
            Engineered for high-throughput operations
          </h2>
          <p
            className="leading-relaxed max-w-2xl mx-auto"
            style={{
              fontFamily: "'Inter', sans-serif",
              color: "var(--k-grey-600)",
              fontSize: "clamp(0.875rem, 1.6vw, 1.05rem)",
            }}
          >
            A structured, interactive platform built to scale operations, track regulatory compliance, and automate multi-phase workflows.
          </p>
        </motion.div>

        {/* ── Main Grid: Selector List | Live Sandbox ── */}
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-start">

          {/* LEFT: Interactive Selector List */}
          <div className="lg:col-span-5 space-y-4">
            {workflowSteps.map((step, idx) => {
              const Icon = step.icon;
              const isActive = idx === activeStep;

              return (
                <motion.div
                  key={idx}
                  onClick={() => setActiveStep(idx)}
                  className="cursor-pointer border relative overflow-hidden"
                  style={{
                    background: isActive ? "var(--k-blue-tint)" : "var(--k-white)",
                    borderColor: isActive ? "var(--k-blue)" : "var(--k-grey-200)",
                    borderRadius: "8px",
                    padding: "20px 24px",
                    transition: "all 0.3s ease",
                    boxShadow: isActive ? "0 8px 24px -8px rgba(0,38,153,0.15)" : "none",
                  }}
                  whileHover={{ scale: isActive ? 1 : 1.01, y: -2 }}
                  whileTap={{ scale: 0.99 }}
                  transition={{ type: "spring", stiffness: 450, damping: 25 }}
                >
                  {/* Left accent bar when active */}
                  {isActive && (
                    <motion.div
                      layoutId="activeFeatureBar"
                      className="absolute left-0 top-0 bottom-0 w-1 rounded-r-full"
                      style={{ background: "var(--k-blue)" }}
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}

                  <div className="flex gap-4 relative">
                    {/* Icon */}
                    <div
                      className="flex items-center justify-center w-11 h-11 rounded-lg shrink-0"
                      style={{
                        background: isActive ? "var(--k-blue)" : "var(--k-band-grey)",
                        color: isActive ? "var(--k-white)" : "var(--k-grey-600)",
                        transition: "all 0.3s ease",
                      }}
                    >
                      <Icon size={20} />
                    </div>

                    <div>
                      <h3
                        className="font-bold mb-1.5"
                        style={{
                          fontFamily: "'Cabin', sans-serif",
                          color: isActive ? "var(--k-blue)" : "var(--k-ink)",
                          fontSize: "1rem",
                          transition: "color 0.3s ease",
                        }}
                      >
                        {step.title}
                      </h3>
                      <p
                        className="text-sm leading-relaxed"
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          color: "var(--k-grey-600)",
                          fontWeight: 400,
                        }}
                      >
                        {step.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* RIGHT: Live Sandbox Panel */}
          <div className="lg:col-span-7 w-full">
            <div
              className="relative w-full overflow-hidden flex flex-col"
              style={{
                background: "var(--k-white)",
                border: "1px solid var(--k-grey-200)",
                borderRadius: "8px",
                minHeight: "340px",
                boxShadow: "0 4px 24px -8px rgba(0,38,153,0.08)",
              }}
            >
              {/* Accent top bar */}
              <div style={{ height: "4px", background: "linear-gradient(90deg, var(--k-blue), var(--k-blue-light))" }} />

              {/* Top bar */}
              <div
                className="flex items-center justify-between px-6 py-4 border-b"
                style={{ borderColor: "var(--k-grey-200)" }}
              >
                <div>
                  <span
                    className="text-[9px] font-black uppercase tracking-wider"
                    style={{ color: "var(--k-blue)", fontFamily: "'Cabin', sans-serif" }}
                  >
                    Interactive Sandbox
                  </span>
                  <h4
                    className="font-bold mt-0.5 text-sm"
                    style={{ fontFamily: "'Cabin', sans-serif", color: "var(--k-ink)" }}
                  >
                    {workflowSteps[activeStep].accent}
                  </h4>
                </div>
                <div
                  className="flex items-center gap-1.5 text-[10px] font-bold"
                  style={{ color: "var(--k-grey-600)", fontFamily: "'Inter', sans-serif" }}
                >
                  <Play size={10} className="animate-pulse" style={{ color: "var(--k-blue)" }} />
                  Running Simulator
                </div>
              </div>

              {/* Dynamic Content Panel */}
              <div className="flex-1 px-6 py-6 flex flex-col justify-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeStep}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    className="space-y-3"
                  >
                    {/* Case 1: Process Stepper */}
                    {activeStep === 0 && (
                      <div className="space-y-3">
                        {workflowSteps[0].details.map((item, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="flex items-center justify-between p-4 border rounded-lg"
                            style={{
                              borderColor: "var(--k-grey-200)",
                              background: "var(--k-grey-50)",
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                  item.status === "completed"
                                    ? "bg-[var(--k-blue-tint)] text-[var(--k-blue)]"
                                    : item.status === "active"
                                    ? "bg-[var(--k-blue)] text-white animate-pulse"
                                    : "bg-[var(--k-grey-200)] text-[var(--k-grey-500)]"
                                }`}
                              >
                                {item.status === "completed" ? <CheckCircle size={12} /> : i + 1}
                              </div>
                              <span
                                className="text-sm font-semibold"
                                style={{ fontFamily: "'Inter', sans-serif", color: "var(--k-ink)" }}
                              >
                                {item.name}
                              </span>
                            </div>
                            <span
                              className="text-[10px] font-bold"
                              style={{ color: "var(--k-grey-500)" }}
                            >
                              {item.time}
                            </span>
                          </motion.div>
                        ))}
                      </div>
                    )}

                    {/* Case 2: Analytical Metrics */}
                    {activeStep === 1 && (
                      <div className="grid grid-cols-3 gap-3">
                        {workflowSteps[1].details.map((item, i) => (
                          <motion.div
                            key={i}
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20, delay: i * 0.08 }}
                            className="p-4 flex flex-col justify-between border rounded-lg"
                            style={{
                              borderColor: "var(--k-grey-200)",
                              background: "var(--k-grey-50)",
                              minHeight: "110px",
                            }}
                          >
                            <span
                              className="text-[9px] font-bold uppercase tracking-wider"
                              style={{ color: "var(--k-grey-500)" }}
                            >
                              {item.name}
                            </span>
                            <div className="flex flex-col gap-1.5 mt-2">
                              <span
                                className="text-xl md:text-2xl font-black leading-none"
                                style={{ color: item.color, fontFamily: "'Cabin', sans-serif" }}
                              >
                                {item.value}
                              </span>
                              <div
                                className="h-1 rounded-full overflow-hidden"
                                style={{ background: "var(--k-grey-200)" }}
                              >
                                <motion.div
                                  className="h-full rounded-full"
                                  style={{ background: item.color }}
                                  initial={{ width: 0 }}
                                  animate={{ width: "80%" }}
                                  transition={{ duration: 1 }}
                                />
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}

                    {/* Case 3: Action Deck */}
                    {activeStep === 2 && (
                      <div className="space-y-2">
                        {workflowSteps[2].details.map((item, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.08 }}
                            className="p-3 flex items-center justify-between border text-xs rounded-lg"
                            style={{
                              borderColor: "var(--k-grey-200)",
                              background: "var(--k-grey-50)",
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px]"
                                style={{
                                  background: "var(--k-blue-tint)",
                                  color: "var(--k-blue)",
                                  fontFamily: "'Cabin', sans-serif",
                                }}
                              >
                                {item.assigned.split(" ")[0][0]}
                              </div>
                              <div>
                                <p className="font-semibold" style={{ color: "var(--k-ink)", fontFamily: "'Inter', sans-serif" }}>
                                  {item.name}
                                </p>
                                <p className="text-[9px] font-semibold" style={{ color: "var(--k-grey-500)" }}>
                                  Assigned to {item.assigned}
                                </p>
                              </div>
                            </div>
                            <span
                              className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider"
                              style={{
                                background: item.status === "Completed" ? "var(--k-blue-tint)" : "var(--k-grey-100)",
                                color: item.status === "Completed" ? "var(--k-blue)" : "var(--k-grey-700)",
                              }}
                            >
                              {item.status}
                            </span>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Helper footer */}
              <div
                className="text-[10px] font-semibold text-center border-t px-6 py-3"
                style={{
                  borderColor: "var(--k-grey-200)",
                  color: "var(--k-grey-500)",
                  background: "var(--k-band-grey)",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                Click any capability in the left pane to explore its sandbox
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};

export default Features;
