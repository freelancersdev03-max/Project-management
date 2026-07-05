import React from "react";
import { motion } from "framer-motion";
import { Users, LineChart } from "lucide-react";
import featureImg from "../assets/image.png"; // Second image for the feature block

const Features = () => {
  return (
    <section id="features" className="bg-slate-50 py-24">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-12">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
            Engineered for Performance
          </h2>
          <p className="mt-4 text-base md:text-lg text-slate-500 font-light leading-relaxed max-w-2xl mx-auto">
            Experience a professional-grade instrument designed to maximize information surfacing and minimize cognitive load.
          </p>
        </motion.div>

        {/* Feature Grid */}
        <div className="grid lg:grid-cols-12 gap-6">
          
          {/* LEFT COLUMN: Large Feature */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="lg:col-span-7 bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-slate-100 flex flex-col justify-between"
          >
            <div className="bg-slate-100/50 rounded-2xl mb-12 flex items-center justify-center p-6 min-h-[300px]">
              <img
                src={featureImg}
                alt="Task Management Preview"
                className="w-full max-w-lg object-contain drop-shadow-xl"
              />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Task Management</h3>
              <p className="text-slate-500 font-light leading-relaxed text-lg">
                Organize complex workstreams with hierarchical task lists, custom statuses, and precision scheduling. Gain absolute control over your project's granular details.
              </p>
            </div>
          </motion.div>

          {/* RIGHT COLUMN: Stacked Features */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            
            {/* Top Right Feature */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-slate-100 flex-1 flex flex-col justify-center"
            >
              <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center mb-6">
                <Users className="text-blue-600" size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Team Collaboration</h3>
              <p className="text-slate-500 font-light leading-relaxed">
                Seamless communication hub for global teams. Real-time notifications, thread-based discussions, and integrated resource management in one unified interface.
              </p>
            </motion.div>

            {/* Bottom Right Feature */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-slate-100 flex-1 flex flex-col justify-center"
            >
              <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center mb-6">
                <LineChart className="text-blue-600" size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Real-time Analytics</h3>
              <p className="text-slate-500 font-light leading-relaxed">
                Turn raw data into actionable insights with live dashboards. Track velocity, burndown rates, and project health metrics with pixel-perfect precision.
              </p>
            </motion.div>

          </div>
        </div>

      </div>
    </section>
  );
};

export default Features;