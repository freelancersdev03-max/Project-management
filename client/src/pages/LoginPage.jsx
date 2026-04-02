import React, { useState } from "react";
import { ChevronRight, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";

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
      console.log("[LOGIN] Access token:", data.access);

      // Store tokens
      if (data.access) {
        localStorage.setItem("token", data.access);
        localStorage.setItem("access_token", data.access);
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
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 md:p-6">
      <Link
        to="/"
        className="mb-8 flex items-center gap-2 text-slate-500 hover:text-[#F58A4B] transition-colors font-bold uppercase text-[10px] tracking-[0.2em]"
      >
        <ArrowLeft size={16} /> Back to Homepage
      </Link>

      <div className="w-full max-w-5xl bg-white rounded-[1.5rem] md:rounded-[2.5rem] shadow-2xl overflow-hidden flex min-h-[480px] md:min-h-[600px] border-2 border-slate-300">
        {/* Left Panel */}
        <div className="hidden lg:flex lg:w-1/2 bg-slate-900 p-10 xl:p-16 flex-col justify-between relative text-white">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#F58A4B] opacity-10 blur-3xl rounded-full"></div>

          <div>
            <span className="text-[10px] font-bold tracking-[0.4em] text-[#F58A4B] uppercase border-b border-white/20 pb-2">
              System Excellence
            </span>

            <h2 className="mt-10 text-4xl xl:text-5xl font-black leading-[1.1] tracking-tighter">
              Empowering your <br />
              <span className="text-[#F58A4B] italic font-light">
                Transformation.
              </span>
            </h2>
          </div>

          <div className="text-[10px] font-bold tracking-[0.3em] uppercase opacity-40 italic">
            © 2026 HQEPL Solutions
          </div>
        </div>

        {/* Right Panel */}
        <div className="w-full lg:w-1/2 p-8 md:p-12 lg:p-20 flex flex-col justify-center bg-white">
          <div className="mb-10">
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter">
              Login
            </h1>
            <div className="h-1 w-12 bg-[#F58A4B] mt-2"></div>
          </div>

          <form className="space-y-6" onSubmit={handleLogin}>
            {error && (
              <p className="text-red-500 text-[10px] font-bold uppercase tracking-widest bg-red-50 p-3 rounded-lg border border-red-100">
                {error}
              </p>
            )}

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                Work Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-[#F58A4B] outline-none transition-all font-medium"
                placeholder="admin@hqepl.com"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-5 pr-14 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-[#F58A4B] outline-none transition-all font-medium"
                  placeholder="123"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-[#F58A4B] transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-slate-900 text-white py-4 md:py-5 rounded-full text-xs font-bold uppercase tracking-[0.2em] hover:bg-black transition-all flex items-center justify-center gap-3 shadow-xl disabled:opacity-80 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Verifying..." : "Log In"} <ChevronRight size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;