import React from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  HardDrive,
  Link2,
  FileText,
  GraduationCap,
  UserCheck,
  FolderKanban,
  ShieldCheck,
  MessageSquareMore,
  Package,
  Wallet,
  TrendingUp,
} from "lucide-react";

const products = [
  {
    icon: FolderKanban,
    emoji: "🏗️",
    name: "Kayaara PMS",
    description:
      "End-to-end project management system with task boards, milestone tracking, resource allocation, and automated progress reporting.",
    tag: "Project Management",
  },
  {
    icon: HardDrive,
    emoji: "💼",
    name: "Kayaara Asset Management",
    description:
      "Track, manage, and audit physical and digital assets across locations with lifecycle management, depreciation tracking, and compliance logs.",
    tag: "Asset Management",
  },
];

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 28, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24,
    },
  },
};

const Products = () => {
  return (
    <section
      id="products"
      className="k-band-white k-band-pad border-t border-b"
      style={{ borderColor: "var(--k-grey-200)" }}
    >
      <div className="max-w-7xl mx-auto py-10 md:py-20">

        {/* ── Section Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center max-w-3xl mx-auto mb-12 md:mb-20"
        >
          {/* <motion.span
            className="k-eyebrow"
            initial={{ opacity: 0, letterSpacing: "0.4em" }}
            whileInView={{ opacity: 1, letterSpacing: "0.22em" }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
          </motion.span> */}

          <h2
            className="mt-1 text-3xl md:text-5xl font-bold tracking-tight"
            style={{ color: "var(--k-ink)" }}
          >
            A complete suite for{" "}
            <span style={{ color: "var(--k-blue)" }}>modern enterprises</span>
          </h2>

          <p
            className="mt-4 text-base md:text-xl font-light max-w-2xl mx-auto leading-relaxed"
            style={{ color: "var(--k-grey-700)" }}
          >
            Twelve purpose-built modules covering every facet of your
            operations — from project oversight and compliance to finance and
            analytics.
          </p>
        </motion.div>

        {/* ── Product Cards Grid ── */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-6"
        >
          {products.map((product, index) => (
            <motion.div
              key={index}
              variants={cardVariants}
              whileHover={{
                y: -6,
                scale: 1.02,
                borderColor: "var(--k-blue)",
                boxShadow: "0 16px 40px -12px rgba(0, 134, 255, 0.15)",
                transition: { type: "spring", stiffness: 400, damping: 20 },
              }}
              whileTap={{ scale: 0.98 }}
              className="group p-6 flex flex-col justify-between cursor-pointer rounded-2xl border transition-all"
              style={{
                background: "var(--k-band-grey)",
                borderColor: "var(--k-grey-200)",
              }}
            >
              {/* Top: Icon + Tag */}
              <div>
                <div className="flex items-center justify-between mb-5">
                  <motion.div
                    className="flex items-center justify-center h-14 w-14 rounded-2xl text-2xl"
                    style={{
                      background: "var(--k-blue-tint)",
                    }}
                    whileHover={{
                      rotate: [0, -8, 8, 0],
                      transition: { duration: 0.5 },
                    }}
                  >
                    {product.emoji}
                  </motion.div>

                  <span
                    className="px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider"
                    style={{
                      background: "var(--k-blue-tint)",
                      color: "var(--k-blue)",
                    }}
                  >
                    {product.tag}
                  </span>
                </div>

                {/* Product Name */}
                <h3
                  className="text-lg font-bold tracking-tight mb-2 transition-colors"
                  style={{ color: "var(--k-ink)" }}
                >
                  {product.name}
                </h3>

                {/* Description */}
                <p
                  className="text-xs leading-relaxed font-light"
                  style={{ color: "var(--k-grey-700)" }}
                >
                  {product.description}
                </p>
              </div>

              {/* Footer link */}
              <motion.div
                className="mt-6 pt-4 border-t flex items-center justify-between text-[10px] font-bold uppercase tracking-wider"
                style={{
                  borderColor: "var(--k-grey-200)",
                  color: "var(--k-blue)",
                }}
                whileHover={{ x: 4 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <span>Learn more</span>
                <span className="transition-transform group-hover:translate-x-1">
                  →
                </span>
              </motion.div>
            </motion.div>
          ))}
        </motion.div>

        {/* ── Bottom helper text ── */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center mt-12 text-xs font-medium"
          style={{ color: "var(--k-grey-500)" }}
        >
          All modules integrate seamlessly with each other and support
          role-based access, audit trails, and GxP compliance.
        </motion.p>
      </div>
    </section>
  );
};

export default Products;
