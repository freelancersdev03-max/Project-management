import React from 'react';
import { Award, CheckCircle, TrendingUp } from 'lucide-react';

const BentoStats = () => {
  return (
    <section className="py-20 px-6 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-4 h-auto md:min-h-[500px]">

        {/* Large Highlight Box */}
        <div className="md:col-span-2 md:row-span-2 bg-white dark:bg-slate-900 rounded-[2.5rem] p-10 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between group hover:border-emerald-200 dark:hover:border-emerald-500/30 transition-all duration-500">
          <div>
            <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6">
              <Award className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-4xl font-bold tracking-tighter text-slate-900 dark:text-white leading-tight">
              25 Years of <br />
              <span className="text-emerald-500 italic font-serif">Management Excellence</span>
            </h3>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed mt-6">
            Founded on the principle of total transformation, we provide the strategies that titans like Aditya Birla and L&T trust.
          </p>
        </div>

        {/* Small Highlight: Projects */}
        <div className="md:col-span-2 bg-slate-900 dark:bg-slate-800 rounded-[2.5rem] p-8 flex items-center justify-between text-white overflow-hidden relative">
          <div className="relative z-10">
            <p className="text-emerald-400 font-bold uppercase tracking-widest text-xs mb-2">Global Impact</p>
            <h4 className="text-5xl font-black">500+</h4>
            <p className="text-slate-400">Successful Business Transformations</p>
          </div>
          <TrendingUp size={100} className="absolute -right-4 -bottom-4 text-emerald-500/10" />
        </div>

        {/* Small Highlight: Support */}
        <div className="bg-emerald-500 rounded-[2.5rem] p-8 flex flex-col justify-center items-center text-center group hover:bg-emerald-400 transition-colors">
          <CheckCircle size={40} className="text-emerald-950 mb-4" />
          <p className="font-bold text-emerald-950 leading-tight">100% Execution Support</p>
        </div>

        {/* Small Highlight: Motto */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 flex items-center justify-center">
          <p className="text-slate-600 dark:text-slate-400 font-medium italic text-center">
            "Your One-Stop Growth Solution"
          </p>
        </div>
      </div>
    </section>
  );
};

export default BentoStats;