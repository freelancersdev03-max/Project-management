import React, { useState } from "react";
import { Zap, BarChart3, MessageCircle, ArrowRight, Play, CheckCircle } from "lucide-react";
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
    <section id="media" className="k-band-grey k-band-pad border-t border-b" style={{ borderColor: "var(--k-grey-200)" }}>
      <div className="max-w-7xl mx-auto py-10 md:py-20">

        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center max-w-3xl mx-auto mb-12 md:mb-20"
        >
          <motion.span
            className="k-eyebrow"
            initial={{ opacity: 0, letterSpacing: "0.4em" }}
            whileInView={{ opacity: 1, letterSpacing: "0.22em" }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            System Capabilities
          </motion.span>
          <h2 className="mt-3 text-3xl md:text-5xl font-bold tracking-tight" style={{ color: "var(--k-ink)" }}>
            Engineered for high-throughput operations
          </h2>
          <p className="mt-4 text-base md:text-xl font-light max-w-2xl mx-auto leading-relaxed" style={{ color: "var(--k-grey-700)" }}>
            A structured, interactive platform built to scale operations, track regulatory compliance, and automate multi-phase workflows.
          </p>
        </motion.div>

        {/* Main Grid: Interactive Left (List) vs Animated Right (Widget) */}
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">

          {/* Left Column: Interactive Selector List */}
          <div className="lg:col-span-5 space-y-4">
            {workflowSteps.map((step, idx) => {
              const Icon = step.icon;
              const isActive = idx === activeStep;

              return (
                <motion.div
                  key={idx}
                  onClick={() => setActiveStep(idx)}
                  className="k-card p-5 md:p-6 cursor-pointer border relative overflow-hidden transition-all duration-300 rounded-2xl"
                  style={{
                    background: "var(--k-white)",
                    borderColor: isActive ? "var(--k-blue)" : "var(--k-grey-200)",
                    boxShadow: isActive ? "0 10px 30px -10px rgba(0,134,255,0.12)" : "none",
                  }}
                  whileHover={{ scale: isActive ? 1 : 1.015, y: -2 }}
                  whileTap={{ scale: 0.99 }}
                  transition={{ type: "spring", stiffness: 450, damping: 25 }}
                >
                  {/* Active highlight background pill */}
                  {isActive && (
                    <motion.div
                      layoutId="activeFeatureBg"
                      className="absolute inset-0 bg-gradient-to-r from-[rgba(0,134,255,0.03)] to-transparent pointer-events-none"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}

                  <div className="flex gap-4 relative z-10">
                    <div
                      className="flex items-center justify-center w-11 h-11 rounded-xl shrink-0 transition-colors"
                      style={{
                        background: isActive ? "var(--k-blue)" : "var(--k-grey-100)",
                        color: isActive ? "var(--k-white)" : "var(--k-grey-700)",
                      }}
                    >
                      <Icon size={20} />
                    </div>
                    <div>
                      <h3
                        className="text-lg md:text-xl font-bold transition-colors"
                        style={{ color: isActive ? "var(--k-blue)" : "var(--k-ink)" }}
                      >
                        {step.title}
                      </h3>
                      <p className="mt-1.5 text-xs md:text-sm font-light leading-relaxed" style={{ color: "var(--k-grey-700)" }}>
                        {step.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Right Column: Live-updating Visual Sandbox Panel */}
          <div className="lg:col-span-7 w-full">
            <div
              className="relative w-full rounded-3xl border overflow-hidden p-6 min-h-[340px] flex flex-col justify-between"
              style={{
                background: "var(--k-white)",
                borderColor: "var(--k-grey-200)",
                boxShadow: "inset 0 0 40px rgba(0,0,0,0.02)"
              }}
            >
              {/* Top bar description */}
              <div className="flex items-center justify-between pb-4 border-b border-dashed" style={{ borderColor: "var(--k-grey-300)" }}>
                <div>
                  <span className="text-[9px] font-black uppercase tracking-wider" style={{ color: "var(--k-blue)" }}>
                    Interactive Sandbox
                  </span>
                  <h4 className="text-sm md:text-base font-bold mt-0.5" style={{ color: "var(--k-ink)" }}>
                    {workflowSteps[activeStep].accent}
                  </h4>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold" style={{ color: "var(--k-grey-700)" }}>
                  <Play size={10} className="animate-pulse" style={{ color: "var(--k-blue)" }} />
                  Running Simulator
                </div>
              </div>

              {/* Dynamic Content Panel */}
              <div className="flex-1 py-6 flex flex-col justify-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeStep}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    className="space-y-3"
                  >
                    {/* Simulator Case 1: Process Stepper */}
                    {activeStep === 0 && (
                      <div className="space-y-3">
                        {workflowSteps[0].details.map((item, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="k-card p-4 flex items-center justify-between shadow-sm border"
                            style={{ borderColor: "var(--k-grey-200)" }}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                  item.status === "completed"
                                    ? "bg-[var(--k-blue-tint)] text-[var(--k-blue)]"
                                    : item.status === "active"
                                    ? "bg-[var(--k-ink)] text-white animate-pulse"
                                    : "bg-[var(--k-grey-100)] text-[var(--k-grey-500)]"
                                }`}
                              >
                                {item.status === "completed" ? <CheckCircle size={12} /> : i + 1}
                              </div>
                              <span className="text-xs md:text-sm font-bold" style={{ color: "var(--k-ink)" }}>
                                {item.name}
                              </span>
                            </div>
                            <span className="text-[10px] font-bold" style={{ color: "var(--k-grey-500)" }}>
                              {item.time}
                            </span>
                          </motion.div>
                        ))}
                      </div>
                    )}

                    {/* Simulator Case 2: Analytical Metrics */}
                    {activeStep === 1 && (
                      <div className="grid grid-cols-3 gap-3">
                        {workflowSteps[1].details.map((item, i) => (
                          <motion.div
                            key={i}
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20, delay: i * 0.08 }}
                            className="k-card p-4 flex flex-col justify-between shadow-sm border min-h-[110px]"
                            style={{ borderColor: "var(--k-grey-200)" }}
                          >
                            <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "var(--k-grey-500)" }}>
                              {item.name}
                            </span>
                            <div className="flex flex-col gap-1.5 mt-2">
                              <span className="text-lg md:text-2xl font-black leading-none" style={{ color: item.color }}>
                                {item.value}
                              </span>
                              <div className="h-1 rounded-full bg-[var(--k-grey-100)] overflow-hidden">
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

                    {/* Simulator Case 3: Action Deck */}
                    {activeStep === 2 && (
                      <div className="space-y-2">
                        {workflowSteps[2].details.map((item, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.08 }}
                            className="k-card p-3 flex items-center justify-between shadow-sm border text-xs"
                            style={{ borderColor: "var(--k-grey-200)" }}
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-6.5 h-6.5 rounded-full bg-[var(--k-blue-tint)] text-[var(--k-blue)] flex items-center justify-center font-bold text-[9px]">
                                {item.assigned.split(" ")[0][0]}
                              </div>
                              <div>
                                <p className="font-bold" style={{ color: "var(--k-ink)" }}>{item.name}</p>
                                <p className="text-[9px] font-semibold" style={{ color: "var(--k-grey-500)" }}>Assigned to {item.assigned}</p>
                              </div>
                            </div>
                            <span
                              className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider"
                              style={{
                                background: item.status === "Completed" ? "var(--k-blue-tint)" : "var(--k-grey-100)",
                                color: item.status === "Completed" ? "var(--k-blue)" : "var(--k-grey-700)"
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

              {/* Action helper footer */}
              <div className="text-[10px] font-semibold text-center border-t pt-3" style={{ borderColor: "var(--k-grey-200)", color: "var(--k-grey-500)" }}>
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
