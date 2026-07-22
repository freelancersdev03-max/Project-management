import React, { useState, useRef } from "react";
import { ChevronRight, ArrowLeft, Eye, EyeOff, Mail, Lock, Check } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring, useReducedMotion } from "framer-motion";
import api from "../api";

const LOGIN_ENDPOINTS = {
  login: "/login/",
};

const EASE = [0.22, 1, 0.36, 1];

const cardVariants = {
  hidden: { opacity: 0, y: 28, scale: 0.985 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.6, ease: EASE, staggerChildren: 0.08, delayChildren: 0.12 },
  },
};

const panelVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } },
};

const FEATURE_PILLS = ["Encrypted access", "Fast sign in", "Team-ready"];

const LoginPage = () => {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [loginSuccess, setLoginSuccess] = useState(false);

  // 3D parallax for the brand panel mockup cards
  const panelRef = useRef(null);
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const glowX = useSpring(useTransform(px, [-0.5, 0.5], [-24, 24]), { stiffness: 80, damping: 22 });
  const glowY = useSpring(useTransform(py, [-0.5, 0.5], [-24, 24]), { stiffness: 80, damping: 22 });

  const handlePanelMouseMove = (event) => {
    if (!panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    const mouseX = event.clientX - rect.left - rect.width / 2;
    const mouseY = event.clientY - rect.top - rect.height / 2;
    px.set(mouseX / rect.width);
    py.set(mouseY / rect.height);
  };

  const handlePanelMouseLeave = () => {
    px.set(0);
    py.set(0);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError("");
    setIsSubmitting(true);

    try {
      const response = await api.post(LOGIN_ENDPOINTS.login, {
        email,
        password,
      });

      const { data } = response;
      console.log("[LOGIN] Response data:", data);

      if (data.access) {
        localStorage.setItem("access_token", data.access);
        localStorage.setItem("token", data.access);
      } else {
        throw new Error("Login failed: No access token received");
      }

      if (data.refresh) {
        localStorage.setItem("refresh_token", data.refresh);
      }

      localStorage.setItem("role", data.role);
      localStorage.setItem("username", data.username || "Admin User");
      localStorage.setItem("email", data.email || email);
      if (data.department) localStorage.setItem("department", data.department);
      if (data.department_name) localStorage.setItem("department_name", data.department_name);
      if (data.department_role) localStorage.setItem("department_role", data.department_role);

      const role = data.role?.toUpperCase();

      setLoginSuccess(true);

      const go = () => {
        if (role === "ADMIN") navigate("/admin");
        else if (role === "KAYAARA") navigate("/kayaara");
        else if (role === "MLS") navigate("/mls");
        else if (role === "EMPLOYEE") navigate("/employee");
        else if (role === "SGM") navigate("/sgm");
        else if (role === "SENIOR") navigate("/senior");
        else if (role === "CLIENT") navigate("/client");
        else if (role === "EXTERNAL") navigate("/employee");
        else navigate("/");
      };

      // Brief success flourish before navigating — purely presentational,
      // does not alter auth flow or timing of the underlying logic above.
      setTimeout(go, 250);
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
      setShakeKey((k) => k + 1);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{ background: "var(--k-band-grey)" }}
    >
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-[-80px] right-[-80px] w-[360px] h-[360px] rounded-full k-float-slow"
          style={{ background: "radial-gradient(circle, rgba(0,134,255,0.08) 0%, transparent 70%)" }}
        />
        <div
          className="absolute bottom-[-80px] left-[-80px] w-[320px] h-[320px] rounded-full k-float"
          style={{ background: "radial-gradient(circle, rgba(0,134,255,0.06) 0%, transparent 70%)" }}
        />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(var(--k-ink) 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Back link */}
        <div className="px-5 sm:px-8 lg:px-12 pt-5 sm:pt-7">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Link
              to="/"
              className="inline-flex items-center gap-2 font-semibold text-sm transition-colors group"
              style={{ color: "var(--k-grey-500)", minHeight: 44 }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--k-blue)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--k-grey-500)")}
            >
              <motion.span
                className="group-hover:-translate-x-1 transition-transform duration-200"
                style={{ display: "inline-flex" }}
                whileHover={prefersReducedMotion ? undefined : { x: -2 }}
              >
                <ArrowLeft size={16} />
              </motion.span>
              Back to Homepage
            </Link>
          </motion.div>
        </div>

        {/* Split full-screen stage */}
        <motion.div
          key={shakeKey}
          variants={cardVariants}
          initial="hidden"
          animate="show"
          whileHover={prefersReducedMotion ? undefined : { y: -2 }}
          transition={{ duration: 0.25, ease: EASE }}
          className={`relative flex-1 w-full overflow-hidden lg:grid lg:grid-cols-2 ${
            shakeKey > 0 ? "k-shake" : ""
          }`}
          style={{
            background: "rgba(255,255,255,0.62)",
            borderTop: "1px solid rgba(228,231,235,0.75)",
            borderBottom: "1px solid rgba(228,231,235,0.75)",
            boxShadow: "var(--k-shadow-modal)",
          }}
        >
          <motion.div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.42) 0%, rgba(255,255,255,0.06) 36%, rgba(0,134,255,0.03) 100%)",
            }}
            animate={prefersReducedMotion ? undefined : { opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* ── Left Panel: Form ── */}
          <motion.div
            variants={panelVariants}
            className="relative z-10 w-full flex flex-col justify-center px-6 py-10 sm:px-10 md:px-14 lg:px-16 xl:px-20"
            style={{ background: "rgba(255,255,255,0.84)" }}
          >
          <motion.div variants={itemVariants} className="mb-8 relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(0,134,255,0.12)] bg-[rgba(0,134,255,0.06)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-[var(--k-blue)]">
              <span className="k-live-dot" />
              Secure enterprise access
            </div>
            <div
              aria-hidden="true"
              className="absolute -left-2 top-0 h-10 w-10 rounded-full blur-2xl pointer-events-none"
              style={{ background: "rgba(0,134,255,0.08)" }}
            />
            <h1
              className="text-3xl md:text-4xl font-bold tracking-tight"
              style={{ color: "var(--k-ink)" }}
            >
              Welcome back
            </h1>
            <p className="text-sm mt-1.5" style={{ color: "var(--k-grey-500)" }}>
              Sign in to your KAYAARA workspace
            </p>
            <motion.div
              className="h-1 w-12 mt-4 rounded-full"
              style={{ background: "linear-gradient(90deg, var(--k-blue) 0%, var(--k-blue-light) 100%)" }}
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ duration: 0.55, delay: 0.25, ease: EASE }}
            />
            <p className="mt-5 max-w-xl text-sm leading-6" style={{ color: "var(--k-grey-500)" }}>
              A cleaner, faster way into the KAYAARA workspace, designed to feel like a product surface rather than a plain form.
            </p>
          </motion.div>

          <motion.form className="space-y-5 relative z-10" onSubmit={handleLogin} noValidate variants={itemVariants}>
            {/* Animated error message */}
            <AnimatePresence mode="wait">
              {error && (
                <motion.p
                  key="error"
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.28 }}
                  className="text-xs font-semibold p-3 rounded-xl border"
                  style={{
                    color: "var(--k-ink)",
                    background: "var(--k-blue-tint)",
                    borderColor: "rgba(0,134,255,0.25)",
                  }}
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <motion.div variants={itemVariants}>
              <label
                className="k-label transition-colors duration-200"
                style={{ color: emailFocused ? "var(--k-blue)" : "var(--k-grey-700)" }}
              >
                Work Email
              </label>
              <div className="relative">
                <motion.span
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: emailFocused ? "var(--k-blue)" : "var(--k-grey-300)" }}
                  animate={{ scale: emailFocused ? [1, 1.25, 1] : 1 }}
                  transition={{ duration: 0.35, ease: EASE }}
                >
                  <Mail size={16} />
                </motion.span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  className="k-input"
                  style={{ paddingLeft: "2.5rem", minHeight: 44 }}
                  placeholder="admin@kayaara.com"
                />
              </div>
            </motion.div>

            <motion.div variants={itemVariants}>
              <label
                className="k-label transition-colors duration-200"
                style={{ color: passwordFocused ? "var(--k-blue)" : "var(--k-grey-700)" }}
              >
                Password
              </label>
              <div className="relative">
                <motion.span
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: passwordFocused ? "var(--k-blue)" : "var(--k-grey-300)" }}
                  animate={{ scale: passwordFocused ? [1, 1.25, 1] : 1 }}
                  transition={{ duration: 0.35, ease: EASE }}
                >
                  <Lock size={16} />
                </motion.span>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  className="k-input"
                  style={{ paddingLeft: "2.5rem", paddingRight: "2.75rem", minHeight: 44 }}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center w-9 h-9 rounded-lg transition-colors"
                  style={{ color: "var(--k-grey-500)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--k-blue)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--k-grey-500)")}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {showPassword ? (
                      <motion.span
                        key="hide"
                        initial={{ opacity: 0, rotate: -60, scale: 0.6 }}
                        animate={{ opacity: 1, rotate: 0, scale: 1 }}
                        exit={{ opacity: 0, rotate: 60, scale: 0.6 }}
                        transition={{ duration: 0.22, ease: EASE }}
                        style={{ display: "inline-flex" }}
                      >
                        <EyeOff size={18} />
                      </motion.span>
                    ) : (
                      <motion.span
                        key="show"
                        initial={{ opacity: 0, rotate: 60, scale: 0.6 }}
                        animate={{ opacity: 1, rotate: 0, scale: 1 }}
                        exit={{ opacity: 0, rotate: -60, scale: 0.6 }}
                        transition={{ duration: 0.22, ease: EASE }}
                        style={{ display: "inline-flex" }}
                      >
                        <Eye size={18} />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              </div>
            </motion.div>

            <motion.button
              type="submit"
              disabled={isSubmitting}
              className="k-btn-primary w-full flex items-center justify-center gap-2 text-sm mt-2"
              style={{ minHeight: 44 }}
              variants={itemVariants}
              whileHover={prefersReducedMotion ? undefined : { y: -1, scale: 1.01 }}
              whileTap={{ scale: 0.97 }}
              layout
            >
              <AnimatePresence mode="wait" initial={false}>
                {loginSuccess ? (
                  <motion.span
                    key="success"
                    className="flex items-center justify-center gap-2"
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.25, ease: EASE }}
                  >
                    <Check size={16} />
                    Success
                  </motion.span>
                ) : isSubmitting ? (
                  <motion.span
                    key="loading"
                    className="flex items-center justify-center gap-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <motion.span
                      className="inline-block w-3.5 h-3.5 rounded-full border-2"
                      style={{
                        borderColor: "rgba(255,255,255,0.35)",
                        borderTopColor: "var(--k-white)",
                      }}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}
                    />
                    Verifying…
                  </motion.span>
                ) : (
                  <motion.span
                    key="idle"
                    className="flex items-center justify-center gap-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    Log In <ChevronRight size={16} />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>

            <motion.div variants={itemVariants} className="pt-3">
              <div className="flex flex-wrap gap-2">
                {FEATURE_PILLS.map((pill, index) => (
                  <motion.div
                    key={pill}
                    className="rounded-full border px-3 py-1 text-[10px] font-semibold"
                    style={{
                      borderColor: index === 1 ? "rgba(0,134,255,0.22)" : "var(--k-grey-200)",
                      background: index === 1 ? "var(--k-blue-tint)" : "rgba(255,255,255,0.84)",
                      color: index === 1 ? "var(--k-blue)" : "var(--k-grey-700)",
                    }}
                    whileHover={prefersReducedMotion ? undefined : { y: -1 }}
                  >
                    {pill}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.form>
          <motion.div
            variants={itemVariants}
            className="mt-6 grid grid-cols-3 gap-3 border-t border-[rgba(228,231,235,0.8)] pt-5"
          >
            {[
              { label: "Response", value: "< 1s" },
              { label: "Uptime", value: "99.9%" },
              { label: "Protected", value: "SSL" },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl bg-[rgba(242,243,245,0.72)] px-3 py-3">
                <div className="text-[9px] font-black uppercase tracking-wider" style={{ color: "var(--k-grey-500)" }}>
                  {item.label}
                </div>
                <div className="mt-1 text-sm font-bold text-[var(--k-ink)]">{item.value}</div>
              </div>
            ))}
          </motion.div>
          </motion.div>

          {/* ── Right Panel: Brand ── */}
          <motion.div
            variants={panelVariants}
            ref={panelRef}
            onMouseMove={handlePanelMouseMove}
            onMouseLeave={handlePanelMouseLeave}
            className="relative z-10 w-full flex flex-col items-center justify-between px-6 py-10 sm:px-10 md:px-14 lg:px-16 xl:px-20 min-h-[460px] lg:min-h-0 overflow-hidden"
            style={{
              background: "linear-gradient(135deg, var(--k-blue-tint) 0%, rgba(255,255,255,0.44) 100%)",
              perspective: 1200,
            }}
          >
          {/* Subtle background dynamic light — drifts with mouse */}
          <motion.div
            className="absolute top-[-50px] left-[-50px] w-72 h-72 rounded-full blur-3xl pointer-events-none"
            style={{ background: "rgba(0,134,255,0.12)", x: glowX, y: glowY }}
            animate={prefersReducedMotion ? undefined : { scale: [1, 1.25, 1], opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 7, repeat: Infinity }}
          />

          {/* Decorative dot-grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(var(--k-ink) 1px, transparent 0)",
              backgroundSize: "20px 20px",
            }}
          />

          {/* Top Brand Logo - original colored */}
          <motion.div className="flex flex-col items-center pt-2 relative z-20" variants={itemVariants}>
            <div
              className="flex items-center gap-2.5 mb-2 cursor-pointer group"
              onClick={() => navigate('/')}
              title="Go to Home Page"
            >
              <img src="/kayaara-mark.png" alt="KAYAARA Mark" className="h-8 md:h-9 w-auto object-contain shrink-0 transition-transform group-hover:scale-105" />
              <div className="flex flex-col text-left">
                <div className="flex items-center leading-none">
                  <span className="font-black text-lg tracking-tight text-[var(--k-ink)]">KAYAARA</span>
                </div>
                <div className="flex items-center gap-1 -mt-1 md:-mt-1.5 leading-none">
                  <span className="text-[11px] font-extrabold tracking-widest text-[var(--k-blue)] uppercase leading-none">Connect Suite</span>
                  <img src="/star.png" alt="Star" className="h-[22px] md:h-[24px] w-auto object-contain shrink-0 -mt-0.5" />
                </div>
              </div>
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: "var(--k-blue)" }}>
              Enterprise Portal
            </span>
            <p className="mt-3 max-w-[28rem] text-center text-sm leading-6" style={{ color: "var(--k-grey-700)" }}>
              Built to feel like a control center: calm, fast, and visual, with enough detail to feel alive.
            </p>
          </motion.div>

          <div className="relative w-full max-w-2xl my-2 z-10 space-y-6">
            <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.24em]" style={{ color: "var(--k-grey-500)" }}>
              <span className="k-live-dot" />
              Enterprise Ecosystem Modules
            </div>

            {/* Full-width 2-column Feature Grid with high-impact visuals */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Card 1: Kayaara PMS */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                whileHover={{ y: -4, borderColor: "var(--k-blue)", boxShadow: "0 16px 36px -8px rgba(0,38,153,0.2)" }}
                className="group rounded-2xl border overflow-hidden bg-white transition-all duration-300 flex flex-col justify-between"
                style={{ borderColor: "var(--k-grey-200)", boxShadow: "0 4px 20px -4px rgba(0,38,153,0.08)" }}
              >
                <div className="h-48 overflow-hidden relative">
                  <img
                    src="https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&q=80&w=800"
                    alt="Kayaara PMS Dashboard"
                    className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--k-dark)]/90 via-[var(--k-dark)]/30 to-transparent flex flex-col justify-between p-4">
                    <span className="self-start text-[10px] font-bold text-white uppercase tracking-wider bg-blue-600/90 px-3 py-1 rounded-full shadow-md" style={{ fontFamily: "'Cabin', sans-serif" }}>
                      Project Management
                    </span>
                    <div className="text-white">
                      <span className="text-[10px] text-blue-200 font-bold uppercase tracking-wider block">Agile Tracker Engine</span>
                      <span className="text-sm font-bold" style={{ fontFamily: "'Cabin', sans-serif" }}>Task Boards & Milestone Sprints</span>
                    </div>
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2.5 mb-2">
                    <span className="text-2xl">🏗️</span>
                    <h3 className="text-base font-bold text-[var(--k-ink)] group-hover:text-[var(--k-blue)] transition-colors" style={{ fontFamily: "'Cabin', sans-serif" }}>
                      Kayaara PMS
                    </h3>
                  </div>
                  <p className="text-xs leading-relaxed text-[var(--k-grey-600)]" style={{ fontFamily: "'Inter', sans-serif" }}>
                    Agile task boards, milestone tracking, resource allocation, team Gantt views & automated progress reporting.
                  </p>
                </div>
              </motion.div>

              {/* Card 2: Kayaara Asset Management (High-Tech Futuristic Control HUD Photo) */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                whileHover={{ y: -4, borderColor: "var(--k-blue)", boxShadow: "0 16px 36px -8px rgba(0,38,153,0.2)" }}
                className="group rounded-2xl border overflow-hidden bg-white transition-all duration-300 flex flex-col justify-between"
                style={{ borderColor: "var(--k-grey-200)", boxShadow: "0 4px 20px -4px rgba(0,38,153,0.08)" }}
              >
                <div className="h-48 overflow-hidden relative">
                  <img
                    src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800"
                    alt="Asset Management Control HUD"
                    className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--k-dark)]/90 via-[var(--k-dark)]/30 to-transparent flex flex-col justify-between p-4">
                    <span className="self-start text-[10px] font-bold text-white uppercase tracking-wider bg-cyan-600/90 px-3 py-1 rounded-full shadow-md" style={{ fontFamily: "'Cabin', sans-serif" }}>
                      Asset Management
                    </span>
                    <div className="text-white">
                      <span className="text-[10px] text-cyan-200 font-bold uppercase tracking-wider block">Enterprise Control</span>
                      <span className="text-sm font-bold" style={{ fontFamily: "'Cabin', sans-serif" }}>Digital & Physical Asset Lifecycle</span>
                    </div>
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2.5 mb-2">
                    <span className="text-2xl">💼</span>
                    <h3 className="text-base font-bold text-[var(--k-ink)] group-hover:text-[var(--k-blue)] transition-colors" style={{ fontFamily: "'Cabin', sans-serif" }}>
                      Kayaara Asset
                    </h3>
                  </div>
                  <p className="text-xs leading-relaxed text-[var(--k-grey-600)]" style={{ fontFamily: "'Inter', sans-serif" }}>
                    Lifecycle tracking, audit logs, equipment maintenance logs, digital asset control & compliance verification.
                  </p>
                </div>
              </motion.div>
            </div>

            {/* 3 Metric Live Stats Box */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="grid grid-cols-3 gap-3 p-4 rounded-2xl border"
              style={{ background: "var(--k-blue-tint)", borderColor: "rgba(0,38,153,0.15)" }}
            >
              <div className="text-center border-r pr-2" style={{ borderColor: "rgba(0,38,153,0.12)" }}>
                <span className="text-lg font-black text-[var(--k-blue)] block" style={{ fontFamily: "'Cabin', sans-serif" }}>250+</span>
                <span className="text-[10px] font-semibold text-[var(--k-grey-600)] uppercase tracking-wider">Active Projects</span>
              </div>
              <div className="text-center border-r pr-2" style={{ borderColor: "rgba(0,38,153,0.12)" }}>
                <span className="text-lg font-black text-[var(--k-blue)] block" style={{ fontFamily: "'Cabin', sans-serif" }}>99.9%</span>
                <span className="text-[10px] font-semibold text-[var(--k-grey-600)] uppercase tracking-wider">System Uptime</span>
              </div>
              <div className="text-center">
                <span className="text-lg font-black text-[var(--k-blue)] block" style={{ fontFamily: "'Cabin', sans-serif" }}>100%</span>
                <span className="text-[10px] font-semibold text-[var(--k-grey-600)] uppercase tracking-wider">GxP Compliant</span>
              </div>
            </motion.div>

            {/* System Security Banner filling lower space */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.5 }}
              className="rounded-2xl p-4 border flex items-center justify-between gap-4"
              style={{
                background: "linear-gradient(135deg, var(--k-dark) 0%, #051547 100%)",
                borderColor: "rgba(255,255,255,0.12)",
                color: "white",
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold" style={{ background: "rgba(255,255,255,0.1)", color: "#7ba7ff" }}>
                  🔒
                </div>
                <div>
                  <h4 className="text-xs font-bold leading-tight" style={{ fontFamily: "'Cabin', sans-serif" }}>
                    Bank-Grade ISO & GxP Compliance
                  </h4>
                  <p className="text-[10px] text-blue-200 mt-0.5" style={{ fontFamily: "'Inter', sans-serif" }}>
                    256-Bit SSL Encryption · Audit Trails · Role-based Access
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Verified Active
              </span>
            </motion.div>
          </div>

          {/* Bottom Lockup */}
          <motion.div className="flex flex-col items-center pb-2 relative z-20" variants={itemVariants}>
            <motion.h2
              className="text-base font-bold text-center leading-tight text-[var(--k-ink)]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              Empowering your{" "}
              <span style={{ color: "var(--k-blue)" }}>Transformation.</span>
            </motion.h2>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {FEATURE_PILLS.map((pill) => (
                <span
                  key={pill}
                  className="rounded-full border border-[rgba(0,134,255,0.12)] bg-white/80 px-3 py-1 text-[10px] font-semibold text-[var(--k-grey-700)]"
                >
                  {pill}
                </span>
              ))}
            </div>
            <div className="mt-3 text-[9px] font-black uppercase tracking-widest" style={{ color: "var(--k-grey-500)" }}>
              © 2026 KAYAARA SOLUTIONS
            </div>
          </motion.div>
          </motion.div>
        </motion.div>

      </div>
    </div>
  );
};

export default LoginPage;
