import React, { useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "../components/Sidebar";
import { useParams, useNavigate } from "react-router-dom";
import { Plus, Trash2, Download, X, ArrowLeft, Loader2 } from "lucide-react";
import api from "../api";
import { resolveMediaUrl } from "../utils/media";

const VisitAgenda = () => {
    const { clientId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [visitDate, setVisitDate] = useState(new Date().toISOString().split("T")[0]);
    const [companyName, setCompanyName] = useState("Jacktech Hydraulic");
    const [hqeplOptions, setHqeplOptions] = useState([]);
    const [clientLogoUrl, setClientLogoUrl] = useState(null);
    const [agendaLoaded, setAgendaLoaded] = useState(false);
    const [modalRowIndex, setModalRowIndex] = useState(null);
    const [isFinalizing, setIsFinalizing] = useState(false);
    const saveTimerRef = useRef(null);

    const emptyRow = useMemo(() => ({
        id: 1,
        activity: "",
        startTime: "",
        endTime: "",
        output: "",
        teamMembers: "",
        hqeplReps: [],
        priorTasks: "",
    }), []);

    const [rows, setRows] = useState([emptyRow]);

    useEffect(() => {
        const loadClient = async () => {
            if (!clientId) return;
            try {
                const response = await api.get(`/clients/${clientId}/`);
                setCompanyName(response.data.company_name || "");
                if (response.data.logo) {
                    setClientLogoUrl(response.data.logo);
                }
            } catch (error) {
                console.error("Failed to load client:", error);
            }
        };

        loadClient();
    }, [clientId]);

    useEffect(() => {
        const loadHQEPL = async () => {
            if (!clientId) return;
            try {
                const response = await api.get(`/visit-agenda/clients/${clientId}/team/`);
                setHqeplOptions(Array.isArray(response.data) ? response.data : []);
            } catch (error) {
                console.error("Failed to load team members:", error);
            }
        };

        loadHQEPL();
    }, [clientId]);

    useEffect(() => {
        const loadAgenda = async () => {
            if (!clientId) return;
            try {
                const response = await api.get(`/visit-agenda/clients/${clientId}/`);
                const agenda = response.data;

                if (agenda?.visit_date) {
                    setVisitDate(agenda.visit_date);
                }

                if (Array.isArray(agenda?.items) && agenda.items.length > 0) {
                    const mappedRows = agenda.items.map((item, index) => ({
                        id: index + 1,
                        activity: item.activity || "",
                        startTime: item.start_time || "",
                        endTime: item.end_time || "",
                        output: item.output || "",
                        teamMembers: item.team_members || "",
                        hqeplReps: Array.isArray(item.hqepl_reps) ? item.hqepl_reps : [],
                        priorTasks: item.prior_tasks || "",
                    }));
                    setRows(mappedRows);
                } else {
                    setRows([emptyRow]);
                }
                setAgendaLoaded(true);
            } catch (error) {
                console.error("Failed to load visit agenda:", error);
                setAgendaLoaded(true);
            }
        };

        loadAgenda();
    }, [clientId, emptyRow]);

    useEffect(() => {
        if (!agendaLoaded || !clientId) return;

        if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current);
        }

        saveTimerRef.current = setTimeout(async () => {
            try {
                await api.put(`/visit-agenda/clients/${clientId}/`, {
                    visit_date: visitDate,
                    items: rows.map((row, index) => ({
                        activity: row.activity,
                        start_time: row.startTime,
                        end_time: row.endTime,
                        output: row.output,
                        team_members: row.teamMembers,
                        hqepl_reps: Array.isArray(row.hqeplReps) ? row.hqeplReps : [],
                        prior_tasks: row.priorTasks,
                        order: index + 1,
                    })),
                });
            } catch (error) {
                console.error("Failed to auto-save visit agenda:", error);
            }
        }, 600);

        return () => clearTimeout(saveTimerRef.current);
    }, [rows, visitDate, clientId, agendaLoaded]);

    const addRow = () => {
        setRows([
            ...rows,
            {
                id: rows.length + 1,
                activity: "",
                startTime: "",
                endTime: "",
                output: "",
                teamMembers: "",
                hqeplReps: [],
                priorTasks: "",
            },
        ]);
    };

    const deleteRow = (index) => {
        const newRows = [...rows];
        newRows.splice(index, 1);
        const reindexed = newRows.map((row, i) => ({ ...row, id: i + 1 }));
        setRows(reindexed.length ? reindexed : [emptyRow]);
    };

    const updateRow = (index, field, value) => {
        const newRows = [...rows];
        newRows[index][field] = value;
        setRows(newRows);
    };

    const formatDateForDisplay = (dateValue) => {
        if (!dateValue) return "";
        const [year, month, day] = dateValue.split("-");
        if (!year || !month || !day) return dateValue;
        return `${day}-${month}-${year}`;
    };

    const getImageDataUrl = async (imageUrl) => {
        if (!imageUrl) return null;
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const rawDataUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });

            const imageElement = await new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = rawDataUrl;
            });

            const canvas = document.createElement("canvas");
            canvas.width = imageElement.naturalWidth || imageElement.width || 1;
            canvas.height = imageElement.naturalHeight || imageElement.height || 1;
            const context = canvas.getContext("2d");
            if (!context) {
                throw new Error("Failed to get canvas context");
            }

            context.drawImage(imageElement, 0, 0, canvas.width, canvas.height);

            return {
                dataUrl: canvas.toDataURL("image/png"),
                format: "PNG",
                width: canvas.width,
                height: canvas.height,
            };
        } catch (error) {
            console.warn("Failed to load image for PDF:", imageUrl, error);
            return null;
        }
    };

    const addImageContain = (doc, imageData, boxX, boxY, boxWidth, boxHeight) => {
        if (!imageData?.dataUrl || !imageData?.width || !imageData?.height) return;

        const imageRatio = imageData.width / imageData.height;
        const boxRatio = boxWidth / boxHeight;

        let renderWidth = boxWidth;
        let renderHeight = boxHeight;

        if (imageRatio > boxRatio) {
            renderHeight = boxWidth / imageRatio;
        } else {
            renderWidth = boxHeight * imageRatio;
        }

        const renderX = boxX + (boxWidth - renderWidth) / 2;
        const renderY = boxY + (boxHeight - renderHeight) / 2;
        doc.addImage(imageData.dataUrl, imageData.format, renderX, renderY, renderWidth, renderHeight);
    };

    const buildAgendaPayload = () => ({
        visit_date: visitDate,
        items: rows.map((row, index) => ({
            activity: row.activity,
            start_time: row.startTime,
            end_time: row.endTime,
            output: row.output,
            team_members: row.teamMembers,
            hqepl_reps: Array.isArray(row.hqeplReps) ? row.hqeplReps : [],
            prior_tasks: row.priorTasks,
            order: index + 1,
        })),
    });

    const handleDownloadPDF = async () => {
        if (!clientId || isFinalizing) return;

        setIsFinalizing(true);
        try {
            await api.put(`/visit-agenda/clients/${clientId}/`, buildAgendaPayload());
            await api.post(`/visit-agenda/clients/${clientId}/finalize/`, {
                visit_date: visitDate,
            });
        } catch (error) {
            console.error("Failed to save visit log before download:", error);
            window.alert("Unable to save this visit agenda into Visit Log. Please try again.");
            setIsFinalizing(false);
            return;
        }

        try {
            const { default: jsPDF } = await import("jspdf");
            const { default: autoTable } = await import("jspdf-autotable");

            const doc = jsPDF({ orientation: "landscape" });

            const pageWidth = doc.internal.pageSize.width;
            const headerX = 8;
            const headerY = 8;
            const headerWidth = pageWidth - 16;
            const headerHeight = 48;

            // Page and header card styling closer to on-screen design.
            doc.setFillColor(247, 250, 252);
            doc.rect(0, 0, pageWidth, doc.internal.pageSize.height, "F");
            doc.setFillColor(255, 255, 255);
            doc.setDrawColor(226, 232, 240);
            doc.roundedRect(headerX, headerY, headerWidth, headerHeight, 5, 5, "FD");

            const hqeplLogoData = await getImageDataUrl("/HqeplLOGO.png");
            if (hqeplLogoData) {
                try {
                    addImageContain(doc, hqeplLogoData, headerX + 6, headerY + 6, 46, 30);
                } catch (error) {
                    console.warn("Failed to add HQEPL logo to PDF", error);
                }
            }

            const clientLogoData = clientLogoUrl ? await getImageDataUrl(resolveMediaUrl(clientLogoUrl)) : null;
            if (clientLogoData) {
                try {
                    addImageContain(doc, clientLogoData, pageWidth - 70, headerY + 7, 24, 24);
                } catch (error) {
                    console.warn("Failed to add client logo to PDF", error);
                }
            }

            doc.setTextColor(15, 23, 42);
            doc.setFontSize(22);
            doc.setFont("helvetica", "bold");
            doc.text(companyName || "Client Name", pageWidth / 2, headerY + 18, { align: "center" });

            const badgeWidth = 46;
            const badgeHeight = 10;
            const badgeX = (pageWidth - badgeWidth) / 2;
            const badgeY = headerY + 26;
            doc.setFillColor(224, 236, 248);
            doc.setDrawColor(191, 219, 254);
            doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 4, 4, "FD");
            doc.setTextColor(79, 127, 179);
            doc.setFontSize(10);
            doc.text("VISIT AGENDA", pageWidth / 2, badgeY + 6.7, { align: "center" });

            const dateBoxWidth = 56;
            const dateBoxHeight = 16;
            const dateBoxX = pageWidth - dateBoxWidth - 12;
            const dateBoxY = headerY + 12;
            doc.setFillColor(248, 250, 252);
            doc.setDrawColor(203, 213, 225);
            doc.roundedRect(dateBoxX, dateBoxY, dateBoxWidth, dateBoxHeight, 4, 4, "FD");
            doc.setTextColor(148, 163, 184);
            doc.setFontSize(8.5);
            doc.text("VISIT DATE", dateBoxX + 5, dateBoxY + 6.5);
            doc.setTextColor(51, 65, 85);
            doc.setFontSize(10.5);
            doc.text(formatDateForDisplay(visitDate), dateBoxX + dateBoxWidth - 5, dateBoxY + 6.5, { align: "right" });

            // Table content mirrors visible Visit Agenda columns and labels.
            const tableData = rows.map(row => {
                const reps = hqeplOptions
                    .filter(opt => Array.isArray(row.hqeplReps) && row.hqeplReps.includes(opt.id))
                    .map(opt => opt.full_name)
                    .join(", ");

                const timeDisplay = [row.startTime || "--:--", row.endTime || "--:--"].join("\n");

                return [
                    row.id,
                    row.activity || "Activity details...",
                    timeDisplay,
                    row.output || "Expected output...",
                    row.teamMembers || "Names...",
                    reps || "-",
                    row.priorTasks || "Pre-requisites..."
                ];
            });

            autoTable(doc, {
                startY: headerY + headerHeight + 10,
                margin: { left: 8, right: 8 },
                head: [
                    [
                        "SR.\nNO.",
                        "ACTIVITY",
                        "TENTATIVE\nTIME",
                        "OUTPUT",
                        "REQUIRED TEAM\nMEMBERS",
                        "HQEPL REPRESENTATIVE",
                        "TASKS TO BE COMPLETED\nBY TEAM PRIOR TO\nVISIT"
                    ]
                ],
                body: tableData,
                theme: "grid",
                headStyles: {
                    fillColor: [79, 127, 179],
                    textColor: [255, 255, 255],
                    fontSize: 9,
                    halign: "left",
                    valign: "middle",
                    cellPadding: 4,
                    minCellHeight: 16,
                    lineColor: [147, 197, 253],
                },
                bodyStyles: {
                    textColor: [71, 85, 105],
                    valign: "middle",
                    lineColor: [226, 232, 240],
                    cellPadding: 3.5,
                    minCellHeight: 18,
                },
                styles: { fontSize: 8.5, overflow: "linebreak" },
                columnStyles: {
                    0: { halign: "center", cellWidth: 14, fontStyle: "bold" },
                    1: { cellWidth: 52 },
                    2: { cellWidth: 24 },
                    3: { cellWidth: 50 },
                    4: { cellWidth: 32 },
                    5: { cellWidth: 52 },
                    6: { cellWidth: 40 },
                },
                didParseCell: (data) => {
                    if (data.section === "body") {
                        const isEven = data.row.index % 2 === 0;
                        data.cell.styles.fillColor = isEven ? [219, 231, 244] : [238, 244, 251];
                    }
                },
            });

            doc.save(`Visit_Agenda_${companyName.replace(/\s+/g, "_")}_${visitDate}.pdf`);

            const today = new Date().toISOString().split("T")[0];
            setRows([emptyRow]);
            setVisitDate(today);
            navigate(-1);
        } catch (error) {
            console.error("Failed to generate download PDF:", error);
            window.alert("Visit log was saved, but PDF generation failed. Please try download again.");
        } finally {
            setIsFinalizing(false);
        }
    };

    return (
        <div className="h-screen w-screen bg-slate-50 text-slate-900 font-sans flex overflow-hidden">
            <Sidebar />

            <main className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 relative">
                    {/* Navigation & Actions Row */}
                    <div className="flex items-center justify-between mb-8">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2 text-slate-500 hover:text-slate-900"
                        >
                            <ArrowLeft size={18} />
                            <span className="text-xs font-bold">Back</span>
                        </button>

                        <button
                            onClick={handleDownloadPDF}
                            disabled={isFinalizing}
                            className="px-5 py-2.5 bg-[#4f7fb3] text-white rounded-xl shadow-lg hover:shadow-blue-200 hover:bg-blue-600 transition-all flex items-center gap-2 group disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {isFinalizing ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : (
                                <Download size={18} className="group-hover:scale-110 transition-transform" />
                            )}
                            <span className="text-xs font-black uppercase tracking-wider">
                                {isFinalizing ? "Saving & Downloading..." : "Download PDF"}
                            </span>
                        </button>
                    </div>

                    {/* Main Header Content */}
                    <div className="flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-8 border-t border-slate-50 pt-8">
                        {/* Left: HQEPL Logo */}
                        <div className="w-full lg:w-48 flex justify-center lg:justify-start">
                            <img src="/HqeplLOGO.png" alt="HQEPL Logo" className="h-16 md:h-20 object-contain" />
                        </div>

                        {/* Center: Client Info */}
                        <div className="flex-1 flex flex-col items-center text-center gap-4">
                            <input
                                type="text"
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                                className="text-4xl md:text-5xl font-black text-slate-900 bg-transparent border-b-2 border-transparent hover:border-slate-100 focus:border-blue-400 focus:outline-none transition-all text-center w-full px-2"
                                placeholder="Company Name"
                            />
                            <span className="bg-[#4f7fb3]/10 text-[#4f7fb3] border border-[#4f7fb3]/20 px-6 py-1.5 rounded-full text-sm font-black uppercase tracking-[0.2em] shadow-sm">
                                Visit Agenda
                            </span>
                        </div>

                        {/* Right: Client Logo & Date */}
                        <div className="w-full lg:w-64 flex flex-col items-center lg:items-end gap-5 mt-4 lg:mt-0">
                            {clientLogoUrl ? (
                                <img
                                    src={resolveMediaUrl(clientLogoUrl)}
                                    alt="Client Logo"
                                    className="h-14 md:h-16 object-contain"
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                />
                            ) : (
                                <div className="h-14 w-32 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-[10px] text-slate-300 font-bold uppercase">
                                    No Logo
                                </div>
                            )}
                            <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 shadow-sm w-fit">
                                <span className="text-[10px] font-black text-slate-400 uppercase">Visit Date</span>
                                <input
                                    type="date"
                                    value={visitDate}
                                    onChange={(e) => setVisitDate(e.target.value)}
                                    className="bg-transparent text-sm font-bold text-slate-700 focus:outline-none"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto pb-2">
                        <table className="w-full min-w-[1000px] lg:min-w-full">
                            <thead>
                                <tr className="bg-[#4f7fb3] text-white text-xs uppercase tracking-wider text-left">
                                    <th className="p-4 w-16 text-center font-bold border-r border-white/30">Sr. No.</th>
                                    <th className="p-4 w-1/5 font-bold border-r border-white/30">Activity</th>
                                    <th className="p-4 w-32 font-bold border-r border-white/30">Tentative Time</th>
                                    <th className="p-4 w-1/5 font-bold border-r border-white/30">Output</th>
                                    <th className="p-4 w-40 font-bold border-r border-white/30">Required Team Members</th>
                                    <th className="p-4 w-1/5 font-bold border-r border-white/30">HQEPL Representative</th>
                                    <th className="p-4 font-bold">Tasks to be completed by Team Prior to Visit</th>
                                    <th className="p-4 w-12"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {rows.map((row, index) => (
                                    <tr
                                        key={index}
                                        className={`group transition-colors ${index % 2 === 0 ? "bg-[#dbe7f4]" : "bg-[#eef4fb]"} hover:bg-blue-100/70`}
                                    >
                                        <td className="p-3 text-center font-bold text-slate-500 border-r border-slate-100">
                                            {row.id}
                                        </td>
                                        <td className="p-0 border-r border-slate-100">
                                            <textarea
                                                value={row.activity}
                                                onChange={(e) => updateRow(index, "activity", e.target.value)}
                                                className="w-full h-full p-3 bg-transparent resize-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500/50 focus:outline-none text-sm min-h-[80px]"
                                                placeholder="Activity details..."
                                            />
                                        </td>
                                        <td className="p-0 border-r border-slate-100">
                                            <div className="flex flex-col gap-1 p-2">
                                                <input
                                                    type="time"
                                                    value={row.startTime}
                                                    onChange={(e) => updateRow(index, "startTime", e.target.value)}
                                                    className="w-full p-2 bg-transparent focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500/50 focus:outline-none text-sm font-medium rounded"
                                                    placeholder="Start"
                                                />
                                                <input
                                                    type="time"
                                                    value={row.endTime}
                                                    onChange={(e) => updateRow(index, "endTime", e.target.value)}
                                                    className="w-full p-2 bg-transparent focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500/50 focus:outline-none text-sm font-medium rounded"
                                                    placeholder="End"
                                                />
                                            </div>
                                        </td>
                                        <td className="p-0 border-r border-slate-100">
                                            <textarea
                                                value={row.output}
                                                onChange={(e) => updateRow(index, "output", e.target.value)}
                                                className="w-full h-full p-3 bg-transparent resize-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500/50 focus:outline-none text-sm min-h-[80px]"
                                                placeholder="Expected output..."
                                            />
                                        </td>
                                        <td className="p-0 border-r border-slate-100">
                                            <textarea
                                                value={row.teamMembers}
                                                onChange={(e) => updateRow(index, "teamMembers", e.target.value)}
                                                className="w-full h-full p-3 bg-transparent resize-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500/50 focus:outline-none text-sm min-h-[80px]"
                                                placeholder="Names..."
                                            />
                                        </td>
                                        <td className="p-0 border-r border-slate-100">
                                            <button
                                                type="button"
                                                onClick={() => setModalRowIndex(index)}
                                                className="w-full h-full p-3 text-left bg-transparent hover:bg-slate-50 focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500/50 focus:outline-none text-sm min-h-[80px] flex flex-col justify-center"
                                            >
                                                {Array.isArray(row.hqeplReps) && row.hqeplReps.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {hqeplOptions
                                                            .filter(opt => row.hqeplReps.includes(opt.id))
                                                            .map(opt => (
                                                                <span key={opt.id} className="bg-white/50 px-2 py-0.5 rounded border border-blue-200 text-[11px] font-medium text-blue-700">
                                                                    {opt.full_name}
                                                                </span>
                                                            ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 italic">Select HQEPL Rep</span>
                                                )}
                                            </button>
                                        </td>
                                        <td className="p-0">
                                            <textarea
                                                value={row.priorTasks}
                                                onChange={(e) => updateRow(index, "priorTasks", e.target.value)}
                                                className="w-full h-full p-3 bg-transparent resize-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500/50 focus:outline-none text-sm min-h-[80px]"
                                                placeholder="Pre-requisites..."
                                            />
                                        </td>
                                        <td className="p-2 text-center">
                                            <button
                                                onClick={() => deleteRow(index)}
                                                className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="p-4 bg-slate-50 border-t border-slate-200">
                        <button
                            onClick={addRow}
                            className="px-6 py-3 bg-white border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-bold text-sm w-full hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
                        >
                            <Plus size={18} /> Add New Activity Row
                        </button>
                    </div>
                </div>
            </main>

            {/* HQEPL Rep Selection Modal */}
            {modalRowIndex !== null && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
                        <div className="flex items-center justify-between p-4 border-b border-slate-200">
                            <h3 className="text-lg font-bold text-slate-800">Select HQEPL Representatives</h3>
                            <button
                                onClick={() => setModalRowIndex(null)}
                                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <X size={20} className="text-slate-500" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4">
                            {hqeplOptions.map((rep) => {
                                const row = rows[modalRowIndex];
                                const isChecked = Array.isArray(row?.hqeplReps) && row.hqeplReps.includes(rep.id);
                                return (
                                    <label
                                        key={rep.id}
                                        className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={(e) => {
                                                const currentReps = Array.isArray(row.hqeplReps) ? [...row.hqeplReps] : [];
                                                if (e.target.checked) {
                                                    updateRow(modalRowIndex, "hqeplReps", [...currentReps, rep.id]);
                                                } else {
                                                    updateRow(modalRowIndex, "hqeplReps", currentReps.filter(id => id !== rep.id));
                                                }
                                            }}
                                            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-slate-700 font-medium">{rep.full_name}</span>
                                    </label>
                                );
                            })}
                            {hqeplOptions.length === 0 && (
                                <div className="text-center py-8 text-slate-400">No team members available</div>
                            )}
                        </div>
                        <div className="p-4 border-t border-slate-200">
                            <button
                                onClick={() => setModalRowIndex(null)}
                                className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VisitAgenda;
