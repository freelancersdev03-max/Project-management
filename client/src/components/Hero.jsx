import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; // 1. Import the hook
import dashboard from "../assets/dashboard.jpg";

const Hero = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate(); // 2. Initialize the navigate function

  const services = [
    {
      title: "Task Manager",
      desc: "Streamline daily operations with automated task assignment and tracking.",
      icon: "📋",
    },
    {
      title: "FMS",
      desc: "Financial Management System to track project budgets and expenditures.",
      icon: "💰",
    },
    {
      title: "Project Management",
      desc: "End-to-end planning, execution, and monitoring of complex business goals.",
      icon: "🏗️",
    },
    {
      title: "Project Coordinator",
      desc: "Expert handholding to align cross-functional teams and communication.",
      icon: "🤝",
    },
  ];

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-white">
      <div className="absolute -top-40 -right-40 h-[420px] w-[420px] rounded-full bg-blue-100 blur-3xl opacity-60" />
      <div className="absolute -bottom-40 -left-40 h-[420px] w-[420px] rounded-full bg-sky-100 blur-3xl opacity-60" />
      <div className="max-w-[1440px] mx-auto px-8 lg:px-12 pt-4 pb-28 grid lg:grid-cols-12 gap-12 items-center">
        
        {/* LEFT: Text */}
        <div className="lg:col-span-5 relative z-10">
          <h1 className="text-5xl md:text-7xl font-extrabold leading-[1.05] text-slate-900">
            Total Business
            <span className="block text-blue-700">
              Transformation Simplified
            </span>
          </h1>

          <p className="mt-8 max-w-xl text-[22px] text-slate-600 leading-relaxed font-light">
            One integrated consulting platform to identify gaps, execute strategy,
            and scale sustainable growth with expert handholding.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-5">
            {/* 3. Updated this button to trigger navigation */}
            <button
              onClick={() => navigate('/login')} 
              className="inline-flex items-center justify-center rounded-full px-10 py-4 text-base font-semibold text-white bg-gradient-to-r from-blue-700 to-sky-500 shadow-lg shadow-blue-200/60 hover:opacity-95 transition active:scale-95 cursor-pointer"
            >
              Get Growth Consultation
            </button>
            
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center justify-center rounded-full px-6 py-4 text-base font-semibold text-slate-700 border border-blue-200 hover:bg-blue-50 transition active:scale-95"
            >
              Explore Services
            </button>
          </div>
        </div>

        {/* RIGHT: Visual */}
        <div className="relative lg:col-span-7 w-full lg:pl-8">
          <div className="absolute -inset-10 bg-gradient-to-tr from-blue-50 to-sky-200/50 rounded-3xl blur-3xl opacity-70"></div>
          <div className="relative group">
            <img
              src={dashboard}
              alt="Business dashboard preview"
              className="relative w-full h-auto rounded-[2.5rem] shadow-[0_50px_100px_-20px_rgba(15,23,42,0.18)] border border-slate-100 transition-all duration-700 lg:scale-110 lg:translate-x-6 group-hover:scale-[1.12]"
            />
          </div>
        </div>
      </div>

      {/* SERVICE MODAL OVERLAY */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden p-8 md:p-12 animate-in fade-in zoom-in duration-500">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Our Specialized Services</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-900 text-2xl transition-colors">✕</button>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {services.map((service, index) => (
                <div key={index} className="p-6 rounded-2xl border border-blue-100 bg-blue-50/40 hover:border-blue-300 hover:bg-white hover:shadow-xl hover:shadow-blue-500/10 transition-all group">
                  <div className="text-4xl mb-4">{service.icon}</div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-blue-700">{service.title}</h3>
                  <p className="text-slate-600 text-[18px] leading-relaxed">{service.desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-10 text-center">
              <button onClick={() => setIsModalOpen(false)} className="bg-slate-900 text-white px-10 py-3 rounded-full font-semibold hover:bg-slate-950 transition-all">Close Window</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default Hero;