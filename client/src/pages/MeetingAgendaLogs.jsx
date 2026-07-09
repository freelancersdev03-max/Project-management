import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CalendarDays, FileText, Download, Check, X, Edit2, Loader2, AlertCircle, Printer } from "lucide-react";
import Sidebar from "../components/Sidebar";
import api from "../api";
import { PageHeader, Band } from "../components/kayaara/Band";

const formatDate = (dateValue) => {
    if (!dateValue) return "-";
    const [year, month, day] = dateValue.split("-");
    if (!year || !month || !day) return dateValue;
    return `${day}-${month}-${year}`;
};

const generateManualMomPdf = async (log, companyName) => {
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "portrait" });

    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;

    // Header
    doc.setFillColor(0, 134, 255);
    doc.rect(0, 0, pageWidth, 28, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont(undefined, "bold");
    doc.text("KAYAARA Innovations", margin, 17);
    doc.setFontSize(8);
    doc.setFont(undefined, "normal");
    doc.text("Minutes of Meeting", pageWidth - margin, 17, { align: "right" });

    // Title
    let y = 44;
    doc.setTextColor(33, 33, 33);
    doc.setFontSize(16);
    doc.setFont(undefined, "bold");
    doc.text("Meeting Agenda", margin, y);
    y += 8;
    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    doc.text(`Company: ${companyName}`, margin, y);
    y += 6;
    doc.text(`Date: ${formatDate(log.visit_date)}`, margin, y);

    // Meeting time
    if (log.start_time || log.end_time) {
        y += 6;
        const timeStr = [log.start_time, log.end_time].filter(Boolean).join(" - ");
        doc.text(`Time: ${timeStr}`, margin, y);
    }

    // Description
    if (log.description) {
        y += 10;
        doc.setFontSize(10);
        doc.setFont(undefined, "bold");
        doc.text("Description:", margin, y);
        y += 5;
        doc.setFont(undefined, "normal");
        const descLines = doc.splitTextToSize(log.description, contentWidth);
        doc.setFontSize(9);
        descLines.forEach((line) => {
            if (y > 275) { doc.addPage(); y = 20; }
            doc.text(line, margin, y);
            y += 5;
        });
    }

    // Points
    y += 8;
    doc.setFontSize(12);
    doc.setFont(undefined, "bold");
    doc.text("Agenda Points", margin, y);
    y += 4;
    doc.setDrawColor(0, 134, 255);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    const items = Array.isArray(log.items) ? log.items : [];
    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    items.forEach((item, i) => {
        const text = item.point || item.activity || item.output || `Item ${i + 1}`;
        const lines = doc.splitTextToSize(text, contentWidth - 8);
        const lineHeight = 6;
        const blockHeight = lines.length * lineHeight + 2;

        if (y + blockHeight > 275) {
            doc.addPage();
            y = 20;
            doc.setFontSize(10);
            doc.setFont(undefined, "normal");
        }

        // Number circle
        doc.setFillColor(0, 134, 255);
        doc.circle(margin + 3, y - 1, 3.5, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        doc.setFont(undefined, "bold");
        doc.text(String(i + 1), margin + 3, y + 1, { align: "center" });
        doc.setTextColor(51, 51, 51);
        doc.setFontSize(9);
        doc.setFont(undefined, "normal");
        lines.forEach((line) => {
            doc.text(line, margin + 10, y);
            y += lineHeight;
        });
        y += 3;
    });

    doc.save(`MOM_${companyName.replace(/\s+/g, "_")}_${log.visit_date}.pdf`);
};

const MeetingAgendaLogs = () => {
    const { clientId } = useParams();
    const navigate = useNavigate();

    const [companyName, setCompanyName] = useState("Company");
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [editingId, setEditingId] = useState(null);
    const [editText, setEditText] = useState("");
    const [savingId, setSavingId] = useState(null);
    const [saveError, setSaveError] = useState("");
    const [pdfGeneratingId, setPdfGeneratingId] = useState(null);

    useEffect(() => {
        const loadClientAndLogs = async () => {
            if (!clientId) return;
            try {
                setLoading(true);
                setError("");

                const [clientRes, logsRes] = await Promise.all([
                    api.get(`/clients/${clientId}/`),
                    api.get(`/meeting-agenda/clients/${clientId}/logs/`),
                ]);

                setCompanyName(clientRes.data?.company_name || "Company");
                const logEntries = Array.isArray(logsRes.data) ? logsRes.data : [];
                // Sort: most recent first
                logEntries.sort((a, b) => new Date(b.visit_date || b.created_at) - new Date(a.visit_date || a.created_at));
                setLogs(logEntries);
            } catch (err) {
                console.error("Failed to load visit logs:", err);
                setError("Unable to load visit log data.");
            } finally {
                setLoading(false);
            }
        };

        loadClientAndLogs();
    }, [clientId]);

    const handleStartEdit = (log) => {
        setEditingId(log.id);
        setEditText(log.description || "");
        setSaveError("");
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditText("");
        setSaveError("");
    };

    const handleSaveDescription = async (logId) => {
        setSavingId(logId);
        setSaveError("");
        try {
            await api.patch(`/meeting-agenda/clients/${clientId}/logs/${logId}/`, { description: editText });
            setLogs((prev) =>
                prev.map((l) => (l.id === logId ? { ...l, description: editText } : l))
            );
            setEditingId(null);
        } catch (err) {
            console.error("Failed to update description:", err);
            setSaveError("Failed to save. Please try again.");
        } finally {
            setSavingId(null);
        }
    };

    const getMomUrl = (log) => {
        return log.mom_file_url || (log.mom_file ? log.mom_file : null);
    };

    const isManualMom = (log) => {
        return !getMomUrl(log) && Array.isArray(log.items) && log.items.length > 0;
    };

    const handleDownloadPdf = async (log) => {
        setPdfGeneratingId(log.id);
        try {
            await generateManualMomPdf(log, companyName);
        } catch (err) {
            console.error("PDF generation failed:", err);
        } finally {
            setPdfGeneratingId(null);
        }
    };

    return (
        <div className="h-screen w-screen flex overflow-hidden" style={{ background: "var(--k-white)", fontFamily: "Poppins, sans-serif" }}>
            <Sidebar />

            <div className="flex-1 flex flex-col overflow-hidden">
                <PageHeader
                    title="Meeting"
                    accent="MOM"
                    subtitle={companyName}
                    backTo="/meetingagenda"
                    actions={
                        <button
                            onClick={() => navigate(`/meetingagenda/${clientId}`)}
                            className="k-btn-primary text-xs"
                        >
                            Upload New MOM
                        </button>
                    }
                />

                <main className="flex-1 overflow-y-auto k-scroll">
                    <Band tone="grey" title="Meeting records &amp; MOMs">
                        {loading && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                                {Array.from({ length: 6 }).map((_, idx) => (
                                    <div key={idx} className="k-skeleton h-[120px]" />
                                ))}
                            </div>
                        )}

                        {!loading && error && (
                            <div className="k-card-static px-4 py-3 text-sm font-semibold" style={{ color: "var(--k-ink)" }}>
                                {error}
                            </div>
                        )}

                        {!loading && !error && logs.length === 0 && (
                            <div className="k-card flex flex-col items-center justify-center text-center py-14 px-6">
                                <img src="/kayaara-mark.png" alt="" className="w-12 h-12 opacity-70 mb-3" />
                                <p className="text-sm font-semibold" style={{ color: "var(--k-ink)" }}>No meeting records found</p>
                                <p className="text-xs mt-1" style={{ color: "var(--k-grey-500)" }}>
                                    Upload a MOM file for {companyName} to get started.
                                </p>
                            </div>
                        )}

                        {!loading && !error && logs.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                                {logs.map((log, index) => {
                                    const momUrl = getMomUrl(log);
                                    return (
                                        <motion.div
                                            key={log.id}
                                            initial={{ opacity: 0, y: 16 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                                            className="k-card p-4 flex flex-col gap-3"
                                        >
                                            {/* Date + Download row */}
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--k-blue-tint)" }}>
                                                        <CalendarDays size={16} style={{ color: "var(--k-blue)" }} />
                                                    </div>
                                                    <div>
                                                        <p className="k-eyebrow">Visit Date</p>
                                                        <p className="text-sm font-bold" style={{ color: "var(--k-ink)" }}>
                                                            {formatDate(log.visit_date)}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 shrink-0">
                                                    {/* File MOMs: download original file */}
                                                    {momUrl && (
                                                        <a href={momUrl} target="_blank" rel="noopener noreferrer"
                                                            className="k-btn-primary !p-0 w-9 h-9 flex items-center justify-center"
                                                            title="Download MOM"
                                                        >
                                                            <Download size={15} />
                                                        </a>
                                                    )}
                                                    {/* Manual MOMs: generate PDF */}
                                                    {isManualMom(log) && (
                                                        <button onClick={() => handleDownloadPdf(log)}
                                                            disabled={pdfGeneratingId === log.id}
                                                            className="k-btn-primary !p-0 w-9 h-9 flex items-center justify-center"
                                                            title="Download PDF"
                                                        >
                                                            {pdfGeneratingId === log.id ? <Loader2 size={14} className="animate-spin" /> : <Printer size={15} />}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Type indicator */}
                                            {momUrl && (
                                                <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "var(--k-grey-100)" }}>
                                                    <FileText size={14} style={{ color: "var(--k-blue)" }} />
                                                    <span className="text-xs font-semibold truncate" style={{ color: "var(--k-grey-700)" }}>
                                                        File MOM
                                                    </span>
                                                </div>
                                            )}
                                            {isManualMom(log) && (
                                                <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "var(--k-blue-tint)" }}>
                                                    <Printer size={14} style={{ color: "var(--k-blue)" }} />
                                                    <span className="text-xs font-semibold" style={{ color: "var(--k-blue)" }}>
                                                        {log.items.length} point{log.items.length > 1 ? "s" : ""}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Description */}
                                            {editingId === log.id ? (
                                                <div className="space-y-2">
                                                    <textarea
                                                        value={editText}
                                                        onChange={(e) => setEditText(e.target.value)}
                                                        placeholder="Add a description..."
                                                        rows={2}
                                                        className="k-input !resize-y text-sm"
                                                        autoFocus
                                                    />
                                                    {saveError && (
                                                        <p className="text-xs font-semibold" style={{ color: "#ef4444" }}>{saveError}</p>
                                                    )}
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => handleSaveDescription(log.id)}
                                                            disabled={savingId === log.id}
                                                            className="k-btn-primary !p-0 w-8 h-8 flex items-center justify-center text-xs"
                                                        >
                                                            {savingId === log.id ? (
                                                                <Loader2 size={14} className="animate-spin" />
                                                            ) : (
                                                                <Check size={14} />
                                                            )}
                                                        </button>
                                                        <button
                                                            onClick={handleCancelEdit}
                                                            className="k-btn-ghost !p-0 w-8 h-8 flex items-center justify-center text-xs"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div
                                                    onClick={() => handleStartEdit(log)}
                                                    className="group flex items-start gap-2 cursor-pointer rounded-lg px-2 -mx-2 py-1 transition-colors hover:bg-[var(--k-grey-100)]"
                                                >
                                                    <p className="text-xs leading-relaxed flex-1" style={{ color: log.description ? "var(--k-grey-700)" : "var(--k-grey-400)" }}>
                                                        {log.description || "Click to add description..."}
                                                    </p>
                                                    <Edit2 size={12} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" style={{ color: "var(--k-grey-400)" }} />
                                                </div>
                                            )}
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </Band>
                </main>
            </div>
        </div>
    );
};

export default MeetingAgendaLogs;
