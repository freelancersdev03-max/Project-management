import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Layers, ExternalLink, ChevronRight } from "lucide-react";
import AnimatedDashboard from "./AnimatedDashboard";

const Hero = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isModalOpen]);

  const services = [
    { title: "Kayaara PMS", desc: "End-to-end project planning, execution, and monitoring with resource allocation and timeline tracking.", icon: "🏗️" },
    { title: "Kayaara Asset Management", desc: "Track, manage, and optimize physical and digital assets across the entire enterprise lifecycle.", icon: "💼" },
  ];

  return (
    <section
      className="relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, var(--k-dark) 0%, #051547 60%, #0a1e5e 100%)",
        minHeight: "600px",
      }}
    >
      {/* ── Decorative grid pattern overlay ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* ── Ambient glows ── */}
      <motion.div
        className="absolute -top-32 -right-32 h-[500px] w-[500px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(0,38,153,0.5) 0%, transparent 70%)" }}
        animate={{ scale: [1, 1.08, 1], opacity: [0.6, 0.9, 0.6] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-24 -left-24 h-[400px] w-[400px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(51,85,204,0.35) 0%, transparent 70%)" }}
        animate={{ scale: [1, 1.05, 1], opacity: [0.4, 0.65, 0.4] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 pt-14 sm:pt-20 pb-16 sm:pb-24 md:pb-32 grid lg:grid-cols-12 gap-6 md:gap-8 lg:gap-12 items-center relative z-10">

        {/* LEFT: Text Content */}
        <motion.div
          initial={{ opacity: 0, y: 36 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          className="lg:col-span-5"
        >
          {/* Eyebrow label */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-widest mb-6 border"
            style={{
              background: "rgba(255,255,255,0.08)",
              borderColor: "rgba(255,255,255,0.2)",
              color: "rgba(255,255,255,0.85)",
              backdropFilter: "blur(8px)",
              fontFamily: "'Cabin', sans-serif",
            }}
          >
            <span
              className="inline-block w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: "#4ade80" }}
            />
            Enterprise Management Platform
          </motion.div>

          {/* Main Heading */}
          <h1
            className="font-bold leading-[1.08] mb-6"
            style={{
              fontFamily: "'Cabin', sans-serif",
              color: "var(--k-white)",
              fontSize: "clamp(2rem, 5vw, 3.75rem)",
            }}
          >
            Smart Ecosystem
            <span
              className="block"
              style={{ color: "#7ba7ff" }}
            >
              for Modern Enterprise
            </span>
          </h1>

          {/* Subtext */}
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-xl leading-relaxed mb-8"
            style={{
              fontFamily: "'Inter', sans-serif",
              color: "var(--k-dark-muted)",
              fontSize: "clamp(0.9rem, 1.8vw, 1.1rem)",
              fontWeight: 400,
            }}
          >
            Eliminate operational silos. Track workflows, manage resources, and execute strategies across every department in real time.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.36, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col sm:flex-row flex-wrap items-center gap-3 sm:gap-4"
          >
            <motion.button
              id="hero-access-platform-btn"
              onClick={() => navigate('/login')}
              className="inline-flex items-center justify-center gap-2 font-bold rounded-md cursor-pointer w-full sm:w-auto transition-all"
              style={{
                fontFamily: "'Cabin', sans-serif",
                background: "var(--k-white)",
                color: "var(--k-ink)",
                border: "2px solid var(--k-white)",
                padding: "0.75rem 1.75rem",
                fontSize: "0.9rem",
              }}
              whileHover={{ scale: 1.03, y: -2, boxShadow: "0 12px 32px rgba(0,0,0,0.25)" }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              Access Platform Portal
              <ChevronRight size={16} />
            </motion.button>

            <motion.button
              id="hero-explore-btn"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 font-bold rounded-md cursor-pointer w-full sm:w-auto transition-all"
              style={{
                fontFamily: "'Cabin', sans-serif",
                background: "transparent",
                color: "var(--k-white)",
                border: "2px solid rgba(255,255,255,0.5)",
                padding: "0.75rem 1.75rem",
                fontSize: "0.9rem",
              }}
              whileHover={{ scale: 1.03, y: -2, borderColor: "white", background: "rgba(255,255,255,0.1)" }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              Explore Capabilities
            </motion.button>
          </motion.div>

          {/* Trust signals */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="mt-8 flex items-center gap-4 flex-wrap"
          >
            {["2 Integrated Modules", "Real-Time Dashboards", "GxP Compliant"].map((badge, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold"
                style={{ color: "rgba(255,255,255,0.6)", fontFamily: "'Inter', sans-serif" }}
              >
                <span
                  className="inline-block w-1 h-1 rounded-full"
                  style={{ background: "#4ade80" }}
                />
                {badge}
              </span>
            ))}
          </motion.div>
        </motion.div>

        {/* RIGHT: Animated Dashboard Visual */}
        <motion.div
          initial={{ opacity: 0, y: 44 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="relative lg:col-span-7 w-full"
        >
          {/* Glow halo behind dashboard */}
          <div
            className="absolute -inset-8 rounded-3xl pointer-events-none"
            style={{ background: "radial-gradient(ellipse at center, rgba(51,85,204,0.3) 0%, transparent 70%)", filter: "blur(24px)" }}
          />
          <motion.div
            className="relative"
            animate={{ y: [0, -7, 0] }}
            transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
          >
            {/* Dashboard card wrapper */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                border: "1px solid rgba(255,255,255,0.12)",
                boxShadow: "0 32px 80px -20px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)",
              }}
            >
              <AnimatedDashboard />
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* ── Bottom wave divider ── */}
      <div className="absolute bottom-0 left-0 right-0 overflow-hidden" style={{ lineHeight: 0 }}>
        <svg
          viewBox="0 0 1440 48"
          preserveAspectRatio="none"
          className="w-full"
          style={{ height: "48px", display: "block" }}
        >
          <path
            d="M0,48 L0,24 Q360,0 720,24 Q1080,48 1440,24 L1440,48 Z"
            fill="var(--k-white)"
          />
        </svg>
      </div>

      {/* ── CAPABILITIES MODAL ── */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto"
            style={{ background: "rgba(1,14,55,0.65)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 30 }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
              className="relative w-full max-w-6xl my-6 sm:my-10 mx-4 rounded-2xl overflow-hidden"
              style={{ background: "var(--k-white)", boxShadow: "0 40px 80px -20px rgba(0,0,0,0.4)" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Accent top bar */}
              <div className="absolute top-0 left-0 right-0 h-1" style={{ background: "linear-gradient(90deg, var(--k-blue), var(--k-blue-light), var(--k-blue))" }} />

              {/* Modal Header */}
              <div
                className="flex items-center justify-between px-6 sm:px-10 pt-8 pb-5 border-b"
                style={{ borderColor: "var(--k-grey-200)" }}
              >
                <div>
                  <div className="flex items-center gap-2.5 mb-1">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: "var(--k-blue-tint)" }}
                    >
                      <Layers size={14} style={{ color: "var(--k-blue)" }} />
                    </div>
                    <span
                      className="text-[10px] font-black uppercase tracking-[0.2em]"
                      style={{ color: "var(--k-blue)", fontFamily: "'Cabin', sans-serif" }}
                    >
                      Kayaara Platform
                    </span>
                  </div>
                  <h2
                    className="text-xl sm:text-2xl md:text-3xl font-bold"
                    style={{ fontFamily: "'Cabin', sans-serif", color: "var(--k-ink)" }}
                  >
                    All <span style={{ color: "var(--k-blue)" }}>Modules</span>
                    <span
                      className="ml-2.5 text-sm font-medium align-middle px-2.5 py-0.5 rounded-full"
                      style={{ background: "var(--k-grey-100)", color: "var(--k-grey-600)" }}
                    >
                      {services.length}
                    </span>
                  </h2>
                </div>
                <motion.button
                  onClick={() => setIsModalOpen(false)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "var(--k-grey-100)", color: "var(--k-grey-600)" }}
                  whileHover={{ scale: 1.08, rotate: 90 }}
                  whileTap={{ scale: 0.92 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <X size={18} />
                </motion.button>
              </div>

              {/* Cards Grid */}
              <div className="px-6 sm:px-10 py-6 sm:py-8 max-h-[60vh] overflow-y-auto">
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                  {services.map((service, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
                      whileHover={{ y: -3, borderColor: "var(--k-blue)" }}
                      className="group rounded-xl p-4 sm:p-5 border transition-all duration-300 cursor-default"
                      style={{
                        background: "var(--k-white)",
                        borderColor: "var(--k-grey-200)",
                        boxShadow: "0 1px 4px rgba(0,38,153,0.05)",
                      }}
                    >
                      <div className="flex items-start gap-3.5">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0"
                          style={{ background: "var(--k-blue-tint)" }}
                        >
                          {service.icon}
                        </div>
                        <div className="min-w-0">
                          <h3
                            className="text-sm sm:text-base font-bold leading-tight mb-1 transition-colors duration-300 group-hover:text-[var(--k-blue)]"
                            style={{ fontFamily: "'Cabin', sans-serif", color: "var(--k-ink)" }}
                          >
                            {service.title}
                          </h3>
                          <p className="text-xs leading-relaxed" style={{ color: "var(--k-grey-600)" }}>
                            {service.desc}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Modal Footer */}
              <div
                className="flex items-center justify-between px-6 sm:px-10 py-4 sm:py-5 border-t"
                style={{ borderColor: "var(--k-grey-200)", background: "var(--k-grey-50)" }}
              >
                <span className="text-xs font-medium" style={{ color: "var(--k-grey-500)" }}>
                  {services.length} integrated modules · One unified ecosystem
                </span>
                <motion.button
                  onClick={() => { setIsModalOpen(false); navigate("/login"); }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg transition-colors"
                  style={{ background: "var(--k-blue)", color: "var(--k-white)" }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  Access Platform
                  <ExternalLink size={13} />
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default Hero;
