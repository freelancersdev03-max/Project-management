import React from "react";
import { motion } from "framer-motion";
import { Linkedin, Youtube, Instagram, Facebook, MapPin, Phone, Mail, ArrowUpRight } from "lucide-react";

const footerLinks = [
  "Business Automation",
  "Advanced Sales Projects",
  "Theory of Constraints (TOC)",
  "Lean Six Sigma & ISO",
  "Sustainability (ESG)",
];

const socials = [
  { icon: Linkedin, link: "https://www.linkedin.com/company/here-quality-excellence-pvt-ltd/" },
  { icon: Youtube, link: "https://www.youtube.com/@businessherequality4476" },
  { icon: Instagram, link: "https://www.instagram.com/herequality/?igshid=YmMyMTA2M2Y%3D" },
  { icon: Facebook, link: "https://www.facebook.com/herequalitymanagementconsulting?mibextid=LQQJ4d" },
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
    <footer
      className="k-band-dark border-t k-band-pad pt-12 md:pt-16 pb-8 md:pb-10"
      style={{ borderColor: "var(--k-dark-border)" }}
    >
      <div className="max-w-7xl mx-auto">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-40px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12 mb-10 md:mb-16"
        >

          {/* Column 1: Brand & Address */}
          <motion.div variants={itemVariants} className="space-y-6">
            <motion.img
              src="/kayaara-logo-white.png"
              alt="KAYAARA"
              className="h-10 md:h-12 w-auto object-contain"
              whileHover={{ scale: 1.03 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
              onError={(e) => { e.target.src = "/kayaara-logo.png"; }}
            />
            <div className="flex gap-3" style={{ color: "var(--k-dark-muted)" }}>
              <MapPin size={20} className="shrink-0 mt-0.5" style={{ color: "var(--k-blue)" }} />
              <p className="leading-relaxed font-light text-sm md:text-base">
                401, Sahyog Elina, Above Reliance Digital, VIP Road, Karelibaugh, Vadodara - 390018, Gujarat
              </p>
            </div>
          </motion.div>

          {/* Column 2: Key Solutions */}
          <motion.div variants={itemVariants} className="space-y-6">
            <h4
              className="text-[10px] font-semibold uppercase tracking-[0.22em]"
              style={{ color: "var(--k-dark-text)" }}
            >
              Solutions
            </h4>
            <ul className="space-y-3 font-light" style={{ color: "var(--k-dark-muted)" }}>
              {footerLinks.map((item) => (
                <motion.li
                  key={item}
                  className="text-sm cursor-pointer flex items-center gap-1 group"
                  whileHover={{ x: 4, color: "var(--k-blue)" }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  {item}
                  <ArrowUpRight
                    size={12}
                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    style={{ color: "var(--k-blue)" }}
                  />
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Column 3: Contact Details */}
          <motion.div variants={itemVariants} className="space-y-6">
            <h4
              className="text-[10px] font-semibold uppercase tracking-[0.22em]"
              style={{ color: "var(--k-dark-text)" }}
            >
              Contact Us
            </h4>
            <div className="space-y-4">
              <motion.div
                className="flex items-center gap-3"
                style={{ color: "var(--k-dark-muted)" }}
                whileHover={{ x: 3 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                <Phone size={16} style={{ color: "var(--k-blue)" }} />
                <span className="text-sm">+91 98240 11121</span>
              </motion.div>
              <motion.div
                className="flex items-center gap-3"
                style={{ color: "var(--k-dark-muted)" }}
                whileHover={{ x: 3 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                <Mail size={16} style={{ color: "var(--k-blue)" }} />
                <span className="text-sm">info@kayaara.com</span>
              </motion.div>
            </div>
          </motion.div>

          {/* Column 4: Social Links */}
          <motion.div variants={itemVariants} className="space-y-6">
            <h4
              className="text-[10px] font-semibold uppercase tracking-[0.22em]"
              style={{ color: "var(--k-dark-text)" }}
            >
              Follow Us
            </h4>
            <div className="flex gap-3">
              {socials.map((social, i) => {
                const Icon = social.icon;
                return (
                  <motion.a
                    key={i}
                    href={social.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-9 h-9 rounded-[10px] border transition-colors"
                    style={{
                      borderColor: "var(--k-dark-border)",
                      color: "var(--k-dark-muted)",
                    }}
                    whileHover={{
                      scale: 1.12,
                      borderColor: "var(--k-blue)",
                      color: "var(--k-blue)",
                      y: -2,
                    }}
                    whileTap={{ scale: 0.92 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <Icon size={18} />
                  </motion.a>
                );
              })}
            </div>
          </motion.div>
        </motion.div>

        {/* Bottom Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4"
          style={{ borderColor: "var(--k-dark-border)" }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--k-dark-muted)" }}>
            © 2026 KAYAARA Innovations Pvt Ltd. Built for Excellence.
          </p>
          <div className="flex gap-6 text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--k-dark-muted)" }}>
            {["Privacy Policy", "Terms of Service"].map((label) => (
              <motion.a
                key={label}
                href="#"
                whileHover={{ color: "var(--k-blue)", y: -1 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
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
