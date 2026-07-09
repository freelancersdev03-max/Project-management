import React from "react";
import { motion } from "framer-motion";
import { Phone, Mail, ArrowUpRight } from "lucide-react";

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
  show: {
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 22 },
  },
};

const Footer = () => {
  return (
    <footer id="contact" className="k-band-white border-t pt-14 md:pt-20" style={{ borderColor: "var(--k-grey-200)" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        
        {/* Palette-Compliant CTA Banner Card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="w-full py-12 md:py-16 px-6 sm:px-10 md:px-16 rounded-3xl border text-center relative overflow-hidden mb-16 md:mb-24"
          style={{ background: "var(--k-blue-tint)", borderColor: "rgba(0, 134, 255, 0.2)" }}
        >
          <div className="max-w-3xl mx-auto space-y-6">
            <span
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider"
              style={{ background: "var(--k-white)", color: "var(--k-blue)", border: "1px solid var(--k-grey-200)" }}
            >
              <span className="k-live-dot" style={{ width: 6, height: 6 }} />
              Let's Connect
            </span>

            <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold tracking-tight leading-tight" style={{ color: "var(--k-ink)" }}>
              Ready to Modernize Your IT?
              <span className="block" style={{ color: "var(--k-blue)" }}>Let's Build Together.</span>
            </h2>
            
            <p className="text-sm sm:text-base font-light max-w-xl mx-auto" style={{ color: "var(--k-grey-700)" }}>
              Partner with our engineering and compliance specialists to build resilient, automated infrastructure.
            </p>

            <div className="pt-2">
              <motion.a
                href="tel:+919898718884"
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                className="k-btn-primary inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full text-white text-sm md:text-base font-medium no-underline shadow-md"
              >
                <Phone size={18} className="text-white shrink-0" />
                <span>Contact Us</span>
              </motion.a>
            </div>
          </div>
        </motion.div>

        {/* 5-Column Footer Grid (Exact structure from screenshot, in Palette) */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-40px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 md:gap-10 pb-12 md:pb-16"
        >
          {/* Column 1: Logo & Tagline (Span 3) */}
          <motion.div variants={itemVariants} className="lg:col-span-3 space-y-5">
            <motion.img
              src="/kayaara-logo.png"
              alt="KAYAARA Innovations Pvt Ltd"
              className="h-10 md:h-12 w-auto object-contain"
              whileHover={{ scale: 1.03 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
            />
            <p className="leading-relaxed font-light text-xs sm:text-sm" style={{ color: "var(--k-grey-700)" }}>
              Reliable foundations. Relentless innovation. The infrastructure partner that keeps you ahead.
            </p>
          </motion.div>

          {/* Column 2: Quick Link (Span 2) */}
          <motion.div variants={itemVariants} className="lg:col-span-2 space-y-4">
            <h4 className="text-sm sm:text-base font-bold tracking-tight" style={{ color: "var(--k-ink)" }}>
              Quick Link
            </h4>
            <ul className="space-y-2.5 font-light" style={{ color: "var(--k-grey-700)" }}>
              {quickLinks.map((item) => (
                <motion.li
                  key={item.label}
                  whileHover={{ x: 4, color: "var(--k-blue)" }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  <a href={item.href} className="text-xs sm:text-sm no-underline hover:text-[var(--k-blue)] transition-colors block">
                    {item.label}
                  </a>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Column 3: Services (Span 3) */}
          <motion.div variants={itemVariants} className="lg:col-span-3 space-y-4">
            <h4 className="text-sm sm:text-base font-bold tracking-tight" style={{ color: "var(--k-ink)" }}>
              Services
            </h4>
            <ul className="space-y-2.5 font-light" style={{ color: "var(--k-grey-700)" }}>
              {services.map((item) => (
                <motion.li
                  key={item}
                  className="text-xs sm:text-sm cursor-pointer flex items-center gap-1 group"
                  whileHover={{ x: 4, color: "var(--k-blue)" }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  <span>{item}</span>
                  <ArrowUpRight
                    size={12}
                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 shrink-0"
                    style={{ color: "var(--k-blue)" }}
                  />
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Column 4: Address (Span 2) */}
          <motion.div variants={itemVariants} className="lg:col-span-2 space-y-4">
            <h4 className="text-sm sm:text-base font-bold tracking-tight" style={{ color: "var(--k-ink)" }}>
              Address
            </h4>
            <div className="space-y-1 text-xs sm:text-sm font-light leading-relaxed" style={{ color: "var(--k-grey-700)" }}>
              <p>Kayaara Innovations pvt ltd</p>
              <p>Ahmedabad, Gujarat, India</p>
            </div>
          </motion.div>

          {/* Column 5: Contact (Span 2) */}
          <motion.div variants={itemVariants} className="lg:col-span-2 space-y-4">
            <h4 className="text-sm sm:text-base font-bold tracking-tight" style={{ color: "var(--k-ink)" }}>
              Contact
            </h4>
            <div className="space-y-3 font-light">
              <motion.a
                href="tel:+919898718884"
                className="flex items-center gap-2.5 text-xs sm:text-sm no-underline group"
                style={{ color: "var(--k-grey-700)" }}
                whileHover={{ x: 3, color: "var(--k-blue)" }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                <Phone size={15} style={{ color: "var(--k-blue)" }} className="shrink-0" />
                <span className="group-hover:underline">+91 9898718884</span>
              </motion.a>
              <motion.a
                href="mailto:info@Kayaara.com"
                className="flex items-center gap-2.5 text-xs sm:text-sm no-underline group"
                style={{ color: "var(--k-grey-700)" }}
                whileHover={{ x: 3, color: "var(--k-blue)" }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                <Mail size={15} style={{ color: "var(--k-blue)" }} className="shrink-0" />
                <span className="group-hover:underline">info@Kayaara.com</span>
              </motion.a>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Full-Width Bottom Bar (Matching Same Shade Across Site) */}
      <div className="w-full border-t py-6" style={{ background: "var(--k-band-grey)", borderColor: "var(--k-grey-300)" }}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 flex flex-col md:flex-row justify-between items-center gap-4"
        >
          <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--k-grey-700)" }}>
            © 2026 KAYAARA Innovations Pvt Ltd. Built for Excellence.
          </p>
          <div className="flex gap-6 text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--k-grey-700)" }}>
            {["Privacy Policy", "Terms of Service"].map((label) => (
              <motion.a
                key={label}
                href="#"
                whileHover={{ color: "var(--k-blue)", y: -1 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                className="no-underline"
              >
                {label}
              </motion.a>
            ))}
          </div>
        </motion.div>
      </div>
    </footer>
  );
};

export default Footer;
