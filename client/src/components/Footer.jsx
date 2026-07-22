import React from "react";
import { motion } from "framer-motion";
import { Phone, Mail, MapPin, ArrowRight } from "lucide-react";

const quickLinks = [
  { label: "Home", href: "/" },
  { label: "Company", href: "#about" },
  { label: "Industries", href: "#industries" },
  { label: "Contact Us", href: "#contact" },
];

const services = [
  "AI-Based Application Development",
  "Greenfield & Brownfield Projects",
  "GxP Compliance & Validation",
  "Migration & Cloud Services",
  "IT Infrastructure",
  "Process Automation & RPA",
];

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1, y: 0,
    transition: { type: "spring", stiffness: 280, damping: 22 },
  },
};

const Footer = () => {
  return (
    <footer id="contact">

      {/* ── CTA Banner (on light background above dark footer) ── */}
      <div style={{ background: "var(--k-band-grey)", borderTop: "1px solid var(--k-grey-200)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-14 md:py-20">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="w-full py-12 md:py-16 px-6 sm:px-10 md:px-16 text-center relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, var(--k-dark) 0%, #051547 60%, #0a1e5e 100%)",
              borderRadius: "10px",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {/* Grid pattern overlay */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
                backgroundSize: "50px 50px",
              }}
            />

            {/* Glow */}
            <div
              className="absolute -top-20 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full pointer-events-none"
              style={{ background: "radial-gradient(circle, rgba(51,85,204,0.4) 0%, transparent 70%)" }}
            />

            <div className="max-w-3xl mx-auto space-y-5 relative z-10">
              {/* Eyebrow */}
              <div className="flex items-center justify-center gap-2">
                <span
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-widest border"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    borderColor: "rgba(255,255,255,0.2)",
                    color: "rgba(255,255,255,0.8)",
                    fontFamily: "'Cabin', sans-serif",
                  }}
                >
                  <span className="k-live-dot" style={{ width: 6, height: 6 }} />
                  Let's Connect
                </span>
              </div>

              <h2
                className="font-bold tracking-tight leading-tight"
                style={{
                  fontFamily: "'Cabin', sans-serif",
                  color: "var(--k-white)",
                  fontSize: "clamp(1.6rem, 3.5vw, 2.8rem)",
                }}
              >
                Ready to Modernize Your IT?
                <span className="block" style={{ color: "#7ba7ff" }}>Let's Build Together.</span>
              </h2>

              <p
                className="max-w-xl mx-auto leading-relaxed"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  color: "var(--k-dark-muted)",
                  fontSize: "clamp(0.875rem, 1.5vw, 1rem)",
                }}
              >
                Partner with our engineering and compliance specialists to build resilient, automated infrastructure.
              </p>

              <div className="pt-2">
                <motion.a
                  href="tel:+919898718884"
                  whileHover={{ scale: 1.04, y: -2 }}
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  className="inline-flex items-center gap-2.5 no-underline font-bold"
                  style={{
                    background: "var(--k-white)",
                    color: "var(--k-ink)",
                    fontFamily: "'Cabin', sans-serif",
                    padding: "0.75rem 2rem",
                    borderRadius: "6px",
                    fontSize: "0.9rem",
                    border: "2px solid var(--k-white)",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
                  }}
                >
                  <Phone size={18} />
                  <span>Contact Us</span>
                </motion.a>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Dark Navy Footer Body ── */}
      <div style={{ background: "var(--k-dark)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pt-14 md:pt-20">

          {/* Top divider line */}
          <div className="mb-12 md:mb-16" style={{ height: "1px", background: "rgba(255,255,255,0.08)" }} />

          {/* Footer grid */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-40px" }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 md:gap-10 pb-12 md:pb-16"
          >
            {/* Column 1: Logo & Tagline */}
            <motion.div variants={itemVariants} className="lg:col-span-3 space-y-5">
              <a
                href="/"
                className="flex items-center gap-3 no-underline"
              >
                <img
                  src="/kayaara-mark.png"
                  alt="KAYAARA Mark"
                  className="h-10 w-auto object-contain"
                />
                <div className="flex flex-col text-left">
                  <span
                    className="font-bold leading-tight tracking-tight text-white"
                    style={{ fontFamily: "'Cabin', sans-serif", fontSize: "22px" }}
                  >
                    KAYAARA
                  </span>
                  <span
                    className="leading-tight font-semibold tracking-widest uppercase"
                    style={{ fontFamily: "'Inter', sans-serif", color: "#60a5fa", fontSize: "10px", marginTop: "2px" }}
                  >
                    Innovations Pvt Ltd
                  </span>
                </div>
              </a>
              <p
                className="leading-relaxed text-sm"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  color: "var(--k-dark-muted)",
                  fontWeight: 300,
                }}
              >
                Reliable foundations. Relentless innovation. The infrastructure partner that keeps you ahead.
              </p>
            </motion.div>

            {/* Column 2: Quick Links */}
            <motion.div variants={itemVariants} className="lg:col-span-2 space-y-5">
              <h4
                className="font-bold text-sm tracking-wide uppercase"
                style={{
                  fontFamily: "'Cabin', sans-serif",
                  color: "var(--k-white)",
                  letterSpacing: "0.08em",
                  borderBottom: "2px solid var(--k-blue)",
                  paddingBottom: "8px",
                  display: "inline-block",
                }}
              >
                Quick Links
              </h4>
              <ul className="space-y-2.5">
                {quickLinks.map((item) => (
                  <motion.li
                    key={item.label}
                    whileHover={{ x: 4 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  >
                    <a
                      href={item.href}
                      className="flex items-center gap-1.5 text-sm no-underline transition-colors"
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        color: "var(--k-dark-muted)",
                        fontWeight: 400,
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = "var(--k-white)"}
                      onMouseLeave={(e) => e.currentTarget.style.color = "var(--k-dark-muted)"}
                    >
                      <ArrowRight size={12} style={{ color: "var(--k-blue-light)", flexShrink: 0 }} />
                      {item.label}
                    </a>
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            {/* Column 3: Services */}
            <motion.div variants={itemVariants} className="lg:col-span-3 space-y-5">
              <h4
                className="font-bold text-sm tracking-wide uppercase"
                style={{
                  fontFamily: "'Cabin', sans-serif",
                  color: "var(--k-white)",
                  letterSpacing: "0.08em",
                  borderBottom: "2px solid var(--k-blue)",
                  paddingBottom: "8px",
                  display: "inline-block",
                }}
              >
                Services
              </h4>
              <ul className="space-y-2.5">
                {services.map((item) => (
                  <motion.li
                    key={item}
                    className="flex items-center gap-1.5 text-sm cursor-pointer"
                    style={{ fontFamily: "'Inter', sans-serif", color: "var(--k-dark-muted)", fontWeight: 400 }}
                    whileHover={{ x: 4, color: "var(--k-white)" }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  >
                    <ArrowRight size={12} style={{ color: "var(--k-blue-light)", flexShrink: 0 }} />
                    {item}
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            {/* Column 4: Address */}
            <motion.div variants={itemVariants} className="lg:col-span-2 space-y-5">
              <h4
                className="font-bold text-sm tracking-wide uppercase"
                style={{
                  fontFamily: "'Cabin', sans-serif",
                  color: "var(--k-white)",
                  letterSpacing: "0.08em",
                  borderBottom: "2px solid var(--k-blue)",
                  paddingBottom: "8px",
                  display: "inline-block",
                }}
              >
                Address
              </h4>
              <div
                className="space-y-1.5 text-sm leading-relaxed"
                style={{ fontFamily: "'Inter', sans-serif", color: "var(--k-dark-muted)", fontWeight: 300 }}
              >
                <div className="flex items-start gap-2">
                  <MapPin size={14} style={{ color: "var(--k-blue-light)", marginTop: "2px", flexShrink: 0 }} />
                  <div>
                    <p>Kayaara Innovations pvt ltd</p>
                    <p>Ahmedabad, Gujarat, India</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Column 5: Contact */}
            <motion.div variants={itemVariants} className="lg:col-span-2 space-y-5">
              <h4
                className="font-bold text-sm tracking-wide uppercase"
                style={{
                  fontFamily: "'Cabin', sans-serif",
                  color: "var(--k-white)",
                  letterSpacing: "0.08em",
                  borderBottom: "2px solid var(--k-blue)",
                  paddingBottom: "8px",
                  display: "inline-block",
                }}
              >
                Contact
              </h4>
              <div className="space-y-3">
                <motion.a
                  href="tel:+919898718884"
                  className="flex items-center gap-2.5 text-sm no-underline group"
                  style={{ fontFamily: "'Inter', sans-serif", color: "var(--k-dark-muted)", fontWeight: 400 }}
                  whileHover={{ x: 3, color: "var(--k-white)" }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  <Phone size={15} style={{ color: "var(--k-blue-light)" }} className="shrink-0" />
                  <span>+91 9898718884</span>
                </motion.a>
                <motion.a
                  href="mailto:info@Kayaara.com"
                  className="flex items-center gap-2.5 text-sm no-underline group"
                  style={{ fontFamily: "'Inter', sans-serif", color: "var(--k-dark-muted)", fontWeight: 400 }}
                  whileHover={{ x: 3, color: "var(--k-white)" }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  <Mail size={15} style={{ color: "var(--k-blue-light)" }} className="shrink-0" />
                  <span>info@Kayaara.com</span>
                </motion.a>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* ── Bottom Bar ── */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6 flex flex-col md:flex-row justify-between items-center gap-4"
          >
            <p
              className="text-[11px] font-semibold uppercase tracking-widest"
              style={{ fontFamily: "'Inter', sans-serif", color: "var(--k-dark-muted)" }}
            >
              © 2026 KAYAARA Innovations Pvt Ltd. Built for Excellence.
            </p>
            <div
              className="flex gap-6 text-[11px] font-semibold uppercase tracking-widest"
              style={{ fontFamily: "'Inter', sans-serif", color: "var(--k-dark-muted)" }}
            >
              {["Privacy Policy", "Terms of Service"].map((label) => (
                <motion.a
                  key={label}
                  href="#"
                  whileHover={{ color: "var(--k-white)", y: -1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  className="no-underline"
                >
                  {label}
                </motion.a>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
