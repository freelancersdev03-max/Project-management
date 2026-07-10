import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Award, Calendar, Bell, Clock } from "lucide-react";
import api from "../api";

const ICON_MAP = {
  "file-text": FileText,
  award: Award,
  calendar: Calendar,
  bell: Bell,
};

const TYPE_LABELS = {
  mom: "MOM",
  achievement: "Achievement",
  mctc: "MCTC",
  notification: "Notification",
};

const LiveFeed = ({ userId }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);
  const intervalRef = useRef(null);
  const speedRef = useRef(1); // pixels per tick

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchFeed = async () => {
      try {
        const res = await api.get("/meeting-agenda/feed/");
        setItems(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Failed to load feed:", err);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFeed();
    const pollTimer = setInterval(fetchFeed, 30000);
    return () => clearInterval(pollTimer);
  }, [userId]);

  // Auto-scroll
  useEffect(() => {
    if (!items.length) return;

    const el = scrollRef.current;
    if (!el) return;

    let tick = 0;
    let isPaused = false;

    const handleMouseEnter = () => { isPaused = true; };
    const handleMouseLeave = () => { isPaused = false; };

    el.addEventListener("mouseenter", handleMouseEnter);
    el.addEventListener("mouseleave", handleMouseLeave);

    intervalRef.current = setInterval(() => {
      if (isPaused || !el) return;
      tick++;
      if (tick % 3 === 0) {
        el.scrollTop += 1;
      }
      // Reset scroll to top when reaching bottom (infinite loop)
      if (el.scrollTop >= el.scrollHeight - el.clientHeight - 2) {
        el.scrollTop = 0;
      }
    }, 50);

    return () => {
      clearInterval(intervalRef.current);
      el.removeEventListener("mouseenter", handleMouseEnter);
      el.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [items]);

  const formatTimeAgo = (isoString) => {
    if (!isoString) return "";
    const then = new Date(isoString);
    const now = new Date();
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return then.toLocaleDateString();
  };

  return (
    <div className="k-card h-full p-3 lg:p-4 hover:!transform-none flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <p className="k-eyebrow flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live Feed
        </p>
        {items.length > 0 && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--k-blue-tint)", color: "var(--k-blue)" }}>
            {items.length}
          </span>
        )}
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto k-scroll pr-1 space-y-1.5"
        style={{ maxHeight: 340 }}
      >
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="k-skeleton h-[52px] rounded-xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-6">
            <Bell size={24} style={{ color: "var(--k-grey-300)" }} />
            <p className="text-xs font-semibold mt-2" style={{ color: "var(--k-grey-500)" }}>
              No recent activity
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {items.map((item, i) => {
              const IconComp = ICON_MAP[item.icon] || Bell;
              return (
                <motion.div
                  key={`${item.type}-${item.timestamp}-${i}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.3) }}
                  className="flex items-start gap-2.5 p-2.5 rounded-xl transition-colors hover:bg-[var(--k-grey-100)]"
                  style={{ background: i % 2 === 0 ? "transparent" : "var(--k-grey-50)" }}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{
                      background: item.type === "achievement" ? "#fef3c7" : item.type === "notification" ? "#dbeafe" : "var(--k-grey-100)",
                      color: item.type === "achievement" ? "#d97706" : item.type === "notification" ? "var(--k-blue)" : "var(--k-grey-600)",
                    }}
                  >
                    <IconComp size={13} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0"
                        style={{
                          background: item.type === "achievement" ? "#fef3c7" : item.type === "notification" ? "#dbeafe" : "var(--k-grey-200)",
                          color: item.type === "achievement" ? "#d97706" : item.type === "notification" ? "var(--k-blue)" : "var(--k-grey-600)",
                        }}
                      >
                        {TYPE_LABELS[item.type] || item.type}
                      </span>
                      <span className="text-[10px] font-medium" style={{ color: "var(--k-grey-400)" }}>
                        <Clock size={10} className="inline mr-0.5" />
                        {formatTimeAgo(item.timestamp)}
                      </span>
                    </div>
                    <p className="text-xs font-semibold mt-0.5 leading-snug truncate" style={{ color: "var(--k-ink)" }}>
                      {item.title}
                    </p>
                    {item.description && (
                      <p className="text-[11px] leading-relaxed mt-0.5 line-clamp-2" style={{ color: "var(--k-grey-600)" }}>
                        {item.description}
                      </p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default React.memo(LiveFeed);
