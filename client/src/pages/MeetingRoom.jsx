import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Video, PhoneOff, MessageSquare, Plus, Clock,
  Loader2, CheckCircle, AlertCircle, Mic, MicOff,
  Brain, Edit3, Save,
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import VideoCall from "../components/VideoCall";
import api from "../api";
import { PageHeader } from "../components/kayaara/Band";

const AI_SERVICE_URL = "http://localhost:8765";

const MeetingRoom = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();

  const [companyName, setCompanyName] = useState("Company");
  const [session, setSession] = useState(null);
  const [roomId, setRoomId] = useState("");
  const [notes, setNotes] = useState([]);
  const [noteInput, setNoteInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState("00:00");
  const [success, setSuccess] = useState(false);

  // Audio recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState("00:00");
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recorderTimerRef = useRef(null);

  // AI processing
  const [processingAI, setProcessingAI] = useState(false);
  const [aiStep, setAiStep] = useState(""); // what AI is currently doing
  const [momPreview, setMomPreview] = useState(null); // show MOM preview?
  const [momData, setMomData] = useState({
    summary: "",
    key_points: [],
    decisions: [],
    action_items: [],
  });
  const [aiError, setAiError] = useState("");

  const noteInputRef = useRef(null);

  // Load client name
  useEffect(() => {
    if (!clientId) return;
    api.get(`/clients/${clientId}/`).then((res) => {
      setCompanyName(res.data?.company_name || "Company");
    }).catch(() => {});
  }, [clientId]);

  // Get user info from localStorage
  const userName = localStorage.getItem("username") || "User";
  const userEmail = localStorage.getItem("email") || "";

  // Start the meeting session
  const startMeeting = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.post(`/meeting-agenda/clients/${clientId}/sessions/start/`);
      setSession(res.data);
      setRoomId(res.data.jitsi_room);
      // Start recording after session created
      setTimeout(() => startRecording(), 1000);
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
    if (!session?.started_at || ending || momPreview) return;
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
  }, [session, ending, momPreview]);

  // ── Audio Recording ──

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        // Stop all tracks
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start(1000); // Collect data every second
      mediaRecorderRef.current = recorder;
      setIsRecording(true);

      // Recording duration timer
      let secs = 0;
      recorderTimerRef.current = setInterval(() => {
        secs++;
        const m = String(Math.floor(secs / 60)).padStart(2, "0");
        const s = String(secs % 60).padStart(2, "0");
        setRecordingDuration(`${m}:${s}`);
      }, 1000);
    } catch (err) {
      console.warn("Audio recording not available:", err);
      // Non-blocking — user can still type notes
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (recorderTimerRef.current) {
      clearInterval(recorderTimerRef.current);
    }
    setIsRecording(false);
  };

  const getAudioBlob = () => {
    if (audioChunksRef.current.length === 0) return null;
    return new Blob(audioChunksRef.current, { type: "audio/webm" });
  };

  // ── Notes ──

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

  // ── MOM Preview editing ──

  const updateMomField = (field, value) => {
    setMomData((prev) => ({ ...prev, [field]: value }));
  };

  const updateKeyPoint = (index, value) => {
    const points = [...momData.key_points];
    points[index] = value;
    setMomData((prev) => ({ ...prev, key_points: points }));
  };

  const removeKeyPoint = (index) => {
    setMomData((prev) => ({
      ...prev,
      key_points: prev.key_points.filter((_, i) => i !== index),
    }));
  };

  const addKeyPoint = () => {
    setMomData((prev) => ({
      ...prev,
      key_points: [...prev.key_points, ""],
    }));
  };

  // ── End Meeting with AI ──

  const handleEndMeeting = async () => {
    if (!session) return;

    setEnding(true);
    stopRecording();

    // First, end the session on backend (save raw notes)
    try {
      await api.post(
        `/meeting-agenda/clients/${clientId}/sessions/${session.id}/end/`
      );
    } catch (err) {
      console.warn("Session end saved fallback");
    }

    // Now process with AI
    setProcessingAI(true);
    setAiStep("Sending audio to AI service...");

    const audioBlob = getAudioBlob();
    const formData = new FormData();

    if (audioBlob) {
      formData.append("audio", audioBlob, `meeting-${session.id}.webm`);
    }
    formData.append("notes_json", JSON.stringify(notes || []));

    try {
      setAiStep("Transcribing speech (Hindi/Gujarati/English)...");
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 600000);
      const aiRes = await fetch(`${AI_SERVICE_URL}/process-meeting`, {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!aiRes.ok) {
        throw new Error(`AI service returned ${aiRes.status}`);
      }

      setAiStep("Generating structured MOM...");
      const aiData = await aiRes.json();

      setMomData({
        summary: aiData.mom?.summary || "",
        key_points: aiData.mom?.key_points || [],
        decisions: aiData.mom?.decisions || [],
        action_items: aiData.mom?.action_items || [],
      });
      setMomPreview(true);
      setProcessingAI(false);
    } catch (err) {
      console.error("AI processing failed:", err);
      // Fallback: save raw notes as MOM so nothing is lost
      try {
        const fallbackItems = (notes || [])
          .filter((n) => n.text?.trim())
          .map((n) => ({ point: n.text }));
        if (fallbackItems.length > 0) {
          await api.post(`/meeting-agenda/clients/${clientId}/create-manual-mom/`, {
            visit_date: new Date().toISOString().split("T")[0],
            description: `Meeting notes (${notes.length} entries) — AI service was unavailable`,
            items: fallbackItems,
          });
        }
      } catch (saveErr) {
        console.error("Fallback MOM save failed:", saveErr);
      }
      setAiError(
        "AI service is not running. Please start it from your local machine (run.bat). " +
        "Raw notes have been saved to the MOM log."
      );
      setProcessingAI(false);
      setTimeout(() => navigate(`/meetingagenda/${clientId}/logs`), 3000);
    }
  };

  // ── Save AI-generated MOM to backend ──

  const handleSaveMom = async () => {
    setProcessingAI(true);
    setAiStep("Saving MOM to log...");

    try {
      const items = [
        ...momData.key_points.filter((p) => p.trim()).map((p) => ({ point: p })),
        ...momData.decisions.filter((d) => d.trim()).map((d) => ({ point: `[Decision] ${d}` })),
        ...momData.action_items
          .filter((a) => a.task?.trim())
          .map((a) => ({
            point: `[Action] ${a.task}${a.assigned_to ? ` (→ ${a.assigned_to})` : ""}${a.deadline ? ` by ${a.deadline}` : ""}`,
          })),
      ];

      if (items.length === 0) {
        // Fallback: save raw notes
        notes.forEach((n) => {
          if (n.text?.trim()) items.push({ point: n.text });
        });
      }

      await api.post(`/meeting-agenda/clients/${clientId}/create-manual-mom/`, {
        visit_date: new Date().toISOString().split("T")[0],
        description: momData.summary || `Meeting on ${new Date().toLocaleDateString()}`,
        items: items,
        start_time: session?.started_at
          ? new Date(session.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : "",
        end_time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      });

      setSuccess(true);
      setTimeout(() => navigate(`/meetingagenda/${clientId}/logs`), 1500);
    } catch (err) {
      console.error("Failed to save MOM:", err);
      setError("Failed to save MOM. Redirecting to logs...");
      setTimeout(() => navigate(`/meetingagenda/${clientId}/logs`), 2000);
    }
  };

  // ── Render States ──

  // Success state
  if (success) {
    return (
      <div className="h-screen w-screen flex overflow-hidden" style={{ background: "var(--k-white)", fontFamily: "Poppins, sans-serif" }}>
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "var(--k-blue-tint)" }}>
              <CheckCircle size={36} style={{ color: "var(--k-blue)" }} />
            </div>
            <h3 className="text-xl font-bold" style={{ color: "var(--k-ink)" }}>MOM Saved!</h3>
            <p className="text-sm" style={{ color: "var(--k-grey-600)" }}>Redirecting to MOM logs...</p>
          </motion.div>
        </div>
      </div>
    );
  }

  // MOM Preview state
  if (momPreview) {
    return (
      <div className="h-screen w-screen flex overflow-hidden" style={{ background: "var(--k-white)", fontFamily: "Poppins, sans-serif" }}>
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <PageHeader title="MOM" accent="Preview" subtitle={companyName} />

          <main className="flex-1 overflow-y-auto k-scroll">
            <div className="k-band-grey k-band-pad">
              <div className="max-w-3xl mx-auto space-y-5">

                {/* Summary */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="k-card p-5">
                  <h3 className="k-section-title mb-3">
                    <Edit3 size={16} style={{ color: "var(--k-blue)" }} /> Meeting Summary
                  </h3>
                  <textarea
                    value={momData.summary}
                    onChange={(e) => updateMomField("summary", e.target.value)}
                    rows={3}
                    className="k-input !resize-y text-sm"
                  />
                </motion.div>

                {/* Key Points */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="k-card p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="k-section-title">
                      <MessageSquare size={16} style={{ color: "var(--k-blue)" }} /> Key Points
                    </h3>
                    <button onClick={addKeyPoint} className="k-btn-icon" title="Add point">
                      <Plus size={16} />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {momData.key_points.map((pt, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="mt-2.5 text-xs font-bold shrink-0 w-5 text-center" style={{ color: "var(--k-blue)" }}>{i + 1}.</span>
                        <input
                          value={pt}
                          onChange={(e) => updateKeyPoint(i, e.target.value)}
                          className="k-input flex-1 text-sm"
                          placeholder={`Key point ${i + 1}`}
                        />
                        <button onClick={() => removeKeyPoint(i)} className="mt-1.5 p-1.5 rounded-lg transition-colors" style={{ color: "var(--k-grey-400)" }}>
                          <span className="text-xs">✕</span>
                        </button>
                      </div>
                    ))}
                    {momData.key_points.length === 0 && (
                      <p className="text-xs" style={{ color: "var(--k-grey-400)" }}>No key points added.</p>
                    )}
                  </div>
                </motion.div>

                {/* Decisions */}
                {momData.decisions.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="k-card p-5">
                    <h3 className="k-section-title mb-3">
                      <CheckCircle size={16} style={{ color: "var(--k-blue)" }} /> Decisions
                    </h3>
                    <div className="space-y-2">
                      {momData.decisions.map((d, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: "var(--k-blue-tint)" }}>
                          <span className="text-xs font-bold shrink-0 mt-0.5" style={{ color: "var(--k-blue)" }}>✓</span>
                          <p className="text-sm" style={{ color: "var(--k-grey-700)" }}>{d}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Action Items */}
                {momData.action_items.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="k-card p-5">
                    <h3 className="k-section-title mb-3">
                      <Save size={16} style={{ color: "var(--k-blue)" }} /> Action Items
                    </h3>
                    <div className="space-y-2">
                      {momData.action_items.map((item, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: "var(--k-grey-50)" }}>
                          <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0" style={{ background: "var(--k-blue)", color: "white" }}>
                            {i + 1}
                          </span>
                          <div>
                            <p className="text-sm font-semibold" style={{ color: "var(--k-ink)" }}>{item.task}</p>
                            <p className="text-xs mt-1" style={{ color: "var(--k-grey-500)" }}>
                              {item.assigned_to && `Assigned to: ${item.assigned_to}`}
                              {item.deadline && ` • Deadline: ${item.deadline}`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Action buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <motion.button
                    onClick={handleSaveMom}
                    disabled={processingAI}
                    className="k-btn-primary flex items-center gap-2 text-sm"
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  >
                    {processingAI ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Save size={16} />
                    )}
                    {processingAI ? "Saving..." : "Save to MOM Log"}
                  </motion.button>
                  <button onClick={() => navigate(`/meetingagenda/${clientId}/logs`)} className="k-btn-ghost text-sm">
                    Discard & Go to Logs
                  </button>
                </div>

                {error && (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold" style={{ color: "var(--k-ink)", background: "#fef2f2", borderColor: "#fecaca" }}>
                    <AlertCircle size={16} style={{ color: "#ef4444" }} /> {error}
                  </div>
                )}

              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // AI Processing overlay state
  if (processingAI) {
    return (
      <div className="h-screen w-screen flex overflow-hidden" style={{ background: "var(--k-white)", fontFamily: "Poppins, sans-serif" }}>
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-5 text-center max-w-sm">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "var(--k-blue-tint)" }}>
              <Brain size={36} style={{ color: "var(--k-blue)" }} />
            </div>
            <h3 className="text-lg font-bold" style={{ color: "var(--k-ink)" }}>AI is processing your meeting...</h3>
            <div className="flex items-center gap-2">
              <Loader2 size={16} className="animate-spin" style={{ color: "var(--k-blue)" }} />
              <p className="text-sm" style={{ color: "var(--k-grey-600)" }}>{aiStep}</p>
            </div>
            <p className="text-xs" style={{ color: "var(--k-grey-400)" }}>
              This may take a few minutes for longer meetings.
              Audio is processed locally on your machine — nothing is sent to the cloud.
            </p>
            {/* Progress bar animation */}
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--k-grey-100)" }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: "var(--k-blue)" }}
                initial={{ width: "0%" }}
                animate={{ width: "90%" }}
                transition={{ duration: 180, ease: "linear" }}
              />
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Main meeting room
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
              {/* Recording indicator */}
              {isRecording && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  {recordingDuration}
                </span>
              )}
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tabular-nums"
                style={{ background: "var(--k-grey-100)", color: "var(--k-grey-700)" }}>
                <Clock size={14} style={{ color: "var(--k-blue)" }} />
                {elapsed}
              </span>
              <button
                onClick={handleEndMeeting}
                disabled={ending}
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
          <div className="flex-1 flex flex-col relative">
            {loading ? (
              <div className="flex-1 flex items-center justify-center bg-[#1a1a2e]">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 size={32} className="animate-spin" style={{ color: "#667eea" }} />
                  <p className="text-sm font-semibold" style={{ color: "#aaa" }}>Starting meeting...</p>
                </div>
              </div>
            ) : roomId ? (
              <VideoCall
                roomId={roomId}
                userName={userName}
                onEnd={handleEndMeeting}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center bg-[#1a1a2e]">
                <div className="flex flex-col items-center gap-3 opacity-50">
                  <Video size={48} style={{ color: "#666" }} />
                  <p className="text-sm" style={{ color: "#888" }}>Waiting for session...</p>
                </div>
              </div>
            )}

            {/* Recording indicator overlay */}
            {isRecording && !loading && (
              <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-2 rounded-xl backdrop-blur text-xs font-semibold z-10"
                style={{ background: "rgba(0,0,0,0.6)" }}>
                <Mic size={14} style={{ color: "#22c55e" }} /><span style={{ color: "#ccc" }}>Recording audio</span>
              </div>
            )}

            {/* Overlay error */}
            {error && (
              <div className="absolute top-4 left-4 right-4 flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold bg-white/90 backdrop-blur z-10"
                style={{ color: "var(--k-ink)", borderColor: "#fecaca" }}
              >
                <AlertCircle size={16} style={{ color: "#ef4444" }} /> {error}
                <button onClick={() => setError("")} className="ml-auto text-xs font-bold" style={{ color: "var(--k-grey-500)" }}>Dismiss</button>
              </div>
            )}
          </div>

          {/* ═══ NOTES PANEL ═══ */}
          <div className="w-80 shrink-0 flex flex-col border-l" style={{ background: "var(--k-white)", borderColor: "var(--k-grey-200)" }}>
            <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: "var(--k-grey-200)" }}>
              <MessageSquare size={16} style={{ color: "var(--k-blue)" }} />
              <h3 className="text-sm font-bold" style={{ color: "var(--k-ink)" }}>Meeting Notes</h3>
              <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--k-blue-tint)", color: "var(--k-blue)" }}>
                {notes.length}
              </span>
            </div>

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
