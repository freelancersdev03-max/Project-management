import React from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

const CTA = () => {
  return (
    <section className="bg-slate-900 py-24 relative overflow-hidden">
      {/* Background Pattern / Decoration */}
      <div className="absolute inset-0 opacity-10" 
           style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} 
      />

      <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-3xl md:text-5xl font-bold text-white tracking-tight mb-6"
        >
          Ready to optimize your<br />workflow?
        </motion.h2>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-lg text-slate-300 font-light mb-10 max-w-2xl mx-auto"
        >
          Join the world's most innovative companies and transform how you manage projects. Get started in minutes.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-lg mx-auto mb-8"
        >
          <input 
            type="email" 
            placeholder="Enter your work email" 
            className="w-full sm:flex-1 bg-slate-800/80 border border-slate-700 text-white px-5 py-3.5 rounded-md focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors placeholder:text-slate-500"
          />
          <button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3.5 rounded-md transition-colors shadow-lg cursor-pointer">
            Get Started
          </button>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-400"
        >
          <span className="flex items-center gap-2">
            <Check size={16} className="text-slate-500" /> 14-day free trial
          </span>
          <span className="flex items-center gap-2">
            <Check size={16} className="text-slate-500" /> No credit card required
          </span>
        </motion.div>
      </div>
    </section>
  );
};

export default CTA;
