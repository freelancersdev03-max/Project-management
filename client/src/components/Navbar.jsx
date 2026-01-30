import React from "react";
import { useNavigate } from "react-router-dom";

// Added 'hideLogin' prop to the component
const Navbar = ({ hideLogin = false }) => {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-100 shadow-sm">
      {/* TOP WHITE BAR */}
      <div className="max-w-7xl mx-auto px-6">
        <div className="h-24 flex items-center justify-between">

          {/* LEFT: Logos */}
          <div className="flex items-center gap-6">
            <img
              src="/HqeplLOGO.png"
              alt="Here Quality Excellence"
              className="h-16 w-auto object-contain"
            />
            <div className="h-10 w-[1px] bg-slate-200 hidden md:block"></div>
            <img
              src="/25YEARS.webp"
              alt="25 Years of Excellence"
              className="h-14 w-auto object-contain"
            />
          </div>

          {/* CENTER: Improved Title Design */}
          <div className="flex flex-col items-center">
            <h1 className="flex items-center gap-2">
              <span className="text-slate-900 font-extrabold tracking-tight text-2xl md:text-3xl italic">
                PROJECT
              </span>
              <span className="text-[#F58A4B] font-light tracking-[0.2em] text-2xl md:text-3xl uppercase">
                Management
              </span>
            </h1>
            <div className="flex items-center gap-2 w-full">
              <div className="h-[1px] flex-1 bg-linear-to-r from-transparent to-slate-200"></div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.5em] whitespace-nowrap">
                System Excellence
              </span>
              <div className="h-[1px] flex-1 bg-linear-to-l from-transparent to-slate-200"></div>
            </div>
          </div>
        </div>
      </div>

      {/* ORANGE PILL NAVBAR */}
      <div className="max-w-7xl mx-auto px-6 pb-6">
        <div className="mx-auto flex items-center justify-between bg-[#F58A4B] rounded-full px-2 py-2 shadow-xl shadow-orange-200/50">

          {/* NAV LINKS */}
          <nav className="flex items-center gap-1">
            <a href="/" className="bg-white text-[#F58A4B] px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm">
              Home
            </a>
            <div className="flex items-center gap-4 px-6 text-white text-[11px] font-bold uppercase tracking-widest">
              {["About", "Solutions", "Industries", "Media", "Contact"].map((item) => (
                <a key={item} href={`#${item.toLowerCase()}`} className="hover:opacity-80 transition-opacity">
                  {item}
                </a>
              ))}
            </div>
          </nav>

          {/* CTA: Wrapped in a condition */}
          {!hideLogin && (
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-3 bg-slate-900 text-white px-8 py-3 rounded-full text-xs font-bold uppercase tracking-[0.15em] hover:bg-black transition-all group"
            >
              Login
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </button>
          )}

          {/* Optional: Show a Logout button if hiddenLogin is true */}
          {hideLogin && (
            <button
              onClick={() => {
                // Clear all stored credentials
                localStorage.clear(); // OR localStorage.removeItem("token") if you only store token
                // Navigate to login page
                navigate('/login');
              }}
              className="bg-white/20 text-white hover:bg-white/30 px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest transition-all"
            >
              Logout
            </button>
          )}

        </div>
      </div>
    </header>
  );
};

export default Navbar;