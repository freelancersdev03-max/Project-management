import React from "react";
import { motion } from "framer-motion";
import { 
  ShieldCheck, 
  Cpu, 
  Globe, 
  Award, 
  CheckCircle2, 
  Eye, 
  Target, 
  Lightbulb, 
  Lock, 
  Users, 
  Server, 
  Cloud, 
  Activity, 
  Building2,
  ArrowRight,
  Check
} from "lucide-react";

const coreValues = [
  {
    icon: ShieldCheck,
    title: "Integrity",
    description: "We act with transparency and accountability in every engagement.",
  },
  {
    icon: Lightbulb,
    title: "Innovation",
    description: "We continuously evolve our solutions to stay ahead of industry demands.",
  },
  {
    icon: Lock,
    title: "Compliance",
    description: "Regulatory adherence is not an afterthought — it is foundational.",
  },
  {
    icon: Users,
    title: "Partnership",
    description: "We invest in long-term relationships, not one-time transactions.",
  },
  {
    icon: Award,
    title: "Excellence",
    description: "Every deliverable meets the highest standards of quality and precision.",
  },
];

const expertiseAreas = [
  {
    title: "GxP-Compliant System Design & CSV",
    desc: "Computer System Validation (CSV) and architecture designed specifically for GMP-regulated environments.",
  },
  {
    title: "AI/ML Application Development",
    desc: "Intelligent enterprise applications and automation models built for high-stakes operational workflows.",
  },
  {
    title: "Secure IT Infrastructure",
    desc: "Robust networking, server management, virtualization, and data center solutions for regulated manufacturing.",
  },
  {
    title: "Process Automation & RPA",
    desc: "End-to-end process automation bridging laboratories, R&D, and active production lines.",
  },
  {
    title: "Cloud Migration & Hybrid Platforms",
    desc: "Seamless and secure cloud architectures optimized for AWS, Azure, and complex enterprise hybrid infrastructures.",
  },
  {
    title: "Advanced Cybersecurity & Monitoring",
    desc: "ISO-aligned protection, firewall management, endpoint security, and continuous monitoring for critical data.",
  },
];

const industriesServed = [
  "Pharmaceutical Companies (Formulation, API, CROs)",
  "Biotechnology Firms & Research Labs",
  "Healthcare Organizations & Clinical Facilities",
  "Manufacturing Enterprises & Plants",
  "Engineering & Food Beverages Companies",
  "Small & Medium Sized Organizations",
];

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

const AboutSection = () => {
  return (
    <section id="about" className="k-band-grey k-band-pad relative overflow-hidden py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 space-y-20 md:space-y-28">
        
        {/* Section 1: Hero & Who We Are */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-4xl mx-auto text-center"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider mb-4 shadow-sm"
            style={{ background: "var(--k-blue-tint)", color: "var(--k-blue)" }}
          >
            <span className="k-live-dot" style={{ width: 6, height: 6 }} />
            About Kayaara Innovations
          </motion.div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.15]" style={{ color: "var(--k-ink)" }}>
            Built for Regulated Industries.
            <span className="block mt-1" style={{ color: "var(--k-blue)" }}>
              Driven by Innovation.
            </span>
          </h2>

          <div className="mt-8 space-y-4 text-sm sm:text-base md:text-lg leading-relaxed font-light text-left md:text-center" style={{ color: "var(--k-grey-700)" }}>
            <p>
              At <strong>Kayaara Innovation Pvt. Ltd.</strong>, we exist at the intersection of cutting-edge technology and stringent compliance. Headquartered in Ahmedabad, Gujarat, India, we were founded with a clear vision: to build an IT partner that regulated industries — particularly pharmaceutical, biotech, and healthcare — could rely on, not just for today’s challenges, but for tomorrow’s digital transformation.
            </p>
            <p className="text-xs sm:text-sm md:text-base">
              Our team brings together certified IT professionals, GxP compliance specialists, cloud architects, cybersecurity experts, and AI engineers who understand what it means to operate in GMP-regulated environments. Every project we undertake is designed with compliance at its core and operational excellence as its outcome.
            </p>
          </div>

          {/* Dark Accent Quote Banner */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="mt-10 p-6 md:p-8 rounded-2xl shadow-lg relative overflow-hidden text-center border border-white/10"
            style={{ background: "#212121", color: "#ffffff" }}
          >
            <div className="absolute top-0 left-0 w-2 h-full" style={{ background: "var(--k-blue)" }} />
            <p className="text-base md:text-xl font-medium tracking-wide italic leading-relaxed">
              &ldquo;We don&rsquo;t just fix tech &mdash; we bring clarity, confidence, and continuity to your business operations.&rdquo;
            </p>
            <div className="mt-3 text-xs font-semibold tracking-wider uppercase text-blue-400">
              Our Core Purpose &amp; Promise
            </div>
          </motion.div>
        </motion.div>

        {/* Section 2: Vision & Mission */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            className="k-card p-8 rounded-3xl border flex flex-col justify-between shadow-sm hover:shadow-md transition-all"
            style={{ background: "var(--k-white)", borderColor: "var(--k-grey-200)" }}
          >
            <div>
              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center justify-center h-14 w-14 rounded-2xl shadow-inner" style={{ background: "var(--k-blue-tint)", color: "var(--k-blue)" }}>
                  <Eye size={28} />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider block" style={{ color: "var(--k-blue)" }}>Guiding Star</span>
                  <h3 className="text-2xl font-bold tracking-tight" style={{ color: "var(--k-ink)" }}>Our Vision</h3>
                </div>
              </div>
              <p className="text-sm md:text-base leading-relaxed font-light" style={{ color: "var(--k-grey-700)" }}>
                To become a trusted global IT partner delivering innovative, compliant, and intelligent solutions that drive business excellence — across borders and industries.
              </p>
            </div>
            <div className="mt-8 pt-4 border-t flex items-center gap-2 text-xs font-semibold" style={{ borderColor: "var(--k-grey-200)", color: "var(--k-blue)" }}>
              <Globe size={14} /> Global Reach, Indian Roots &bull; Ahmedabad HQ
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            className="k-card p-8 rounded-3xl border flex flex-col justify-between shadow-sm hover:shadow-md transition-all"
            style={{ background: "var(--k-white)", borderColor: "var(--k-grey-200)" }}
          >
            <div>
              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center justify-center h-14 w-14 rounded-2xl shadow-inner" style={{ background: "var(--k-blue-tint)", color: "var(--k-blue)" }}>
                  <Target size={28} />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider block" style={{ color: "var(--k-blue)" }}>Daily Commitment</span>
                  <h3 className="text-2xl font-bold tracking-tight" style={{ color: "var(--k-ink)" }}>Our Mission</h3>
                </div>
              </div>
              <p className="text-sm md:text-base leading-relaxed font-light" style={{ color: "var(--k-grey-700)" }}>
                To empower organizations with advanced technology, ensuring operational efficiency, regulatory compliance, and sustainable growth — one intelligent solution at a time.
              </p>
            </div>
            <div className="mt-8 pt-4 border-t flex items-center gap-2 text-xs font-semibold" style={{ borderColor: "var(--k-grey-200)", color: "var(--k-blue)" }}>
              <CheckCircle2 size={14} /> Compliance &amp; Performance Oriented
            </div>
          </motion.div>
        </div>

        {/* Section 3: Core Values */}
        <div>
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h3 className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--k-blue)" }}>What Drives Us</h3>
            <h4 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ color: "var(--k-ink)" }}>Our Core Values</h4>
            <p className="text-xs md:text-sm mt-2 font-light" style={{ color: "var(--k-grey-700)" }}>
              The foundational pillars that guide every relationship, architecture, and deliverable.
            </p>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-60px" }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5"
          >
            {coreValues.map((val, idx) => {
              const Icon = val.icon;
              return (
                <motion.div
                  key={idx}
                  variants={cardVariants}
                  whileHover={{
                    y: -6,
                    scale: 1.02,
                    borderColor: "var(--k-blue)",
                    boxShadow: "0 14px 30px -10px rgba(0, 134, 255, 0.15)",
                    transition: { type: "spring", stiffness: 400, damping: 20 },
                  }}
                  className="k-card p-6 rounded-2xl border flex flex-col justify-between transition-all"
                  style={{ background: "var(--k-white)", borderColor: "var(--k-grey-200)" }}
                >
                  <div>
                    <div className="flex items-center justify-center h-12 w-12 rounded-xl mb-5" style={{ background: "var(--k-blue-tint)", color: "var(--k-blue)" }}>
                      <Icon size={24} />
                    </div>
                    <h5 className="text-lg font-bold tracking-tight mb-2" style={{ color: "var(--k-ink)" }}>
                      {val.title}
                    </h5>
                    <p className="text-xs leading-relaxed font-light" style={{ color: "var(--k-grey-700)" }}>
                      {val.description}
                    </p>
                  </div>
                  <div className="mt-6 pt-3 border-t text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ borderColor: "var(--k-grey-200)", color: "var(--k-blue)" }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--k-blue)" }} />
                    Core Principle
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>

        {/* Section 4: Expertise & Industry Focus Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* Left Column: Our Expertise (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest block mb-1" style={{ color: "var(--k-blue)" }}>Technical Leadership</span>
              <h3 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ color: "var(--k-ink)" }}>Our Expertise</h3>
              <p className="text-xs md:text-sm mt-1 font-light" style={{ color: "var(--k-grey-700)" }}>
                End-to-end IT capabilities engineered specifically for high-compliance environments.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {expertiseAreas.map((item, index) => (
                <div 
                  key={index}
                  className="p-5 rounded-2xl border transition-all hover:border-blue-500/50 hover:shadow-sm flex flex-col justify-between"
                  style={{ background: "var(--k-white)", borderColor: "var(--k-grey-200)" }}
                >
                  <div>
                    <div className="flex items-center gap-2 mb-2 font-bold text-sm" style={{ color: "var(--k-ink)" }}>
                      <div className="p-1 rounded-md shrink-0" style={{ background: "var(--k-blue-tint)", color: "var(--k-blue)" }}>
                        <Check size={14} strokeWidth={3} />
                      </div>
                      {item.title}
                    </div>
                    <p className="text-xs font-light leading-relaxed pl-6" style={{ color: "var(--k-grey-700)" }}>
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Why Choose Us & Industry Focus (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest block mb-1" style={{ color: "var(--k-blue)" }}>Why Choose Us</span>
              <h3 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ color: "var(--k-ink)" }}>Industry Focus</h3>
              <p className="text-xs md:text-sm mt-1 font-light" style={{ color: "var(--k-grey-700)" }}>
                Tailored digital transformation and infrastructure for specialized sectors.
              </p>
            </div>

            <div className="k-card p-6 sm:p-8 rounded-3xl border space-y-4 shadow-sm" style={{ background: "var(--k-white)", borderColor: "var(--k-grey-200)" }}>
              <div className="flex items-center gap-3 pb-4 border-b" style={{ borderColor: "var(--k-grey-200)" }}>
                <div className="p-2.5 rounded-xl" style={{ background: "#212121", color: "#ffffff" }}>
                  <Building2 size={22} />
                </div>
                <div>
                  <h4 className="font-bold text-base" style={{ color: "var(--k-ink)" }}>Targeted Sectors</h4>
                  <p className="text-xs font-light" style={{ color: "var(--k-grey-700)" }}>Proven compliance across diverse domains</p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                {industriesServed.map((ind, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-xs sm:text-sm font-medium py-2 px-3 rounded-xl transition-colors hover:bg-slate-50" style={{ color: "var(--k-ink)" }}>
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: "var(--k-blue)" }} />
                    <span>{ind}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t mt-4 text-center" style={{ borderColor: "var(--k-grey-200)" }}>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  ISO Aligned &bull; GMP Regulated &bull; CSV Ready
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Section 5: Bottom CTA Banner */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="p-8 md:p-12 rounded-3xl border flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl relative overflow-hidden"
          style={{ background: "#212121", borderColor: "#333333", color: "#ffffff" }}
        >
          {/* Decorative Blue Glow */}
          <div className="absolute -right-20 -top-20 w-64 h-64 rounded-full opacity-20 pointer-events-none blur-3xl" style={{ background: "var(--k-blue)" }} />
          
          <div className="text-center md:text-left z-10 max-w-2xl">
            <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-3 bg-blue-500/20 text-blue-400 border border-blue-500/30">
              Transform Your Workflow
            </span>
            <h4 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Ready to Modernize Your IT? Let&rsquo;s Build Together.
            </h4>
            <p className="text-xs sm:text-sm mt-2 font-light text-slate-300 leading-relaxed">
              Reliable foundations. Relentless innovation. The infrastructure partner that keeps you ahead of regulatory demands and accelerates digital execution.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 z-10 shrink-0 w-full md:w-auto">
            <a
              href="https://kayaarainnovations.com/company/"
              target="_blank"
              rel="noopener noreferrer"
              className="k-btn-primary inline-flex items-center justify-center gap-2 text-xs sm:text-sm px-7 py-3.5 rounded-xl font-bold no-underline shadow-lg shadow-blue-500/20 hover:scale-105 transition-transform w-full sm:w-auto"
            >
              <span>Visit Official Website</span>
              <ArrowRight size={16} />
            </a>
            <a
              href="mailto:info@Kayaara.com"
              className="inline-flex items-center justify-center gap-2 text-xs sm:text-sm px-6 py-3.5 rounded-xl font-semibold no-underline border border-white/20 hover:bg-white/10 text-white transition-all w-full sm:w-auto"
            >
              info@Kayaara.com
            </a>
          </div>
        </motion.div>

      </div>
    </section>
  );
};

export default AboutSection;

