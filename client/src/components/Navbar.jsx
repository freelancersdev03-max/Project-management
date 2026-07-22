import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Mail, Clock, Menu, X } from "lucide-react";
import api from "../api";

/**
 * KAYAARA Navbar — Techza style.
 * Two-row: dark navy info bar (desktop) + main nav (white, sticky, scroll-blur).
 * Mobile: hamburger overlay.
 */
const Navbar = ({ hideLogin = false }) => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on resize
  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 768) setMobileOpen(false); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const navItems = [
    { label: "About", route: "/about" },
    { label: "Products", route: "/products" },
    { label: "Contact Us", route: "/contact" },
  ];

  return (
    <div className="sticky top-0 z-50">
      {/* ── ROW 1: Dark Navy Info Bar (desktop only) ── */}
      <div
        className="hidden md:block w-full"
        style={{ background: "var(--k-dark)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="flex items-center justify-between h-10 text-[12px]" style={{ color: "var(--k-dark-muted)" }}>
            {/* Left: address + email */}
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-1.5">
                <MapPin size={12} style={{ color: "var(--k-blue-light)" }} />
                Ahmedabad, Gujarat, India
              </span>
              <span className="w-px h-3 opacity-30" style={{ background: "white" }} />
              <a
                href="mailto:info@Kayaara.com"
                className="flex items-center gap-1.5 no-underline hover:text-white transition-colors"
                style={{ color: "var(--k-dark-muted)" }}
              >
                <Mail size={12} style={{ color: "var(--k-blue-light)" }} />
                info@Kayaara.com
              </a>
            </div>
            {/* Right: office hours */}
            <span className="flex items-center gap-1.5">
              <Clock size={12} style={{ color: "var(--k-blue-light)" }} />
              Office Hours: 9:00 AM – 6:00 PM (IST)
            </span>
          </div>
        </div>
      </div>

      {/* ── ROW 2: Main Navigation Bar ── */}
      <motion.header
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 28 }}
        className="w-full border-b transition-all duration-300"
        style={{
          borderColor: scrolled ? "var(--k-grey-200)" : "rgba(221,225,237,0.5)",
          boxShadow: scrolled ? "0 4px 24px -8px rgba(0,38,153,0.10)" : "none",
          backdropFilter: scrolled ? "blur(20px) saturate(1.5)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(20px) saturate(1.5)" : "none",
          background: scrolled ? "rgba(255,255,255,0.92)" : "var(--k-white)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="h-18 md:h-20 flex items-center justify-between gap-4" style={{ minHeight: "72px" }}>

            {/* LEFT: KAYAARA Logo */}
            <motion.a
              href="/"
              onClick={(e) => { e.preventDefault(); navigate("/"); }}
              className="flex items-center gap-2.5 shrink-0 no-underline cursor-pointer"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              title="Go to Home Page"
            >
              <img
                src="/kayaara-mark.png"
                alt="KAYAARA Mark"
                className="h-9 md:h-10 w-auto object-contain shrink-0"
              />
              <div className="flex flex-col text-left">
                <span
                  className="font-bold leading-tight tracking-tight"
                  style={{ fontFamily: "'Cabin', sans-serif", color: "var(--k-ink)", fontSize: "18px" }}
                >
                  KAYAARA
                </span>
                <span
                  className="leading-tight font-semibold tracking-widest uppercase"
                  style={{ fontFamily: "'Inter', sans-serif", color: "var(--k-blue)", fontSize: "9px", marginTop: "1px" }}
                >
                  Connect Suite
                </span>
              </div>
            </motion.a>

            {/* CENTER: Desktop Nav Links */}
            {!hideLogin && (
              <nav className="hidden md:flex items-center gap-8 flex-1 justify-center">
                {navItems.map((item) => (
                  <motion.button
                    key={item.label}
                    onClick={() => navigate(item.route)}
                    className="relative py-1 bg-transparent border-none p-0 cursor-pointer text-sm font-semibold tracking-wide"
                    style={{
                      fontFamily: "'Cabin', sans-serif",
                      color: "var(--k-grey-700)",
                      fontWeight: 600,
                    }}
                    whileHover={{ color: "var(--k-blue)" }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  >
                    {item.label}
                    <motion.span
                      className="absolute left-0 right-0 -bottom-0.5 h-[2px] rounded-full mx-auto"
                      style={{ background: "var(--k-blue)", transformOrigin: "center" }}
                      initial={{ scaleX: 0, opacity: 0 }}
                      whileHover={{ scaleX: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 22 }}
                    />
                  </motion.button>
                ))}
              </nav>
            )}

            {/* RIGHT: CTA + Hamburger */}
            <div className="flex items-center gap-3 shrink-0">
              {!hideLogin && (
                <motion.button
                  id="navbar-login-btn"
                  onClick={() => navigate("/login")}
                  className="k-btn-primary hidden md:inline-flex items-center gap-2 text-sm"
                  whileHover={{ scale: 1.03, y: -1 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  Login →
                </motion.button>
              )}

              {hideLogin && (
                <motion.button
                  onClick={async () => {
                    try { await api.post('/logout/'); } catch { /* proceed even if call fails */ }
                    localStorage.clear();
                    navigate("/login");
                  }}
                  className="k-btn-ghost text-sm"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  Logout
                </motion.button>
              )}

              {/* Mobile hamburger */}
              {!hideLogin && (
                <button
                  id="navbar-hamburger"
                  className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg transition-colors"
                  style={{ color: "var(--k-ink)", background: "var(--k-grey-100)" }}
                  onClick={() => setMobileOpen(true)}
                  aria-label="Open navigation"
                >
                  <Menu size={20} />
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.header>

      {/* ── MOBILE MENU OVERLAY ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[200]"
            style={{ background: "rgba(1,14,55,0.55)", backdropFilter: "blur(6px)" }}
            onClick={() => setMobileOpen(false)}
          >
            <motion.nav
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="absolute right-0 top-0 h-full w-72 flex flex-col"
              style={{ background: "var(--k-white)", boxShadow: "-8px 0 32px rgba(0,38,153,0.12)" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-6 py-5 border-b"
                style={{ borderColor: "var(--k-grey-200)" }}
              >
                <span
                  className="font-bold text-lg"
                  style={{ fontFamily: "'Cabin', sans-serif", color: "var(--k-ink)" }}
                >
                  KAYAARA
                </span>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
                  style={{ background: "var(--k-grey-100)", color: "var(--k-grey-600)" }}
                  aria-label="Close navigation"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Links */}
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-1">
                {navItems.map((item, i) => (
                  <motion.button
                    key={item.label}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => { navigate(item.route); setMobileOpen(false); }}
                    className="w-full text-left px-4 py-3 rounded-lg font-semibold text-sm transition-colors"
                    style={{
                      fontFamily: "'Cabin', sans-serif",
                      color: "var(--k-grey-700)",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                    }}
                    whileHover={{ background: "var(--k-blue-tint)", color: "var(--k-blue)" }}
                  >
                    {item.label}
                  </motion.button>
                ))}
              </div>

              {/* CTA */}
              <div className="px-6 pb-8 border-t pt-5" style={{ borderColor: "var(--k-grey-200)" }}>
                <button
                  onClick={() => { navigate("/login"); setMobileOpen(false); }}
                  className="k-btn-primary w-full text-center"
                >
                  Login to Platform →
                </button>
              </div>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Navbar;
