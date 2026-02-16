import React from "react";
import { Zap, BarChart3, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: Zap,
    title: "Process Automation",
    description:
      "Automate repetitive workflows and standard operating procedures to improve efficiency and reduce human error.",
  },
  {
    icon: BarChart3,
    title: "Strategic Planning",
    description:
      "Data-driven insights, KPIs, and structured roadmaps to execute transformation with clarity and control.",
  },
  {
    icon: MessageCircle,
    title: "Expert Collaboration",
    description:
      "Real-time communication and continuous expert guidance to keep teams aligned and accountable.",
  },
];

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const cardVariants = {
  hidden: {
    opacity: 0,
    y: 40,
  },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut",
    },
  },
};

const Features = () => {
  return (
    /* Apply darker top border to match SocialProof sectioning */
    <section className="bg-white border-t-2 border-blue-100">
      <div className="max-w-7xl mx-auto px-6 py-24">

        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-2xl mx-auto"
        >
          {/* Badge indicator for consistency */}
          <span className="text-[18px] font-bold tracking-[0.35em] text-blue-600 uppercase">
            Platform Capabilities
          </span>
          <h2 className="mt-4 text-4xl font-extrabold text-slate-900 tracking-tight">
            Designed to make business transformation effortless
          </h2>
          <p className="mt-4 text-[18px] text-slate-600 font-light">
            A structured platform built to drive execution, visibility,
            and measurable business outcomes.
          </p>
        </motion.div>

        {/* Feature Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-10"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={cardVariants}
              whileHover={{ y: -12 }}
              /* Applied bg-slate-50/50 and border-2 border-slate-300 to match SocialProof boxes */
              className="group relative rounded-3xl border-2 border-blue-100 bg-blue-50/40 p-10 shadow-md hover:shadow-2xl hover:shadow-blue-200/70 hover:bg-white transition-all duration-300"
            >
              {/* Icon - Swapped indigo for orange theme */}
              <div className="relative flex items-center justify-center h-16 w-16 rounded-2xl bg-blue-50 text-blue-700">
                <div className="absolute inset-0 rounded-2xl bg-blue-500 opacity-0 blur-lg group-hover:opacity-20 transition-opacity"></div>
                <feature.icon size={32} className="relative z-10" />
              </div>

              {/* Title */}
              <h3 className="mt-8 text-2xl font-black tracking-tighter text-slate-900 group-hover:text-blue-700 transition-colors">
                {feature.title}
              </h3>

              {/* Description */}
              <p className="mt-4 text-slate-500 font-light leading-relaxed text-[18px]">
                {feature.description}
              </p>

              {/* Micro CTA - Swapped indigo for orange */}
              <div className="mt-8 flex items-center gap-2 text-[12px] font-bold uppercase tracking-widest text-blue-700 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                Learn more <span>→</span>
              </div>
            </motion.div>
          ))}
        </motion.div>

      </div>
    </section>
  );
};

export default Features;