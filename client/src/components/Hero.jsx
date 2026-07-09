import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Layers, ExternalLink } from "lucide-react";
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
    {
      title: "Kayaara Overview",
      desc: "Centralized dashboard providing a holistic view of all operations, KPIs, and organizational health at a glance.",
      icon: "📊",
    },
    {
      title: "Kayaara Asset",
      desc: "Track, manage, and optimize physical and digital assets across the entire enterprise lifecycle.",
      icon: "💼",
    },
    {
      title: "Kayaara Connect",
      desc: "Seamless communication and collaboration platform connecting teams, departments, and stakeholders.",
      icon: "🔗",
    },
    {
      title: "Kayaara DMS",
      desc: "Document Management System for secure storage, version control, and retrieval of enterprise documents.",
      icon: "📄",
    },
    {
      title: "Kayaara Training",
      desc: "Manage employee training programs, certifications, and skill development initiatives.",
      icon: "🎓",
    },
    {
      title: "Kayaara Visitor",
      desc: "Digital visitor management system for streamlined check-ins, pre-registration, and security compliance.",
      icon: "🚪",
    },
    {
      title: "Kayaara Project",
      desc: "End-to-end project planning, execution, and monitoring with resource allocation and timeline tracking.",
      icon: "🏗️",
    },
    {
      title: "Kayaara Quality",
      desc: "Quality assurance and compliance management with audit trails, inspections, and corrective actions.",
      icon: "✅",
    },
    {
      title: "Kayaara Helpdesk",
      desc: "Ticketing and support system for managing internal and external service requests efficiently.",
      icon: "🎫",
    },
    {
      title: "Kayaara Inventory",
      desc: "Real-time inventory tracking, stock management, and supply chain optimization.",
      icon: "📦",
    },
    {
      title: "Kayaara Finance",
      desc: "Financial management, budgeting, invoicing, and expense tracking across the organization.",
      icon: "💰",
    },
    {
      title: "Kayaara Analytics",
      desc: "Advanced analytics and reporting engine delivering actionable insights through interactive dashboards.",
      icon: "📈",
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
            
          </motion.div>

          <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl xl:text-7xl font-bold leading-[1.05]" style={{ color: "var(--k-ink)" }}>
            Smart Ecosystem
            <span className="block" style={{ color: "var(--k-blue)" }}>
              for Modern Enterprise
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

      {/* CAPABILITIES MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto"
            style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 30 }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
              className="relative w-full max-w-6xl my-6 sm:my-10 mx-4 rounded-3xl overflow-hidden"
              style={{ background: "var(--k-white)", boxShadow: "0 40px 80px -20px rgba(0,0,0,0.35)" }}
              onClick={e => e.stopPropagation()}
            >
              {/* Decorative header gradient */}
              <div className="absolute top-0 left-0 right-0 h-1.5" style={{ background: "linear-gradient(90deg, var(--k-blue), #6366f1, var(--k-blue-light))" }} />

              {/* Header */}
              <div className="flex items-center justify-between px-6 sm:px-8 md:px-10 pt-8 sm:pt-10 pb-4 sm:pb-6 border-b" style={{ borderColor: "var(--k-grey-200)" }}>
                <div>
                  <div className="flex items-center gap-2.5 mb-1">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "var(--k-blue-tint)" }}>
                      <Layers size={14} style={{ color: "var(--k-blue)" }} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: "var(--k-blue)" }}>
                      Kayaara Platform
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight" style={{ color: "var(--k-ink)" }}>
                    All <span style={{ color: "var(--k-blue)" }}>Modules</span>
                    <span className="ml-2.5 text-sm font-medium align-middle px-2.5 py-0.5 rounded-full" style={{ background: "var(--k-grey-100)", color: "var(--k-grey-600)" }}>
                      {services.length}
                    </span>
                  </h2>
                </div>
                <motion.button
                  onClick={() => setIsModalOpen(false)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors"
                  style={{ background: "var(--k-grey-100)", color: "var(--k-grey-600)" }}
                  whileHover={{ scale: 1.08, background: "var(--k-grey-200)", rotate: 90 }}
                  whileTap={{ scale: 0.92 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <X size={18} />
                </motion.button>
              </div>

              {/* Grid of cards */}
              <div className="px-6 sm:px-8 md:px-10 py-6 sm:py-8 max-h-[60vh] overflow-y-auto">
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                  {services.map((service, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
                      whileHover={{ y: -3, borderColor: "var(--k-blue)" }}
                      className="group rounded-2xl p-4 sm:p-5 border transition-all duration-300 cursor-default"
                      style={{
                        background: "var(--k-white)",
                        borderColor: "var(--k-grey-200)",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                      }}
                    >
                      <div className="flex items-start gap-3.5">
                        <motion.div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 transition-colors duration-300"
                          style={{ background: "var(--k-grey-100)" }}
                          whileHover={{ scale: 1.1, background: "var(--k-blue-tint)" }}
                          transition={{ type: "spring", stiffness: 400, damping: 17 }}
                        >
                          {service.icon}
                        </motion.div>
                        <div className="min-w-0">
                          <h3 className="text-sm sm:text-base font-bold leading-tight mb-1 transition-colors duration-300 group-hover:text-[var(--k-blue)]" style={{ color: "var(--k-ink)" }}>
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

              {/* Footer */}
              <div className="flex items-center justify-between px-6 sm:px-8 md:px-10 py-4 sm:py-5 border-t" style={{ borderColor: "var(--k-grey-200)", background: "var(--k-grey-50)" }}>
                <span className="text-xs font-medium" style={{ color: "var(--k-grey-500)" }}>
                  {services.length} integrated modules · One unified ecosystem
                </span>
                <motion.button
                  onClick={() => { setIsModalOpen(false); navigate("/login"); }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl transition-colors"
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
