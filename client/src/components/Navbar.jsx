import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../api";

/**
 * KAYAARA Navbar v3 — Apple HIG–style micro-animations.
 * White bg, sticky, scrolled state adds blur + shadow.
 * Spring-physics button states, animated nav underlines.
 */
const Navbar = ({ hideLogin = false }) => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navItems = ["About", "Products"];
  const contactItem = "Contact Us";

  return (
    <motion.header
      initial={{ opacity: 0, y: -18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className="sticky top-0 z-50 k-band-white border-b transition-all duration-300"
      style={{
        borderColor: scrolled ? "var(--k-grey-200)" : "transparent",
        boxShadow: scrolled ? "0 4px 24px -8px rgba(0,0,0,0.06)" : "none",
        backdropFilter: scrolled ? "blur(20px) saturate(1.5)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(20px) saturate(1.5)" : "none",
        background: scrolled ? "rgba(255,255,255,0.82)" : "var(--k-white)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="h-16 md:h-20 flex items-center justify-between gap-3">

          {/* LEFT: KAYAARA Logo */}
          <motion.a
            href="/"
            className="flex items-center gap-2 shrink-0"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <img
              src="/kayaara-logo.png"
              alt="KAYAARA Innovations"
              className="h-9 md:h-10 w-auto object-contain"
            />
          </motion.a>

          {!hideLogin && (
            <nav
              className="hidden md:flex items-center gap-10 text-base font-bold tracking-tight"
              style={{ color: "var(--k-grey-700)" }}
            >
              {navItems.map((item) => {
                const route = `/${item.toLowerCase()}`;
                return (
                  <motion.button
                    key={item}
                    onClick={() => navigate(route)}
                    className="relative py-1 bg-transparent border-none p-0 font-bold text-base cursor-pointer"
                    style={{ color: "var(--k-grey-700)" }}
                    whileHover={{ color: "var(--k-blue)" }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  >
                    {item}
                    <motion.span
                      className="absolute left-0 right-0 -bottom-0.5 h-[2px] rounded-full mx-auto"
                      style={{ background: "var(--k-blue)", transformOrigin: "center" }}
                      initial={{ scaleX: 0, opacity: 0 }}
                      whileHover={{ scaleX: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 22 }}
                    />
                  </motion.button>
                );
              })}
              <motion.button
                onClick={() => navigate("/contact")}
                className="relative py-1 bg-transparent border-none p-0 font-bold text-base cursor-pointer"
                style={{ color: "var(--k-grey-700)" }}
                whileHover={{ color: "var(--k-blue)" }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                {contactItem}
                <motion.span
                  className="absolute left-0 right-0 -bottom-0.5 h-[2px] rounded-full mx-auto"
                  style={{ background: "var(--k-blue)", transformOrigin: "center" }}
                  initial={{ scaleX: 0, opacity: 0 }}
                  whileHover={{ scaleX: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 22 }}
                />
              </motion.button>
            </nav>
          )}

          {/* RIGHT: CTA / Logout */}
          <div className="flex items-center gap-2 shrink-0">
            {!hideLogin && (
              <motion.button
                onClick={() => navigate("/login")}
                className="k-btn-primary flex items-center gap-2 text-sm"
                whileHover={{ scale: 1.03, y: -1 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                Login
                <span className="hidden sm:inline">→</span>
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
          </div>
        </div>
      </div>
    </motion.header>
  );
};

export default Navbar;
