import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Award,
  Users,
  Briefcase,
  Clock,
  ChevronDown,
  Star,
  ArrowRight,
  ShieldCheck,
  Zap,
  Lock,
  Headphones,
  Database,
  Cpu,
  Sparkles,
  Quote,
  Check
} from "lucide-react";

/* ============================================================
   1. FUN FACTS / COUNTER SECTION
   ============================================================ */
const funFacts = [
  { count: "250+", label: "Projects Completed", suffix: "Enterprise Implementations" },
  { count: "99.9%", label: "System Uptime", suffix: "High Availability Infrastructure" },
  { count: "15+", label: "Years Experience", suffix: "Industry-Proven Leadership" },
  { count: "100%", label: "GxP Compliance", suffix: "Regulatory Adherence Rate" },
];

/* ============================================================
   2. WHY CHOOSE US / FEATURES SECTION
   ============================================================ */
const whyChooseFeatures = [
  {
    icon: ShieldCheck,
    title: "Secure IT Services",
    desc: "Bank-grade encryption, ISO-aligned protection, and GxP compliance baked into every layer of our platform.",
  },
  {
    icon: Headphones,
    title: "Fast Communication",
    desc: "24/7 dedicated support teams ensuring zero downtime and rapid response times for critical incidents.",
  },
  {
    icon: Database,
    title: "Backup Solutions",
    desc: "Automated real-time cloud backups with instant failover recovery and data integrity verification.",
  },
  {
    icon: Cpu,
    title: "Modern Technology",
    desc: "Built on modern cloud-native architecture, microservices, and AI-driven workflow engines.",
  },
];

/* ============================================================
   3. WORK PROCESS (STEP 01 -> 04)
   ============================================================ */
const workSteps = [
  {
    step: "01",
    title: "Discovery & Audit",
    desc: "We analyze your existing workflows, compliance demands, and system bottlenecks to craft a precise blueprint.",
  },
  {
    step: "02",
    title: "Strategic Planning",
    desc: "Our architects map out micro-milestones, security boundaries, and GxP validation protocols.",
  },
  {
    step: "03",
    title: "Implementation",
    desc: "Agile deployment of customized modules, data migration, and seamless integration with existing systems.",
  },
  {
    step: "04",
    title: "Testing & Support",
    desc: "Rigorous quality validation, staff onboarding, and 24/7 proactive monitoring and maintenance.",
  },
];

/* ============================================================
   4. OUR CREATIVE TEAM
   ============================================================ */
const teamMembers = [
  {
    name: "Dr. Amanda Vance",
    role: "Head of GxP Compliance & Quality",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400",
  },
  {
    name: "Jignesh Desai",
    role: "Chief Technology Officer",
    avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=400",
  },
  {
    name: "Sarah Jenkins",
    role: "Director of Enterprise Solutions",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=400",
  },
  {
    name: "Rajesh Kumar",
    role: "Lead Infrastructure Architect",
    avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=400",
  },
];

/* ============================================================
   5. FREQUENTLY ASKED QUESTIONS (FAQ)
   ============================================================ */
const faqs = [
  {
    q: "How can KAYAARA help our business transition to an integrated IT model?",
    a: "KAYAARA provides end-to-end IT architecture redesign, legacy data migration, and GxP-compliant validation. We unify fragmented spreadsheets and siloed software into a single, cohesive cloud enterprise suite.",
  },
  {
    q: "How is our implementation work process simplified?",
    a: "We follow a modular 4-step framework (Discovery, Strategic Planning, Implementation, Testing & Support). This ensures zero operational disruption while giving leadership complete milestone visibility.",
  },
  {
    q: "How does our GxP & IT support policy work?",
    a: "Our support SLAs guarantee under 15-minute response times for critical incidents, complete audit trails, periodic CSV re-validation, and dedicated enterprise account engineers.",
  },
  {
    q: "Can KAYAARA integrate with our existing ERP or LIMS software?",
    a: "Yes! KAYAARA features REST APIs and webhook connectors that seamlessly sync data with SAP, Oracle, TrackWise, and custom legacy databases.",
  },
];

/* ============================================================
   6. TESTIMONIALS
   ============================================================ */
const testimonials = [
  {
    quote: "KAYAARA transformed our manufacturing audit process. What used to take 3 weeks of manual documentation now happens in real time with complete GxP compliance.",
    name: "Karen Lynn",
    title: "VP of Quality Assurance",
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150",
  },
  {
    quote: "Totally reliable IT service. Their team migrated our entire enterprise pipeline without a single minute of unexpected downtime.",
    name: "Dianne Russell",
    title: "Operations Director",
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150",
  },
  {
    quote: "The best enterprise management solution we've used. The interface is intuitive, and the automation tools save us over 120 hours every month.",
    name: "Marvin McKinney",
    title: "Chief Information Officer",
    rating: 5,
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150",
  },
];

/* ============================================================
   MAIN ABOUT & FULL TECHZA PAGE COMPONENTS
   ============================================================ */
export const TechzaAboutOverview = () => {
  return (
    <section className="py-20 md:py-28 overflow-hidden" style={{ background: "var(--k-white)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* LEFT: Image Grid Stack - Indian Corporate Meeting */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-6 relative"
          >
            <div className="relative z-10 rounded-2xl overflow-hidden shadow-2xl border" style={{ borderColor: "var(--k-grey-200)" }}>
              <img
                src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=800"
                alt="Executive Boardroom Data & Analytics Presentation Meeting"
                className="w-full h-[380px] sm:h-[460px] object-cover object-center"
              />
            </div>

            {/* Overlapping Badge Card */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="absolute -bottom-8 -right-4 sm:-right-8 z-20 rounded-2xl p-6 shadow-2xl border flex items-center gap-4 max-w-xs"
              style={{ background: "var(--k-dark)", borderColor: "rgba(255,255,255,0.15)", color: "white" }}
            >
              <div className="w-14 h-14 rounded-xl flex items-center justify-center font-bold text-2xl shrink-0" style={{ background: "var(--k-blue)", color: "white" }}>
                15+
              </div>
              <div>
                <h4 className="font-bold text-base leading-tight" style={{ fontFamily: "'Cabin', sans-serif" }}>Years Experience</h4>
                <p className="text-xs text-blue-200 mt-1">In IT & Enterprise Consulting</p>
              </div>
            </motion.div>

            {/* Background Decorative Frame */}
            <div className="absolute -top-6 -left-6 w-full h-full rounded-2xl border-2 border-dashed pointer-events-none" style={{ borderColor: "var(--k-blue-light)" }} />
          </motion.div>

          {/* RIGHT: Content */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-6 space-y-6"
          >
            {/* Section Eyebrow */}
            <div className="flex items-center gap-2">
              <span className="w-8 h-0.5 rounded-full" style={{ background: "var(--k-blue)" }} />
              <span className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--k-blue)", fontFamily: "'Cabin', sans-serif" }}>
                About Our Company
              </span>
            </div>

            <h2 className="font-bold tracking-tight text-3xl sm:text-4xl md:text-5xl leading-tight" style={{ fontFamily: "'Cabin', sans-serif", color: "var(--k-ink)" }}>
              We are a best IT solution provider for modern enterprise
            </h2>

            <p className="leading-relaxed text-base" style={{ fontFamily: "'Inter', sans-serif", color: "var(--k-grey-600)" }}>
              KAYAARA Innovations delivers resilient, GxP-compliant enterprise technology, process automation, and cloud management. We bridge the gap between complex operational compliance and cutting-edge software engineering.
            </p>

            {/* Bullet List */}
            <div className="grid sm:grid-cols-2 gap-4 pt-2">
              {[
                "Software Development & Architecture",
                "24/7 IT Infrastructure Support",
                "GxP & CSV Regulatory Validation",
                "Cloud Migration & Security",
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--k-blue-tint)", color: "var(--k-blue)" }}>
                    <Check size={12} strokeWidth={3} />
                  </div>
                  <span className="text-sm font-semibold" style={{ color: "var(--k-ink)", fontFamily: "'Inter', sans-serif" }}>
                    {item}
                  </span>
                </div>
              ))}
            </div>

            {/* CTA Button */}
            <div className="pt-4">
              <motion.button
                onClick={() => { const el = document.getElementById("contact"); if (el) el.scrollIntoView({ behavior: "smooth" }); }}
                className="k-btn-primary inline-flex items-center gap-2"
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.96 }}
              >
                Discover More →
              </motion.button>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
};

export const TechzaFunFacts = () => {
  return (
    <section className="py-16 md:py-20 relative overflow-hidden" style={{ background: "var(--k-dark)", color: "white" }}>
      {/* Background Glow */}
      <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: "radial-gradient(var(--k-blue-light) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="w-8 h-0.5 rounded-full" style={{ background: "var(--k-blue-light)" }} />
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--k-blue-light)", fontFamily: "'Cabin', sans-serif" }}>
              Fun Facts About Our Company
            </span>
            <span className="w-8 h-0.5 rounded-full" style={{ background: "var(--k-blue-light)" }} />
          </div>
          <h2 className="font-bold text-2xl sm:text-3xl md:text-4xl text-white" style={{ fontFamily: "'Cabin', sans-serif" }}>
            Our success rate is shown by numbers
          </h2>
        </div>

        {/* Counter Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {funFacts.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1, duration: 0.5 }}
              whileHover={{ y: -6, borderColor: "var(--k-blue-light)" }}
              className="p-8 rounded-2xl border text-center transition-all duration-300"
              style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.1)", backdropFilter: "blur(12px)" }}
            >
              <div className="text-4xl sm:text-5xl font-black mb-2" style={{ fontFamily: "'Cabin', sans-serif", color: "#60a5fa" }}>
                {item.count}
              </div>
              <h3 className="font-bold text-lg text-white mb-1" style={{ fontFamily: "'Cabin', sans-serif" }}>
                {item.label}
              </h3>
              <p className="text-xs text-blue-200" style={{ fontFamily: "'Inter', sans-serif" }}>
                {item.suffix}
              </p>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
};

export const TechzaWhyChooseUs = () => {
  return (
    <section className="py-20 md:py-28" style={{ background: "var(--k-band-grey)", borderTop: "1px solid var(--k-grey-200)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center mb-16">
          {/* LEFT: Content */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-6 space-y-6"
          >
            <div className="flex items-center gap-2">
              <span className="w-8 h-0.5 rounded-full" style={{ background: "var(--k-blue)" }} />
              <span className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--k-blue)", fontFamily: "'Cabin', sans-serif" }}>
                Why Choose Us
              </span>
            </div>
            <h2 className="font-bold text-3xl sm:text-4xl md:text-5xl text-[var(--k-ink)] leading-tight" style={{ fontFamily: "'Cabin', sans-serif" }}>
              Built for enterprise reliability & operational speed
            </h2>
            <p className="text-base leading-relaxed" style={{ color: "var(--k-grey-600)", fontFamily: "'Inter', sans-serif" }}>
              We combine high-performance software engineering with deep domain compliance expertise. Our dedicated infrastructure keeps enterprise workflows running around the clock with zero friction.
            </p>
          </motion.div>

          {/* RIGHT: Image Visual Stack - Reliable Unsplash Enterprise Engineer Meeting Photo */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-6 relative"
          >
            <div className="relative z-10 rounded-2xl overflow-hidden shadow-2xl border" style={{ borderColor: "var(--k-grey-200)" }}>
              <img
                src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=800"
                alt="Enterprise Team Strategy & IT Collaboration Meeting"
                className="w-full h-[320px] sm:h-[380px] object-cover object-center"
              />
            </div>
            {/* Overlapping Floating Badge */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="absolute -bottom-6 -left-4 sm:-left-6 z-20 rounded-2xl p-5 shadow-2xl border flex items-center gap-4 max-w-xs"
              style={{ background: "var(--k-white)", borderColor: "var(--k-grey-200)" }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl shrink-0" style={{ background: "var(--k-blue-tint)", color: "var(--k-blue)" }}>
                ⚡
              </div>
              <div>
                <h4 className="font-bold text-sm leading-tight text-[var(--k-ink)]" style={{ fontFamily: "'Cabin', sans-serif" }}>High-Performance</h4>
                <p className="text-xs text-[var(--k-grey-600)] mt-0.5">Automated Workflows & SLA</p>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Features Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {whyChooseFeatures.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1, duration: 0.5 }}
                whileHover={{ y: -6, borderColor: "var(--k-blue)", boxShadow: "0 16px 36px -12px rgba(0,38,153,0.14)" }}
                className="p-8 rounded-xl border bg-white flex flex-col transition-all duration-300 group"
                style={{ borderColor: "var(--k-grey-200)" }}
              >
                <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-6 transition-colors duration-300" style={{ background: "var(--k-blue-tint)", color: "var(--k-blue)" }}>
                  <Icon size={28} className="group-hover:scale-110 transition-transform duration-300" />
                </div>
                <h3 className="font-bold text-lg mb-3 group-hover:text-[var(--k-blue)] transition-colors" style={{ fontFamily: "'Cabin', sans-serif", color: "var(--k-ink)" }}>
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed text-[var(--k-grey-600)] flex-1" style={{ fontFamily: "'Inter', sans-serif" }}>
                  {item.desc}
                </p>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
};

export const TechzaWorkProcess = () => {
  return (
    <section className="py-20 md:py-28 bg-white border-t border-b" style={{ borderColor: "var(--k-grey-200)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center mb-16">
          {/* LEFT: Image Visual Stack - Indian Professional Team Presentation Meeting */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-6 relative order-2 lg:order-1"
          >
            <div className="relative z-10 rounded-2xl overflow-hidden shadow-2xl border" style={{ borderColor: "var(--k-grey-200)" }}>
              <img
                src="https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&q=80&w=800"
                alt="Indian IT Engineers Collaboration & Work Process Meeting"
                className="w-full h-[320px] sm:h-[380px] object-cover object-center"
              />
            </div>
            {/* Overlapping Badge */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="absolute -bottom-6 -right-4 sm:-right-6 z-20 rounded-2xl p-5 shadow-2xl border flex items-center gap-4 max-w-xs"
              style={{ background: "var(--k-dark)", borderColor: "rgba(255,255,255,0.15)", color: "white" }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl shrink-0" style={{ background: "var(--k-blue)", color: "white" }}>
                04
              </div>
              <div>
                <h4 className="font-bold text-sm leading-tight" style={{ fontFamily: "'Cabin', sans-serif" }}>Streamlined Steps</h4>
                <p className="text-xs text-blue-200 mt-0.5">From Audit to 24/7 Support</p>
              </div>
            </motion.div>
          </motion.div>

          {/* RIGHT: Content */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="lg:col-span-6 space-y-6 order-1 lg:order-2"
          >
            <div className="flex items-center gap-2">
              <span className="w-8 h-0.5 rounded-full" style={{ background: "var(--k-blue)" }} />
              <span className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--k-blue)", fontFamily: "'Cabin', sans-serif" }}>
                Work Process
              </span>
            </div>
            <h2 className="font-bold text-3xl sm:text-4xl md:text-5xl text-[var(--k-ink)] leading-tight" style={{ fontFamily: "'Cabin', sans-serif" }}>
              How our work process is simplified
            </h2>
            <p className="text-base leading-relaxed" style={{ color: "var(--k-grey-600)", fontFamily: "'Inter', sans-serif" }}>
              We follow a proven 4-stage delivery pipeline that guarantees seamless migration, zero data loss, and complete compliance validation.
            </p>
          </motion.div>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {workSteps.map((step, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1, duration: 0.5 }}
              className="p-8 rounded-xl border relative bg-[var(--k-grey-50)] hover:bg-white transition-all duration-300 group hover:shadow-xl hover:border-[var(--k-blue)]"
              style={{ borderColor: "var(--k-grey-200)" }}
            >
              {/* Step Number Badge */}
              <div className="text-5xl font-black mb-4 transition-colors duration-300 opacity-30 group-hover:opacity-100 group-hover:text-[var(--k-blue)]" style={{ fontFamily: "'Cabin', sans-serif", color: "var(--k-grey-500)" }}>
                {step.step}
              </div>

              <h3 className="font-bold text-xl mb-3 text-[var(--k-ink)]" style={{ fontFamily: "'Cabin', sans-serif" }}>
                {step.title}
              </h3>

              <p className="text-sm leading-relaxed text-[var(--k-grey-600)]" style={{ fontFamily: "'Inter', sans-serif" }}>
                {step.desc}
              </p>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
};

export const TechzaTeamSection = () => {
  return (
    <section className="py-20 md:py-28" style={{ background: "var(--k-band-grey)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="w-8 h-0.5 rounded-full" style={{ background: "var(--k-blue)" }} />
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--k-blue)", fontFamily: "'Cabin', sans-serif" }}>
              Our Creative Team
            </span>
            <span className="w-8 h-0.5 rounded-full" style={{ background: "var(--k-blue)" }} />
          </div>
          <h2 className="font-bold text-3xl sm:text-4xl text-[var(--k-ink)]" style={{ fontFamily: "'Cabin', sans-serif" }}>
            Meet our IT professional team members
          </h2>
        </div>

        {/* Team Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {teamMembers.map((member, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1, duration: 0.5 }}
              whileHover={{ y: -6 }}
              className="rounded-xl overflow-hidden border bg-white shadow-sm transition-all duration-300 group"
              style={{ borderColor: "var(--k-grey-200)" }}
            >
              <div className="h-64 overflow-hidden relative">
                <img
                  src={member.avatar}
                  alt={member.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
              <div className="p-6 text-center">
                <h3 className="font-bold text-lg text-[var(--k-ink)] group-hover:text-[var(--k-blue)] transition-colors" style={{ fontFamily: "'Cabin', sans-serif" }}>
                  {member.name}
                </h3>
                <p className="text-xs font-semibold mt-1" style={{ color: "var(--k-blue)", fontFamily: "'Inter', sans-serif" }}>
                  {member.role}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
};

export const TechzaFAQSection = () => {
  const [openIdx, setOpenIdx] = useState(0);

  return (
    <section className="py-20 md:py-28 bg-white border-t border-b" style={{ borderColor: "var(--k-grey-200)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        
        <div className="grid lg:grid-cols-12 gap-12 items-start">
          {/* LEFT: Heading & Stock Image Stack */}
          <div className="lg:col-span-5 space-y-6">
            <div className="flex items-center gap-2">
              <span className="w-8 h-0.5 rounded-full" style={{ background: "var(--k-blue)" }} />
              <span className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--k-blue)", fontFamily: "'Cabin', sans-serif" }}>
                Need More Information
              </span>
            </div>
            <h2 className="font-bold text-3xl sm:text-4xl text-[var(--k-ink)]" style={{ fontFamily: "'Cabin', sans-serif" }}>
              Frequently asked questions
            </h2>
            <p className="text-sm leading-relaxed text-[var(--k-grey-600)]" style={{ fontFamily: "'Inter', sans-serif" }}>
              Have questions about deploying KAYAARA in your enterprise? Here are answers to common questions about security, integration, and migration.
            </p>

            {/* Rich Stock Image Card Stack */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative rounded-2xl overflow-hidden shadow-xl border mt-6 group"
              style={{ borderColor: "var(--k-grey-200)" }}
            >
              <img
                src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=800"
                alt="24/7 Enterprise Support Specialist"
                className="w-full h-56 object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--k-dark)]/90 via-transparent to-transparent flex items-end p-4">
                <div className="text-white flex items-center justify-between w-full">
                  <div>
                    <span className="text-[10px] font-bold text-blue-300 uppercase tracking-widest block" style={{ fontFamily: "'Cabin', sans-serif" }}>
                      Dedicated SLA
                    </span>
                    <span className="text-sm font-bold" style={{ fontFamily: "'Cabin', sans-serif" }}>
                      24/7 Support Engineering
                    </span>
                  </div>
                  <span className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-md">
                    💬
                  </span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* RIGHT: Accordion */}
          <div className="lg:col-span-7 space-y-4">
            {faqs.map((faq, idx) => {
              const isOpen = openIdx === idx;
              return (
                <div
                  key={idx}
                  className="border rounded-xl overflow-hidden transition-all duration-300"
                  style={{
                    borderColor: isOpen ? "var(--k-blue)" : "var(--k-grey-200)",
                    background: isOpen ? "var(--k-blue-tint)" : "white",
                  }}
                >
                  <button
                    onClick={() => setOpenIdx(isOpen ? -1 : idx)}
                    className="w-full p-6 text-left flex items-center justify-between font-bold text-base cursor-pointer"
                    style={{ fontFamily: "'Cabin', sans-serif", color: isOpen ? "var(--k-blue)" : "var(--k-ink)" }}
                  >
                    <span>{faq.q}</span>
                    <ChevronDown size={18} className={`transition-transform duration-300 shrink-0 ${isOpen ? "rotate-180" : ""}`} />
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="px-6 pb-6 text-sm leading-relaxed text-[var(--k-grey-600)]"
                        style={{ fontFamily: "'Inter', sans-serif" }}
                      >
                        {faq.a}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </section>
  );
};

export const TechzaTestimonials = () => {
  return (
    <section className="py-20 md:py-28" style={{ background: "var(--k-band-grey)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="w-8 h-0.5 rounded-full" style={{ background: "var(--k-blue)" }} />
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--k-blue)", fontFamily: "'Cabin', sans-serif" }}>
              Testimonials
            </span>
            <span className="w-8 h-0.5 rounded-full" style={{ background: "var(--k-blue)" }} />
          </div>
          <h2 className="font-bold text-3xl sm:text-4xl text-[var(--k-ink)]" style={{ fontFamily: "'Cabin', sans-serif" }}>
            See what people are saying about us
          </h2>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1, duration: 0.5 }}
              whileHover={{ y: -6, borderColor: "var(--k-blue)" }}
              className="p-8 rounded-2xl border bg-white flex flex-col justify-between shadow-sm transition-all duration-300"
              style={{ borderColor: "var(--k-grey-200)" }}
            >
              <div>
                {/* Rating Stars */}
                <div className="flex gap-1 mb-4 text-amber-400">
                  {[...Array(t.rating)].map((_, i) => (
                    <Star key={i} size={16} fill="currentColor" />
                  ))}
                </div>

                <Quote size={28} className="text-blue-200 mb-2 opacity-50" />

                <p className="text-sm leading-relaxed italic text-[var(--k-grey-700)] mb-6" style={{ fontFamily: "'Inter', sans-serif" }}>
                  "{t.quote}"
                </p>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t" style={{ borderColor: "var(--k-grey-100)" }}>
                <img src={t.avatar} alt={t.name} className="w-10 h-10 rounded-full object-cover" />
                <div>
                  <h4 className="font-bold text-sm text-[var(--k-ink)]" style={{ fontFamily: "'Cabin', sans-serif" }}>
                    {t.name}
                  </h4>
                  <p className="text-xs text-[var(--k-grey-500)]" style={{ fontFamily: "'Inter', sans-serif" }}>
                    {t.title}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
};
