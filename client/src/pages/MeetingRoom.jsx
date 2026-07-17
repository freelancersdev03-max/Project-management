import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Video, PhoneOff, MessageSquare, Plus, Clock,
  Loader2, CheckCircle, AlertCircle,
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import api from "../api";
import { PageHeader, Band } from "../components/kayaara/Band";

const MeetingRoom = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();

  const [companyName, setCompanyName] = useState("Company");
  const [session, setSession] = useState(null);
  const [jitsiRoom, setJitsiRoom] = useState("");
  const [notes, setNotes] = useState([]);
  const [noteInput, setNoteInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState("00:00");
  const [success, setSuccess] = useState(false);
  const iframeRef = useRef(null);
  const noteInputRef = useRef(null);

  // Load client name
  useEffect(() => {
    if (!clientId) return;
    api.get(`/clients/${clientId}/`).then((res) => {
      setCompanyName(res.data?.company_name || "Company");
    }).catch(() => {});
  }, [clientId]);

  // Start the meeting session
  const startMeeting = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.post(`/meeting-agenda/clients/${clientId}/sessions/start/`);
      setSession(res.data);
      setJitsiRoom(res.data.jitsi_room);
    } catch (err) {
      setError("Failed to start meeting session.");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    startMeeting();
  }, [startMeeting]);

  // Timer
  useEffect(() => {
    if (!session?.started_at || ending) return;
    const tick = () => {
      const start = new Date(session.started_at).getTime();
      const diff = Math.floor((Date.now() - start) / 1000);
      const m = String(Math.floor(diff / 60)).padStart(2, "0");
      const s = String(diff % 60).padStart(2, "0");
      setElapsed(`${m}:${s}`);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [session, ending]);

  // Add a note
  const handleAddNote = async () => {
    const text = noteInput.trim();
    if (!text || !session) return;
    try {
      const res = await api.post(
        `/meeting-agenda/clients/${clientId}/sessions/${session.id}/add-note/`,
        { text }
      );
      setNotes(res.data.notes || []);
      setNoteInput("");
      noteInputRef.current?.focus();
    } catch (err) {
      setError("Failed to save note.");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAddNote();
    }
  };

  // End meeting
  const handleEndMeeting = async () => {
    if (!session) return;
    setEnding(true);
    try {
      const res = await api.post(
        `/meeting-agenda/clients/${clientId}/sessions/${session.id}/end/`
      );
      setSuccess(true);
      setTimeout(() => {
        navigate(res.data.redirect_url || `/meetingagenda/${clientId}/logs`);
      }, 1500);
    } catch (err) {
      setError("Failed to end meeting.");
      setEnding(false);
    }
  };

  if (success) {
    return (
      <div className="h-screen w-screen flex overflow-hidden" style={{ background: "var(--k-white)", fontFamily: "Poppins, sans-serif" }}>
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "var(--k-blue-tint)" }}>
              <CheckCircle size={36} style={{ color: "var(--k-blue)" }} />
            </div>
            <h3 className="text-xl font-bold" style={{ color: "var(--k-ink)" }}>Meeting ended!</h3>
            <p className="text-sm" style={{ color: "var(--k-grey-600)" }}>Saving MOM and redirecting...</p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex overflow-hidden" style={{ background: "var(--k-white)", fontFamily: "Poppins, sans-serif" }}>
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <PageHeader
          title="Meeting"
          accent="Room"
          subtitle={companyName}
          live={true}
          actions={
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tabular-nums"
                style={{ background: "var(--k-grey-100)", color: "var(--k-grey-700)" }}>
                <Clock size={14} style={{ color: "var(--k-blue)" }} />
                {elapsed}
              </span>
              <button
                onClick={handleEndMeeting}
                disabled={ending || !session}
                className="k-btn-primary flex items-center gap-2 text-xs"
                style={{ background: "#ef4444", borderColor: "#ef4444" }}
              >
                {ending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <PhoneOff size={14} />
                )}
                {ending ? "Ending..." : "End Meeting"}
              </button>
            </div>
          }
        />

        <main className="flex-1 overflow-hidden flex">
          {/* ═══ VIDEO PANEL ═══ */}
          <div className="flex-1 flex flex-col bg-black relative">
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 size={32} className="animate-spin" style={{ color: "var(--k-blue)" }} />
                  <p className="text-sm font-semibold" style={{ color: "#aaa" }}>Starting meeting...</p>
                </div>
              </div>
            ) : jitsiRoom ? (
              <iframe
                ref={iframeRef}
                src={`https://meet.jit.si/${jitsiRoom}#config.startWithAudioMuted=false&config.startWithVideoMuted=false`}
                allow="camera; microphone; display-capture; autoplay"
                className="w-full h-full border-0"
                title="Meeting video"
              />
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3 opacity-50">
                  <Video size={48} style={{ color: "#666" }} />
                  <p className="text-sm" style={{ color: "#888" }}>Waiting for session...</p>
                </div>
              </div>
            )}

            {/* Overlay error */}
            {error && (
              <div className="absolute top-4 left-4 right-4 flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold bg-white/90 backdrop-blur"
                style={{ color: "var(--k-ink)", borderColor: "#fecaca" }}
              >
                <AlertCircle size={16} style={{ color: "#ef4444" }} /> {error}
                <button onClick={() => setError("")} className="ml-auto text-xs font-bold" style={{ color: "var(--k-grey-500)" }}>Dismiss</button>
              </div>
            )}
          </div>

          {/* ═══ NOTES PANEL ═══ */}
          <div className="w-80 shrink-0 flex flex-col border-l" style={{ background: "var(--k-white)", borderColor: "var(--k-grey-200)" }}>
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: "var(--k-grey-200)" }}>
              <MessageSquare size={16} style={{ color: "var(--k-blue)" }} />
              <h3 className="text-sm font-bold" style={{ color: "var(--k-ink)" }}>Meeting Notes</h3>
              <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--k-blue-tint)", color: "var(--k-blue)" }}>
                {notes.length}
              </span>
            </div>

            {/* Note input */}
            <div className="p-3 border-b" style={{ borderColor: "var(--k-grey-200)" }}>
              <div className="flex gap-2">
                <input
                  ref={noteInputRef}
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a note... (Enter to add)"
                  className="k-input flex-1 text-sm"
                  disabled={!session || ending}
                />
                <button
                  onClick={handleAddNote}
                  disabled={!noteInput.trim() || !session || ending}
                  className="k-btn-primary !p-0 w-9 h-9 flex items-center justify-center shrink-0"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* Notes list */}
            <div className="flex-1 overflow-y-auto k-scroll p-3 space-y-2">
              {notes.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-10 opacity-60">
                  <MessageSquare size={24} style={{ color: "var(--k-grey-400)" }} />
                  <p className="text-xs mt-2 font-semibold" style={{ color: "var(--k-grey-500)" }}>No notes yet</p>
                  <p className="text-[10px] mt-1" style={{ color: "var(--k-grey-400)" }}>Start typing to capture meeting notes</p>
                </div>
              ) : (
                notes.map((note, i) => {
                  const timeStr = note.timestamp
                    ? new Date(note.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    : "";
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2 }}
                      className="p-3 rounded-xl"
                      style={{ background: "var(--k-grey-50)" }}
                    >
                      <div className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                          style={{ background: "var(--k-blue)", color: "white" }}>
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs leading-relaxed" style={{ color: "var(--k-grey-700)" }}>
                            {note.text}
                          </p>
                          {timeStr && (
                            <p className="text-[10px] mt-1 font-medium" style={{ color: "var(--k-grey-400)" }}>
                              {timeStr}
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default MeetingRoom;
