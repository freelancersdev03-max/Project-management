import React from 'react';
import { motion } from 'framer-motion';
import { Award, CheckCircle, TrendingUp } from 'lucide-react';
import AnimatedNumber from './kayaara/AnimatedNumber';

const BentoStats = () => {
  return (
    <section className="k-band-grey k-band-pad">
      <div className="max-w-7xl mx-auto py-6 md:py-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-4 h-auto md:min-h-[500px]"
        >

          {/* Large Highlight Box */}
          <motion.div
            whileHover={{ y: -4 }}
            className="md:col-span-2 md:row-span-2 k-card p-10 flex flex-col justify-between"
          >
            <div>
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6"
                style={{ background: "var(--k-blue-tint)" }}
              >
                <Award style={{ color: "var(--k-blue)" }} />
              </div>
              <h3 className="text-4xl font-bold tracking-tight leading-tight" style={{ color: "var(--k-ink)" }}>
                25 Years of <br />
                <span style={{ color: "var(--k-blue)" }}>Management Excellence</span>
              </h3>
            </div>
            <p className="text-lg leading-relaxed mt-6" style={{ color: "var(--k-grey-500)" }}>
              Founded on the principle of total transformation, we provide the strategies that titans like Aditya Birla and L&T trust.
            </p>
          </motion.div>

          {/* Small Highlight: Projects */}
          <motion.div
            whileHover={{ y: -4 }}
            className="md:col-span-2 rounded-[2.5rem] p-8 flex items-center justify-between overflow-hidden relative"
            style={{ background: "var(--k-ink)", color: "var(--k-white)" }}
          >
            <div className="relative z-10">
              <p className="k-eyebrow mb-2" style={{ color: "var(--k-blue-light)" }}>Global Impact</p>
              <h4 className="text-5xl font-bold tabular-nums">
                <AnimatedNumber value={500} suffix="+" />
              </h4>
              <p style={{ color: "var(--k-grey-300)" }}>Successful Business Transformations</p>
            </div>
            <TrendingUp size={100} className="absolute -right-4 -bottom-4 opacity-10" style={{ color: "var(--k-blue-light)" }} />
          </motion.div>

          {/* Small Highlight: Support */}
          <motion.div
            whileHover={{ y: -4 }}
            className="rounded-[2.5rem] p-8 flex flex-col justify-center items-center text-center transition-colors"
            style={{ background: "var(--k-blue)" }}
          >
            <CheckCircle size={40} style={{ color: "var(--k-white)" }} className="mb-4" />
            <p className="font-bold leading-tight" style={{ color: "var(--k-white)" }}>100% Execution Support</p>
          </motion.div>

          {/* Small Highlight: Motto */}
          <motion.div whileHover={{ y: -4 }} className="k-card flex items-center justify-center p-8">
            <p className="font-medium italic text-center" style={{ color: "var(--k-grey-700)" }}>
              "Your One-Stop Growth Solution"
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default BentoStats;
