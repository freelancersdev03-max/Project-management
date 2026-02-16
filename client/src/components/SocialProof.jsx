import React from "react";

const SocialProof = () => {
  // Added the missing metrics definition to resolve the error
  const metrics = [
    { value: "25+", label: "Years of Experience" },
    { value: "500+", label: "Businesses Transformed" },
    { value: "15+", label: "Industry Domains" },
    { value: "98%", label: "Client Satisfaction" },
  ];

  return (
    <section className="bg-white border-t-2 border-blue-100">
      <div className="max-w-7xl mx-auto px-8 py-24">
        
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.map((metric, index) => (
            <div 
              key={index} 
              className="bg-blue-50/40 border-2 border-blue-100 p-10 rounded-3xl text-center transition-all duration-300 hover:shadow-xl hover:shadow-blue-200/60 hover:bg-white group"
            >
              <p className="text-5xl font-black text-slate-900 tracking-tighter group-hover:text-blue-700 transition-colors">
                {metric.value}
              </p>
              <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                {metric.label}
              </p>
            </div>
          ))}
        </div>

        {/* Industry Trust Section */}
        <div className="mt-24 pt-12 border-t-2 border-blue-100">
          <div className="flex flex-col md:flex-row items-center justify-between gap-10">
            <div className="max-w-xs">
              <span className="text-[16px] font-bold tracking-[0.3em] text-blue-600 uppercase">
                Trusted Expertise
              </span>
              <h3 className="mt-2 text-xl font-bold text-slate-900 leading-tight">
                Delivering excellence across diverse sectors.
              </h3>
            </div>

            {/* Logos (text placeholders) */}
            <div className="mt-8 flex flex-wrap justify-center gap-x-12 gap-y-6 text-slate-400 font-semibold">
              <span>Manufacturing</span>
              <span>IT Services</span>
              <span>Healthcare</span>
              <span>Education</span>
              <span>Infrastructure</span>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};

export default SocialProof;