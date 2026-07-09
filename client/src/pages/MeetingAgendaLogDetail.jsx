import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { FileText, Download, CalendarDays, Printer, Loader2 } from "lucide-react";
import Sidebar from "../components/Sidebar";
import api from "../api";
import { PageHeader, Band } from "../components/kayaara/Band";

const formatDate = (dateValue) => {
    if (!dateValue) return "-";
    const [year, month, day] = dateValue.split("-");
    if (!year || !month || !day) return dateValue;
    return `${day}-${month}-${year}`;
};

const generatePdf = async (log, companyName) => {
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "portrait" });
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;

    doc.setFillColor(0, 134, 255);
    doc.rect(0, 0, pageWidth, 28, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont(undefined, "bold");
    doc.text("KAYAARA Innovations", margin, 17);
    doc.setFontSize(8);
    doc.setFont(undefined, "normal");
    doc.text("Minutes of Meeting", pageWidth - margin, 17, { align: "right" });

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

    if (log.start_time || log.end_time) {
        y += 6;
        const timeStr = [log.start_time, log.end_time].filter(Boolean).join(" - ");
        doc.text(`Time: ${timeStr}`, margin, y);
    }

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

const MeetingAgendaLogDetail = () => {
    const { clientId, logId } = useParams();
    const [companyName, setCompanyName] = useState("Company");
    const [logData, setLogData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [pdfGenerating, setPdfGenerating] = useState(false);

    useEffect(() => {
        const loadDetail = async () => {
            if (!clientId || !logId) return;
            try {
                setLoading(true);
                setError("");
                const [clientRes, logRes] = await Promise.all([
                    api.get(`/clients/${clientId}/`),
                    api.get(`/meeting-agenda/clients/${clientId}/logs/${logId}/`),
                ]);
                setCompanyName(clientRes.data?.company_name || "Company");
                setLogData(logRes.data || null);
            } catch (err) {
                setError("Unable to load record.");
            } finally {
                setLoading(false);
            }
        };
        loadDetail();
    }, [clientId, logId]);

    const momUrl = logData?.mom_file_url || logData?.mom_file || null;
    const items = Array.isArray(logData?.items) ? logData.items : [];
    const isManual = !momUrl && items.length > 0;

    const handleDownloadPdf = async () => {
        setPdfGenerating(true);
        try { await generatePdf(logData, companyName); }
        catch (err) { console.error(err); }
        finally { setPdfGenerating(false); }
    };

    return (
        <div className="h-screen w-screen flex overflow-hidden" style={{ background: "var(--k-white)", fontFamily: "Poppins, sans-serif" }}>
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <PageHeader title="Meeting" accent="Record" subtitle={companyName} backTo={`/meetingagenda/${clientId}/logs`} />
                <main className="flex-1 overflow-y-auto k-scroll">
                    <Band tone="grey">
                        {loading && (
                            <div className="k-card p-6 space-y-4">
                                <div className="k-skeleton h-6 w-40" />
                                <div className="k-skeleton h-4 w-64" />
                                <div className="k-skeleton h-20 w-full" />
                            </div>
                        )}
                        {!loading && error && (
                            <div className="k-card-static px-4 py-3 text-sm font-semibold" style={{ color: "var(--k-ink)" }}>{error}</div>
                        )}
                        {!loading && !error && logData && (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto space-y-5">
                                {/* Date card */}
                                <div className="k-card p-5 flex items-center gap-4 justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "var(--k-blue-tint)" }}>
                                            <CalendarDays size={24} style={{ color: "var(--k-blue)" }} />
                                        </div>
                                        <div>
                                            <p className="k-eyebrow">Visit Date</p>
                                            <p className="text-xl font-bold" style={{ color: "var(--k-ink)" }}>{formatDate(logData.visit_date)}</p>
                                        {(logData.start_time || logData.end_time) && (
                                            <p className="text-xs font-medium mt-0.5" style={{ color: "var(--k-grey-500)" }}>
                                                {[logData.start_time, logData.end_time].filter(Boolean).join(" - ")}
                                            </p>
                                        )}
                                    </div>
                                    </div>
                                    {/* Download for manual MOMs */}
                                    {isManual && (
                                        <button onClick={handleDownloadPdf} disabled={pdfGenerating}
                                            className="k-btn-primary flex items-center gap-2 text-sm"
                                        >
                                            {pdfGenerating ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
                                            {pdfGenerating ? "Generating..." : "Download PDF"}
                                        </button>
                                    )}
                                </div>

                                {/* File MOM download */}
                                {momUrl && (
                                    <div className="k-card p-5 flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "var(--k-blue-tint)" }}>
                                            <FileText size={24} style={{ color: "var(--k-blue)" }} />
                                        </div>
                                        <div className="flex-1">
                                            <p className="k-eyebrow">MOM File</p>
                                            <p className="text-sm font-bold" style={{ color: "var(--k-ink)" }}>Minutes of Meeting</p>
                                        </div>
                                        <a href={momUrl} target="_blank" rel="noopener noreferrer" className="k-btn-primary flex items-center gap-2 text-sm">
                                            <Download size={16} /> Download
                                        </a>
                                    </div>
                                )}

                                {/* Description */}
                                {logData.description && (
                                    <div className="k-card p-5">
                                        <p className="k-eyebrow mb-2">Description</p>
                                        <p className="text-sm leading-relaxed" style={{ color: "var(--k-grey-700)" }}>{logData.description}</p>
                                    </div>
                                )}

                                {/* Manual MOM — agenda points */}
                                {isManual && items.length > 0 && (
                                    <div className="k-card p-5">
                                        <p className="k-eyebrow mb-3">Agenda Points</p>
                                        <div className="space-y-2">
                                            {items.map((item, i) => (
                                                <div key={i} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: "var(--k-grey-50)" }}>
                                                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0" style={{ background: "var(--k-blue)", color: "white" }}>
                                                        {i + 1}
                                                    </span>
                                                    <div className="flex-1">
                                                        <p className="text-sm leading-relaxed" style={{ color: "var(--k-grey-700)" }}>
                                                            {item.point || item.activity || item.output || "-"}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </Band>
                </main>
            </div>
        </div>
    );
};

export default MeetingAgendaLogDetail;
