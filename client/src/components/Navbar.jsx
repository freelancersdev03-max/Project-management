import React from "react";
import { useNavigate } from "react-router-dom";

const Navbar = ({ hideLogin = false }) => {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-100">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-12">
        <div className="h-20 flex items-center justify-between">

          {/* LEFT: Logo */}
          <div className="flex items-center flex-shrink-0 cursor-pointer" onClick={() => navigate('/')}>
            <img
              src="/logo/1500x1500.jpg.svg"
              alt="Kayaara"
              className="h-8 md:h-9 w-auto object-contain"
            />
          </div>

          {/* CENTER: Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <a href="#features" className="text-blue-600 border-b-2 border-blue-600 pb-1">Features</a>
            <a href="#solutions" className="hover:text-slate-900 transition-colors pb-1">Solutions</a>
            <a href="#pricing" className="hover:text-slate-900 transition-colors pb-1">Pricing</a>
          </nav>

          {/* RIGHT: Actions */}
          <div className="flex items-center gap-6">
            {!hideLogin ? (
              <>
                <button
                  onClick={() => navigate('/login')}
                  className="hidden md:block text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  Login
                </button>
                <button
                  onClick={() => navigate('/login')}
                  className="bg-blue-600 text-white px-6 py-2.5 rounded-md text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm cursor-pointer"
                >
                  Get Started
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  localStorage.clear();
                  navigate('/login');
                }}
                className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              >
                Logout
              </button>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};

export default Navbar;