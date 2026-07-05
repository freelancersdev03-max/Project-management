import React from "react";
import { useNavigate } from "react-router-dom";

// Added 'hideLogin' prop to the component
const Navbar = ({ hideLogin = false }) => {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-200/60 shadow-sm">
      {/* TOP WHITE BAR */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6">
        <div className="h-14 sm:h-16 md:h-24 flex items-center justify-between gap-2 sm:gap-4">

          {/* LEFT: Logos */}
          <div className="flex items-center gap-2 sm:gap-4 md:gap-6 flex-shrink-0">
            <img
              src="/HqeplLOGO.png"
              alt="Here Quality Excellence"
              className="h-8 sm:h-10 md:h-16 w-auto object-contain"
            />
            <div className="h-8 sm:h-10 md:h-10 w-[1px] bg-slate-200 hidden md:block"></div>
            <img
              src="/25YEARS.webp"
              alt="25 Years of Excellence"
              className="h-8 sm:h-10 md:h-14 w-auto object-contain hidden sm:block"
            />
          </div>

          {/* CENTER: Improved Title Design */}
          <div className="hidden xl:flex flex-col items-center flex-1">
            <h1 className="flex items-center gap-1 sm:gap-2">
              <span className="text-slate-900 font-extrabold tracking-tight text-lg sm:text-2xl md:text-3xl italic">
                PROJECT
              </span>
              <span className="text-blue-400 font-light tracking-[0.2em] text-lg sm:text-2xl md:text-3xl uppercase">
                Management
              </span>
            </h1>
            <div className="flex items-center gap-1 sm:gap-2 w-full">
              <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-blue-200 to-transparent"></div>
              <span className="text-[8px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-[0.5em] whitespace-nowrap">
                System Excellence
              </span>
              <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-blue-200 to-transparent"></div>
            </div>
          </div>
        </div>
      </div>

      {/* ORANGE PILL NAVBAR */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 pb-2 sm:pb-3 md:pb-6">
        <div className="mx-auto flex items-center justify-between bg-gradient-to-r from-sky-800 via-blue-600 to-sky-800 rounded-full px-1.5 sm:px-2 md:px-2 py-1 sm:py-1.5 md:py-2 shadow-xl shadow-blue-200/60 gap-1 sm:gap-2 flex-wrap sm:flex-nowrap">

          {/* NAV LINKS */}
          {/* Only show nav links if NOT logged in (hideLogin is false) */}
          {!hideLogin && (
            <nav className="flex items-center gap-0.5 sm:gap-1">
              <a href="/" className="bg-white text-blue-700 px-2.5 sm:px-4 md:px-6 py-1.5 sm:py-2 md:py-2.5 rounded-full text-[9px] sm:text-[10px] md:text-xs font-bold uppercase tracking-wider shadow-sm whitespace-nowrap">
                Home
              </a>
              <div className="hidden md:flex items-center gap-4 lg:gap-10 px-3 lg:px-6 text-white/95 text-[10px] lg:text-[11px] font-bold uppercase tracking-widest">
                {["About", "Industries", "Media"].map((item) => (
                  <a key={item} href={`#${item.toLowerCase()}`} className="hover:opacity-80 transition-opacity whitespace-nowrap">
                    {item}
                  </a>
                ))}
                <button
                  onClick={() => navigate('/contact')}
                  className="hover:opacity-80 transition-opacity cursor-pointer bg-transparent border-none p-0 text-white/95 font-bold uppercase tracking-widest whitespace-nowrap"
                >
                  Contact
                </button>
              </div>
            </nav>
          )}

          {/* CTA: Wrapped in a condition */}
          {!hideLogin && (
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-1.5 sm:gap-2 md:gap-3 bg-white text-blue-700 px-3 sm:px-5 md:px-8 py-1.5 sm:py-2 md:py-3 rounded-full text-[9px] sm:text-[10px] md:text-xs font-bold uppercase tracking-[0.15em] hover:bg-blue-50 transition-all group whitespace-nowrap"
            >
              Login
              <span className="group-hover:translate-x-1 transition-transform hidden sm:inline">→</span>
            </button>
          )}

          {/* Optional: Show a Logout button if hiddenLogin is true */}
          {hideLogin && (
            <>
              {/* Spacer to push Logout to the right */}
              <div className="hidden md:block flex-1"></div>
              <button
                onClick={() => {
                  // Clear all stored credentials
                  localStorage.clear(); // OR localStorage.removeItem("token") if you only store token
                  // Navigate to login page
                  navigate('/login');
                }}
                className="bg-white/15 text-white hover:bg-white/25 px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 md:py-3 rounded-full text-[9px] sm:text-[10px] md:text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap"
              >
                Logout
              </button>
            </>
          )}

        </div>
      </div>
    </header>
  );
};

export default Navbar;