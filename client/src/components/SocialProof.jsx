import React from "react";
import { motion } from "framer-motion";
import { Factory, Laptop, Activity, GraduationCap, Building } from "lucide-react";

const industries = [
  {
    icon: Factory,
    title: "Manufacturing",
    description: "Optimizing supply chain operations, factory workflows, and standard operating procedures.",
  },
  {
    icon: Laptop,
    title: "IT Services",
    description: "Digital product strategy, agile software development, and modern cloud infrastructures.",
  },
  {
    icon: Activity,
    title: "Healthcare",
    description: "Streamlining patient care coordination, clinical workflows, and data management.",
  },
  {
    icon: GraduationCap,
    title: "Education",
    description: "Transforming learning management, campus operations, and student engagement models.",
  },
  {
    icon: Building,
    title: "Infrastructure",
    description: "Managing complex construction cycles, cross-functional planning, and resource tracking.",
  },
];

const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 280, damping: 24 },
  },
};

const SocialProof = () => {
  return (
    <section
      id="industries"
      className="border-t border-b"
      style={{ background: "var(--k-band-grey)", borderColor: "var(--k-grey-200)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-16 md:py-24">

        {/* ── Section Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center max-w-2xl mx-auto mb-12 md:mb-16"
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
              Industry Expertise
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
              fontSize: "clamp(1.6rem, 3.5vw, 2.5rem)",
            }}
          >
            Delivering excellence across diverse sectors
          </h2>
          <p
            className="leading-relaxed"
            style={{
              fontFamily: "'Inter', sans-serif",
              color: "var(--k-grey-600)",
              fontSize: "clamp(0.875rem, 1.6vw, 1rem)",
              fontWeight: 400,
            }}
          >
            Custom consulting frameworks and software tooling tailored to the operational models of your industry.
          </p>
        </motion.div>

        {/* ── Industry Cards Grid ── */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 md:gap-6"
        >
          {industries.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={index}
                variants={cardVariants}
                whileHover={{
                  y: -6,
                  boxShadow: "0 16px 40px -12px rgba(0,38,153,0.15)",
                  borderColor: "var(--k-blue)",
                  transition: { type: "spring", stiffness: 400, damping: 20 },
                }}
                whileTap={{ scale: 0.98 }}
                className="group cursor-pointer flex flex-col"
                style={{
                  background: "var(--k-white)",
                  border: "1px solid var(--k-grey-200)",
                  borderRadius: "8px",
                  padding: "32px 24px",
                  transition: "border-color 0.25s ease",
                }}
              >
                {/* Icon box — Techza top-centered icon style */}
                <div
                  className="flex items-center justify-center mb-5 transition-colors duration-300"
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "8px",
                    background: "var(--k-blue-tint)",
                  }}
                >
                  <Icon
                    size={26}
                    style={{ color: "var(--k-blue)" }}
                    className="transition-transform duration-300 group-hover:scale-110"
                  />
                </div>

                {/* Title */}
                <h3
                  className="font-bold mb-3 transition-colors duration-300 group-hover:text-[var(--k-blue)]"
                  style={{
                    fontFamily: "'Cabin', sans-serif",
                    color: "var(--k-ink)",
                    fontSize: "1.05rem",
                  }}
                >
                  {item.title}
                </h3>

                {/* Description */}
                <p
                  className="leading-relaxed flex-1 text-sm"
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    color: "var(--k-grey-600)",
                    fontWeight: 400,
                  }}
                >
                  {item.description}
                </p>

                {/* Read More link — Techza style */}
                <motion.div
                  className="mt-5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-colors duration-300"
                  style={{
                    color: "var(--k-blue)",
                    fontFamily: "'Cabin', sans-serif",
                    letterSpacing: "0.08em",
                  }}
                  whileHover={{ x: 4 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  Explore solutions
                  <span
                    className="inline-flex items-center justify-center w-5 h-5 rounded-full transition-all duration-300"
                    style={{ background: "var(--k-blue-tint)" }}
                  >
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                      <path d="M1 4h6M4 1l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </motion.div>
              </motion.div>
            );
          })}
        </motion.div>

      </div>
    </section>
  );
};

export default SocialProof;
