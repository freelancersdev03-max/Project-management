import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, Plus, Trash2, CalendarDays, Clock, Video } from "lucide-react";
import Sidebar from "../components/Sidebar";
import api from "../api";
import { PageHeader, Band } from "../components/kayaara/Band";

const MeetingAgenda = () => {
    const { clientId } = useParams();
    const navigate = useNavigate();

    const [companyName, setCompanyName] = useState("Company");
    const fileInputRef = useRef(null);

    // Upload state
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    // Manual MOM state
    const [visitDate, setVisitDate] = useState(() => new Date().toISOString().split("T")[0]);
    const [meetingStartTime, setMeetingStartTime] = useState("");
    const [meetingEndTime, setMeetingEndTime] = useState("");
    const [momDescription, setMomDescription] = useState("");
    const [points, setPoints] = useState([{ text: "" }]);

    // Shared
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [dragOver, setDragOver] = useState(false);

    useEffect(() => {
        const loadClient = async () => {
            if (!clientId) return;
            try {
                const res = await api.get(`/clients/${clientId}/`);
                setCompanyName(res.data?.company_name || "Company");
            } catch { /* ignore */ }
        };
        loadClient();
    }, [clientId]);

    // ── Upload handlers ──

    const handleFileSelect = useCallback((file) => {
        if (!file) return;
        if (file.size > 20 * 1024 * 1024) { setError("File size exceeds 20MB limit."); return; }
        const ext = "." + file.name.split(".").pop().toLowerCase();
        if (![".pdf", ".doc", ".docx"].includes(ext)) { setError("Only PDF, DOC, and DOCX files are supported."); return; }
        setError("");
        setSelectedFile(file);
    }, []);

    const handleUpload = async () => {
        if (!selectedFile) { setError("Select a file first."); return; }
        setUploading(true); setError("");
        try {
            const fd = new FormData();
            fd.append("mom_file", selectedFile);
            await api.post(`/meeting-agenda/clients/${clientId}/upload-mom/`, fd, { headers: { "Content-Type": "multipart/form-data" } });
            setSuccess(true);
            setTimeout(() => navigate(`/meetingagenda/${clientId}/logs`), 1200);
        } catch (err) {
            setError(err.response?.data?.error || "Upload failed.");
        } finally { setUploading(false); }
    };

    // ── Manual MOM handlers ──

    const addPoint = () => setPoints((p) => [...p, { text: "" }]);
    const removePoint = (i) => setPoints((p) => (p.length > 1 ? p.filter((_, idx) => idx !== i) : p));
    const updatePoint = (i, val) => setPoints((p) => p.map((pt, idx) => (idx === i ? { ...pt, text: val } : pt)));

    const handleSaveManual = async () => {
        const validPoints = points.filter((p) => p.text.trim());
        if (validPoints.length === 0) { setError("Add at least one agenda point."); return; }
        if (!visitDate) { setError("Select a date."); return; }

        setUploading(true); setError("");
        try {
            await api.post(`/meeting-agenda/clients/${clientId}/create-manual-mom/`, {
                visit_date: visitDate,
                meeting_start_time: meetingStartTime,
                meeting_end_time: meetingEndTime,
                description: momDescription.trim(),
                items: validPoints.map((p) => ({ point: p.text.trim() })),
            });
            setSuccess(true);
            setTimeout(() => navigate(`/meetingagenda/${clientId}/logs`), 1200);
        } catch (err) {
            setError(err.response?.data?.error || "Failed to save MOM.");
        } finally { setUploading(false); }
    };

    const formatFileSize = (b) => {
        if (b < 1024) return b + " B";
        if (b < 1048576) return (b / 1024).toFixed(1) + " KB";
        return (b / 1048576).toFixed(1) + " MB";
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
                        <h3 className="text-xl font-bold" style={{ color: "var(--k-ink)" }}>MOM saved!</h3>
                        <p className="text-sm" style={{ color: "var(--k-grey-600)" }}>Redirecting...</p>
                    </motion.div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen w-screen flex overflow-hidden" style={{ background: "var(--k-white)", fontFamily: "Poppins, sans-serif" }}>
            <Sidebar />

            <div className="flex-1 flex flex-col overflow-hidden">
                <PageHeader title="Meeting" accent="Agenda" subtitle={companyName} backTo="/meetingagenda" />

                <main className="flex-1 overflow-y-auto k-scroll">
                    <Band tone="grey">
                        <div className="max-w-3xl mx-auto space-y-6">

                            {/* ═══ START LIVE MEETING ═══ */}
                            <motion.div
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="k-card p-4"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-3 flex-1">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(34,197,94,0.15)" }}>
                                            <Video size={20} style={{ color: "#22c55e" }} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold" style={{ color: "var(--k-ink)" }}>Start a live meeting</p>
                                            <p className="text-xs" style={{ color: "var(--k-grey-500)" }}>Video call with AI-powered note-taking</p>
                                        </div>
                                    </div>
                                    <motion.button
                                        onClick={() => navigate(`/meetingagenda/${clientId}/meeting`)}
                                        className="k-btn-primary text-xs flex items-center gap-1.5 shrink-0"
                                        style={{ background: "#22c55e", borderColor: "#22c55e" }}
                                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                                    >
                                        <Video size={14} />
                                        Start Meeting
                                    </motion.button>
                                </div>
                            </motion.div>

                            {/* ═══ COMPACT FILE UPLOAD ═══ */}
                            <motion.div
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="k-card p-4"
                            >
                                <div className="flex items-center gap-4">
                                    <div
                                        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFileSelect(e.dataTransfer.files[0]); }}
                                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                        onDragLeave={() => setDragOver(false)}
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex items-center gap-3 flex-1 cursor-pointer rounded-xl border-2 border-dashed px-4 py-3 transition-colors"
                                        style={{
                                            borderColor: dragOver ? "var(--k-blue)" : "var(--k-grey-300)",
                                            background: dragOver ? "var(--k-blue-tint)" : "transparent",
                                        }}
                                    >
                                        <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" onChange={(e) => handleFileSelect(e.target.files[0])} className="hidden" />
                                        {selectedFile ? (
                                            <>
                                                <FileText size={20} style={{ color: "var(--k-blue)" }} />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold truncate" style={{ color: "var(--k-ink)" }}>{selectedFile.name}</p>
                                                    <p className="text-[10px]" style={{ color: "var(--k-grey-500)" }}>{formatFileSize(selectedFile.size)}</p>
                                                </div>
                                                <button onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }} className="text-xs font-semibold px-2.5 py-1 rounded-lg" style={{ color: "var(--k-grey-600)", background: "var(--k-grey-100)" }}>Remove</button>
                                            </>
                                        ) : (
                                            <>
                                                <Upload size={20} style={{ color: "var(--k-grey-500)" }} />
                                                <span className="text-sm" style={{ color: "var(--k-grey-500)" }}>Drop MOM file here or click to browse</span>
                                            </>
                                        )}
                                    </div>
                                    <motion.button
                                        onClick={handleUpload}
                                        disabled={uploading || !selectedFile}
                                        className="k-btn-primary shrink-0 text-xs flex items-center gap-1.5"
                                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                                    >
                                        {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                                        {uploading ? "Uploading..." : "Upload"}
                                    </motion.button>
                                </div>
                            </motion.div>

                            {/* ═══ DIVIDER ═══ */}
                            <div className="flex items-center gap-4">
                                <div className="flex-1 h-px" style={{ background: "var(--k-grey-200)" }} />
                                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--k-grey-500)" }}>Or create manually</span>
                                <div className="flex-1 h-px" style={{ background: "var(--k-grey-200)" }} />
                            </div>

                            {/* ═══ MANUAL MOM CREATOR ═══ */}
                            <motion.div
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="k-card p-5 space-y-4"
                            >
                                <h3 className="text-base font-bold" style={{ color: "var(--k-ink)" }}>Create MOM Manually</h3>

                                {/* Date + Meeting Time */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                        <label className="k-label" style={{ color: "var(--k-grey-700)" }}>Date</label>
                                        <div className="relative mt-1">
                                            <CalendarDays size={16} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--k-grey-400)" }} />
                                            <input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} className="k-input" style={{ paddingLeft: "2.5rem" }} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="k-label" style={{ color: "var(--k-grey-700)" }}>Start Time <span style={{ color: "var(--k-grey-500)" }}>(optional)</span></label>
                                        <div className="relative mt-1">
                                            <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--k-grey-400)" }} />
                                            <input type="time" value={meetingStartTime} onChange={(e) => setMeetingStartTime(e.target.value)} className="k-input" style={{ paddingLeft: "2.5rem" }} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="k-label" style={{ color: "var(--k-grey-700)" }}>End Time <span style={{ color: "var(--k-grey-500)" }}>(optional)</span></label>
                                        <div className="relative mt-1">
                                            <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--k-grey-400)" }} />
                                            <input type="time" value={meetingEndTime} onChange={(e) => setMeetingEndTime(e.target.value)} className="k-input" style={{ paddingLeft: "2.5rem" }} />
                                        </div>
                                    </div>
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="k-label" style={{ color: "var(--k-grey-700)" }}>Description <span style={{ color: "var(--k-grey-500)" }}>(optional)</span></label>
                                    <textarea value={momDescription} onChange={(e) => setMomDescription(e.target.value)} placeholder="Meeting summary or notes..." rows={2} className="k-input !resize-y mt-1" />
                                </div>

                                {/* Points */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="k-label" style={{ color: "var(--k-grey-700)" }}>Agenda Points</label>
                                        <button onClick={addPoint} className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg transition-colors" style={{ color: "var(--k-blue)", background: "var(--k-blue-tint)" }}>
                                            <Plus size={12} /> Add Point
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        <AnimatePresence initial={false}>
                                            {points.map((pt, i) => (
                                                <motion.div
                                                    key={i}
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: "auto" }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    transition={{ duration: 0.2 }}
                                                    className="flex items-start gap-2"
                                                >
                                                    <span className="mt-2.5 text-xs font-bold shrink-0 w-5 text-center" style={{ color: "var(--k-blue)" }}>{i + 1}.</span>
                                                    <input
                                                        value={pt.text}
                                                        onChange={(e) => updatePoint(i, e.target.value)}
                                                        placeholder={`Point ${i + 1}`}
                                                        className="k-input flex-1 text-sm"
                                                    />
                                                    <button onClick={() => removePoint(i)} className="mt-1.5 p-1.5 rounded-lg transition-colors" style={{ color: "var(--k-grey-400)" }}
                                                        onMouseEnter={(e) => e.currentTarget.style.color = "#ef4444"}
                                                        onMouseLeave={(e) => e.currentTarget.style.color = "var(--k-grey-400)"}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-3 pt-1">
                                    <motion.button
                                        onClick={handleSaveManual}
                                        disabled={uploading}
                                        className="k-btn-primary flex items-center gap-2 text-sm"
                                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                                    >
                                        {uploading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                                        {uploading ? "Saving..." : "Save as MOM"}
                                    </motion.button>
                                </div>
                            </motion.div>

                            {/* Error */}
                            <AnimatePresence>
                                {error && (
                                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                        className="flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold"
                                        style={{ color: "var(--k-ink)", background: "#fef2f2", borderColor: "#fecaca" }}
                                    >
                                        <AlertCircle size={16} style={{ color: "#ef4444" }} /> {error}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="text-center">
                                <button onClick={() => navigate(`/meetingagenda/${clientId}/logs`)} className="k-btn-ghost text-sm">View all MOMs</button>
                            </div>

                        </div>
                    </Band>
                </main>
            </div>
        </div>
    );
};

export default MeetingAgenda;
