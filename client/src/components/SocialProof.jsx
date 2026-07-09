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
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.15,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 32, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24,
    },
  },
};

const SocialProof = () => {
  return (
    <section id="industries" className="k-band-white k-band-pad border-t border-b" style={{ borderColor: "var(--k-grey-200)" }}>
      <div className="max-w-7xl mx-auto py-8 md:py-16">

        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center max-w-2xl mx-auto mb-12 md:mb-16"
        >
          <motion.span
            className="text-[10px] font-semibold uppercase tracking-[0.22em]"
            style={{ color: "var(--k-blue)" }}
            initial={{ opacity: 0, letterSpacing: "0.4em" }}
            whileInView={{ opacity: 1, letterSpacing: "0.22em" }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <span
              className="inline-block w-[5px] h-[5px] rounded-full mr-2 align-middle"
              style={{ background: "var(--k-blue)" }}
            />
            Industry Expertise
          </motion.span>
          <h2 className="mt-3 text-2xl md:text-4xl font-bold tracking-tight" style={{ color: "var(--k-ink)" }}>
            Delivering excellence across diverse sectors
          </h2>
          <p className="mt-4 text-sm md:text-lg font-light leading-relaxed" style={{ color: "var(--k-grey-700)" }}>
            Custom consulting frameworks and software tooling tailored to the operational models of your industry.
          </p>
        </motion.div>

        {/* Industry Cards Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6"
        >
          {industries.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={index}
                variants={cardVariants}
                whileHover={{
                  y: -6,
                  scale: 1.02,
                  borderColor: "var(--k-blue)",
                  boxShadow: "0 16px 40px -12px rgba(0, 134, 255, 0.15)",
                  transition: { type: "spring", stiffness: 400, damping: 20 },
                }}
                whileTap={{ scale: 0.98 }}
                className="k-card-grey p-6 flex flex-col justify-between cursor-pointer rounded-2xl border transition-all"
                style={{ background: "var(--k-band-grey)", borderColor: "var(--k-grey-200)" }}
              >
                <div>
                  <motion.div
                    className="flex items-center justify-center h-12 w-12 rounded-xl mb-6"
                    style={{ background: "var(--k-blue-tint)", color: "var(--k-blue)" }}
                    whileHover={{ rotate: [0, -8, 8, 0], transition: { duration: 0.5 } }}
                  >
                    <Icon size={24} />
                  </motion.div>
                  <h3 className="text-lg font-bold tracking-tight mb-2" style={{ color: "var(--k-ink)" }}>
                    {item.title}
                  </h3>
                  <p className="text-xs font-light leading-relaxed" style={{ color: "var(--k-grey-700)" }}>
                    {item.description}
                  </p>
                </div>

                <motion.div
                  className="mt-6 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: "var(--k-blue)" }}
                  whileHover={{ x: 4 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  Explore solutions <span>→</span>
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
