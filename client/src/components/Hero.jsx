import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import AnimatedDashboard from "./AnimatedDashboard";

const Hero = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  const services = [
    {
      title: "Task Manager",
      desc: "Streamline daily operations with automated task assignment and tracking.",
      icon: "📋",
    },
    {
      title: "FMS",
      desc: "Financial Management System to track project budgets and expenditures.",
      icon: "💰",
    },
    {
      title: "Project Management",
      desc: "End-to-end planning, execution, and monitoring of complex business goals.",
      icon: "🏗️",
    },
    {
      title: "Project Coordinator",
      desc: "Expert handholding to align cross-functional teams and communication.",
      icon: "🤝",
    },
  ];

  return (
    <section className="relative overflow-hidden k-band-white">
      {/* Ambient background blurs */}
      <motion.div
        className="absolute -top-40 -right-40 h-[420px] w-[420px] rounded-full blur-3xl pointer-events-none"
        style={{ background: "var(--k-blue-tint)" }}
        animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.7, 0.5] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-40 -left-40 h-[420px] w-[420px] rounded-full blur-3xl pointer-events-none"
        style={{ background: "var(--k-band-grey)" }}
        animate={{ scale: [1, 1.05, 1], opacity: [0.5, 0.65, 0.5] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 pt-6 sm:pt-10 pb-12 sm:pb-16 md:pb-28 grid lg:grid-cols-12 gap-6 md:gap-8 lg:gap-12 items-center">

        {/* LEFT: Text */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="lg:col-span-5 relative z-10"
        >
          {/* Eyebrow pill */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider mb-6"
            style={{ background: "var(--k-blue-tint)", color: "var(--k-blue)" }}
          >
            <span className="k-live-dot" style={{ width: 6, height: 6 }} />
            Project Management System
          </motion.div>

          <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl xl:text-7xl font-bold leading-[1.05]" style={{ color: "var(--k-ink)" }}>
            Smart Project Management
            <span className="block" style={{ color: "var(--k-blue)" }}>
              for Modern Enterprises
            </span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="mt-4 sm:mt-6 md:mt-8 max-w-xl text-sm sm:text-base md:text-lg lg:text-xl leading-relaxed font-light"
            style={{ color: "var(--k-grey-700)" }}
          >
            Eliminate operational silos. Track workflows, manage resources, and execute strategies across every department in real time.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 sm:mt-8 md:mt-10 flex flex-col sm:flex-row flex-wrap items-center gap-3 sm:gap-4 md:gap-5"
          >
            <motion.button
              onClick={() => navigate('/login')}
              className="k-btn-primary inline-flex items-center justify-center text-sm md:text-base w-full sm:w-auto px-6 md:px-10 py-3 md:py-4"
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              Access Platform Portal
            </motion.button>

            <motion.button
              onClick={() => setIsModalOpen(true)}
              className="k-btn-ghost inline-flex items-center justify-center text-sm md:text-base w-full sm:w-auto px-6 py-3 md:py-4"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              Explore Capabilities
            </motion.button>
          </motion.div>
        </motion.div>

        {/* RIGHT: Animated Dashboard Visual */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="relative lg:col-span-7 w-full lg:pl-4 md:pl-0"
        >
          <div className="absolute -inset-10 rounded-3xl blur-3xl opacity-60 pointer-events-none" style={{ background: "var(--k-blue-tint)" }} />
          <motion.div
            className="relative"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          >
            <AnimatedDashboard />
          </motion.div>
        </motion.div>
      </div>

      {/* SERVICE MODAL OVERLAY */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="k-backdrop"
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
              className="k-modal w-full max-w-3xl p-5 sm:p-6 md:p-8 lg:p-10 overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-2xl md:text-3xl font-bold" style={{ color: "var(--k-ink)" }}>
                  Our Platform <span style={{ color: "var(--k-blue)" }}>Capabilities</span>
                </h2>
                <motion.button
                  onClick={() => setIsModalOpen(false)}
                  className="k-btn-icon"
                  aria-label="Close"
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <X size={20} />
                </motion.button>
              </div>
              <div className="grid sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                {services.map((service, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
                    whileHover={{ scale: 1.02, borderColor: "var(--k-blue)" }}
                    className="k-card-grey p-4 sm:p-5 md:p-6 border border-transparent transition-colors"
                  >
                    <motion.div
                      className="text-3xl sm:text-4xl mb-2 sm:mb-3 md:mb-4"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 15, delay: index * 0.08 + 0.15 }}
                    >
                      {service.icon}
                    </motion.div>
                    <h3 className="text-sm sm:text-lg md:text-xl font-bold mb-1 sm:mb-2" style={{ color: "var(--k-ink)" }}>{service.title}</h3>
                    <p className="text-xs sm:text-sm md:text-base leading-relaxed" style={{ color: "var(--k-grey-700)" }}>{service.desc}</p>
                  </motion.div>
                ))}
              </div>
              <div className="mt-6 sm:mt-8 md:mt-10 text-center">
                <motion.button
                  onClick={() => setIsModalOpen(false)}
                  className="k-btn-primary text-sm sm:text-base"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  Close Window
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
