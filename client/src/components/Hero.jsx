import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Play, ArrowRight, Activity } from "lucide-react";
import dashboard from "../assets/image copy.png"; // Using the large dashboard image

const Hero = () => {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden bg-white min-h-[90vh] flex flex-col justify-center">
      {/* Background Subtle Gradient */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-slate-50 to-transparent pointer-events-none" />

      <div className="max-w-[1440px] w-full mx-auto px-6 lg:px-12 py-12 lg:py-0 grid lg:grid-cols-2 gap-12 lg:gap-8 items-center relative z-10">
        
        {/* LEFT: Text Content */}
        <div className="lg:pr-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            {/* Version Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 mb-6">
              <Activity size={14} className="text-blue-500" />
              <span className="text-[10px] font-bold tracking-widest uppercase">
                Introducing Flowstate V3.0
              </span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-7xl font-extrabold text-slate-900 leading-[1.05] tracking-tight"
          >
            The Next<br />Generation of<br />
            <span className="text-blue-600 block mt-2">Project Innovation</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
            className="mt-6 text-lg lg:text-xl text-slate-500 font-light leading-relaxed max-w-lg"
          >
            Kayaara Innovation delivers a precision-engineered PMS designed for high-performance teams. Achieve absolute clarity, streamline complex workflows, and launch faster.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.3 }}
            className="mt-8 flex flex-col sm:flex-row items-center gap-4"
          >
            <button
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white px-8 py-3.5 rounded-md font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 cursor-pointer"
            >
              Start for Free <ArrowRight size={18} />
            </button>
            <button
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white text-slate-700 border border-slate-200 px-8 py-3.5 rounded-md font-semibold hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
            >
              <Play size={18} className="text-slate-500" /> View Demo
            </button>
          </motion.div>

          {/* Social Proof Avatars */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="mt-12 flex items-center gap-4"
          >
            <div className="flex -space-x-3">
              {[
                "https://i.pravatar.cc/100?img=33",
                "https://i.pravatar.cc/100?img=47",
                "https://i.pravatar.cc/100?img=12"
              ].map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt="User avatar"
                  className="w-10 h-10 rounded-full border-2 border-white bg-slate-200 object-cover"
                />
              ))}
            </div>
            <p className="text-sm font-medium text-slate-500">
              Trusted by 2,000+ engineering teams
            </p>
          </motion.div>
        </div>

        {/* RIGHT: Visual */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
          className="relative lg:h-[800px] flex items-center"
        >
          {/* Subtle glow behind image */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-blue-100 rounded-full blur-[100px] opacity-60"></div>
          
          <img
            src={dashboard}
            alt="Dashboard Preview"
            className="relative z-10 w-full h-auto object-contain drop-shadow-2xl rounded-xl border border-slate-100/50"
          />
        </motion.div>

      </div>
    </section>
  );
};

export default Hero;