import React from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * KAYAARA band layout system v2.
 *
 * <Bands>
 *   <Band title="Overview" eyebrow="Summary">…</Band>
 *   <Band>…</Band>
 * </Bands>
 *
 * Force a tone with tone="white" | "grey" when needed.
 */

export const Bands = React.memo(({ children, className = "" }) => (
  <div className={`k-bands ${className}`}>{children}</div>
));

export const Band = React.memo(({
  title,
  eyebrow,
  actions,
  tone,
  children,
  className = "",
  delay = 0,
}) => (
  <motion.section
    initial={{ opacity: 0, y: 26 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-40px" }}
    transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    className={`k-band-pad ${
      tone === "white" ? "k-band-white" : tone === "grey" ? "k-band-grey" : ""
    } ${className}`}
  >
    {(title || actions || eyebrow) && (
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          {eyebrow ? (
            <motion.p
              initial={{ opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: delay + 0.05 }}
              className="k-eyebrow mb-1.5"
            >
              {eyebrow}
            </motion.p>
          ) : null}
          {title ? (
            <motion.h2
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: delay + 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="k-section-title"
            >
              {title}
            </motion.h2>
          ) : null}
        </div>
        {actions ? (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: delay + 0.2 }}
            className="flex items-center gap-2"
          >
            {actions}
          </motion.div>
        ) : null}
      </div>
    )}
    {children}
  </motion.section>
));

/**
 * PageHeader — always the first (white) band of a page.
 * Back arrow · title with blue accent word · right-side actions.
 */
export const PageHeader = React.memo(({
  title,
  accent,
  subtitle,
  actions,
  backTo,
  live = false,
}) => {
  const navigate = useNavigate();
  return (
    <motion.header
      initial={{ opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="k-band-white k-band-pad border-b z-10 sticky top-0"
      style={{ borderColor: "var(--k-grey-200)", backdropFilter: "blur(12px)" }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Back button */}
          <motion.button
            whileHover={{ x: -2 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => (backTo ? navigate(backTo) : navigate(-1))}
            aria-label="Go back"
            className="k-btn-ghost !p-2.5 !rounded-full shrink-0"
          >
            <ArrowLeft size={17} />
          </motion.button>

          <div>
            <div className="flex items-center gap-2">
              <h1
                className="text-lg md:text-xl font-bold"
                style={{ color: "var(--k-ink)" }}
              >
                {title}{" "}
                {accent ? (
                  <span style={{ color: "var(--k-blue)" }}>{accent}</span>
                ) : null}
              </h1>
              {live ? <span className="k-live-dot" /> : null}
            </div>
            {subtitle ? (
              <p
                className="text-xs mt-0.5"
                style={{ color: "var(--k-grey-500)" }}
              >
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>

        {actions ? (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.15 }}
            className="flex flex-wrap items-center gap-2"
          >
            {actions}
          </motion.div>
        ) : null}
      </div>
    </motion.header>
  );
});
