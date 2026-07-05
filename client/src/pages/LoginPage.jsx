import React, { useState } from "react";
import { ChevronRight, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../api";
import featureImg from "../assets/image copy.png"; // Using the nice dashboard preview

const LOGIN_ENDPOINTS = {
  login: "/login/",
};

const LoginPage = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError("");
    setIsSubmitting(true);

    try {
      // ✅ Login API call
      const response = await api.post(LOGIN_ENDPOINTS.login, {
        email,
        password,
      });
      
      const { data } = response;
      console.log("[LOGIN] Response data:", data); // Debug log

      // Store tokens
      if (data.access) {
        localStorage.setItem("access_token", data.access);
        localStorage.setItem("token", data.access);
        console.log("[LOGIN] Token stored successfully");
      } else {
        console.error("[LOGIN] No access token in response!");
        throw new Error("Login failed: No access token received");
      }

      if (data.refresh) {
        localStorage.setItem("refresh_token", data.refresh);
      }

      localStorage.setItem("role", data.role);

      // Store user info
      localStorage.setItem("username", data.username || "Admin User");
      localStorage.setItem("email", data.email || email);

      console.log("[LOGIN] All tokens and user info stored. Role:", data.role);

      // Role-based navigation
      const role = data.role?.toUpperCase();

      if (role === "ADMIN") navigate("/admin");
      else if (role === "HQEPL") navigate("/hqepl");
      else if (role === "MLS") navigate("/mls");
      else if (role === "EMPLOYEE") navigate("/employee");
      else if (role === "SGM") navigate("/sgm");
      else if (role === "SENIOR") navigate("/senior"); // Senior (external team manager) has dedicated interface
      else if (role === "CLIENT") navigate("/client");
      else if (role === "EXTERNAL") navigate("/employee");
      else navigate("/");

    } catch (err) {
      console.error("Login Error:", err);

      const status = err.response?.status;
      const responseData = err.response?.data;

      let errorMessage = "Invalid email or password";

      if (status >= 500) {
        errorMessage = "Server error during login. Please try again in a moment.";
      } else if (responseData?.detail) {
        errorMessage = responseData.detail;
      } else if (responseData?.message) {
        errorMessage = responseData.message;
      }

      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex antialiased font-sans selection:bg-blue-100 selection:text-blue-900 overflow-hidden">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full flex"
      >
        {/* Left Panel */}
        <div className="hidden lg:flex lg:w-1/2 bg-blue-600 p-10 xl:p-16 flex-col justify-between relative text-white">
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 opacity-50 blur-[100px] rounded-full"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-sky-400 opacity-40 blur-[80px] rounded-full"></div>

          <div className="relative z-10">
            <span className="inline-flex items-center gap-2 text-[10px] font-bold tracking-widest text-blue-100 uppercase border border-blue-400/30 bg-blue-500/20 px-3 py-1.5 rounded-full mb-8">
              Kayaara Innovation
            </span>

            <h2 className="text-4xl xl:text-5xl font-extrabold leading-[1.15] tracking-tight">
              Empowering your <br />
              <span className="text-blue-200">Transformation.</span>
            </h2>
            <p className="mt-4 text-blue-100 font-light leading-relaxed max-w-sm">
              Log in to access your high-performance workspace and streamline your complex workflows.
            </p>
          </div>

          <div className="relative z-10 text-[10px] font-bold tracking-widest uppercase text-blue-200/60">
            © {new Date().getFullYear()} Kayaara Innovation
          </div>
          
          {/* Subtle dashboard image overlay */}
          <img 
            src={featureImg} 
            alt="Dashboard" 
            className="absolute -bottom-20 -right-20 w-[120%] opacity-20 transform rotate-12 drop-shadow-2xl mix-blend-overlay"
          />
        </div>

        {/* Right Panel */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center bg-white relative p-8 sm:p-12">
          <Link
            to="/"
            className="absolute top-8 left-8 sm:top-12 sm:left-12 flex items-center gap-2 text-slate-400 hover:text-blue-600 transition-colors font-bold uppercase text-[10px] tracking-widest z-10"
          >
            <ArrowLeft size={16} /> Back
          </Link>

          <div className="w-full max-w-md mx-auto">
            <div className="mb-10 text-center lg:text-left">
            <img src="/logo/1500x1500.jpg.svg" alt="Kayaara" className="h-10 w-auto mb-8 mx-auto lg:mx-0 object-contain" />
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Welcome back
            </h1>
            <p className="text-slate-500 font-light mt-2">
              Please enter your details to sign in.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleLogin}>
            {error && (
              <motion.p 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="text-red-600 text-[11px] font-bold uppercase tracking-wider bg-red-50 p-3.5 rounded-xl border border-red-100"
              >
                {error}
              </motion.p>
            )}

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                Work Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-slate-900 font-medium placeholder:text-slate-400 placeholder:font-light"
                placeholder="name@company.com"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-slate-900 font-medium placeholder:text-slate-400 placeholder:font-light"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Verifying..." : "Sign In"} <ChevronRight size={18} />
              </button>
            </div>
          </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;