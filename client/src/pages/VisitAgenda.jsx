import React, { useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "../components/Sidebar";
import { useParams, useNavigate } from "react-router-dom";
import { Plus, Trash2, Download, X, ArrowLeft, Loader2 } from "lucide-react";
import api from "../api";
import { resolveMediaUrl } from "../utils/media";

const TimeSelector = ({ value, onChange }) => {
    const time = value || "09:00";
    const [hours, minutes] = time.includes(":") ? time.split(":") : ["09", "00"];
    
    const hourOptions = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
    const minuteOptions = ["00", "15", "30", "45"];

    return (
        <div className="flex items-center gap-1 bg-white/80 px-2 py-1.5 rounded-lg border border-slate-200 focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-400/10 transition-all shadow-sm">
            <select
                value={hours}
                onChange={(e) => onChange(`${e.target.value}:${minutes}`)}
                className="bg-transparent text-xs font-black text-slate-700 outline-none cursor-pointer appearance-none px-1"
            >
                {hourOptions.map((h) => (
                    <option key={h} value={h}>{h}</option>
                ))}
            </select>
            <span className="text-[#4f7fb3] font-black animate-pulse">:</span>
            <select
                value={minutes}
                onChange={(e) => onChange(`${hours}:${e.target.value}`)}
                className="bg-transparent text-xs font-black text-slate-700 outline-none cursor-pointer appearance-none px-1"
            >
                {minuteOptions.map((m) => (
                    <option key={m} value={m}>{m}</option>
                ))}
            </select>
        </div>
    );
};

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

    const normalizeUsers = (payload) => {
        const list = Array.isArray(payload)
            ? payload
            : Array.isArray(payload?.results)
                ? payload.results
                : payload
                    ? [payload]
                    : [];

        return list
            .map((user) => {
                const id = user?.id;
                if (!id) return null;

                const first = String(user?.first_name || "").trim();
                const last = String(user?.last_name || "").trim();
                const fullFromParts = `${first} ${last}`.trim();
                const fullName = String(
                    user?.full_name
                    || fullFromParts
                    || user?.username
                    || user?.email
                    || `User ${id}`
                ).trim();

                const role = String(user?.role || "").toUpperCase();

                return {
                    id,
                    full_name: fullName,
                    role,
                };
            })
            .filter(Boolean);
    };

    const collectHqeplRepresentatives = async (clientIdValue) => {
        const requests = await Promise.allSettled([
            api.get("/admin/users/"),
            api.get("/admin/users/?role=HQEPL"),
            api.get("/admin/users/?role=MLS"),
            api.get("/admin/users/?role=SGM"),
            api.get("/admin/users/?role=EMPLOYEE"),
            api.get("/sgm/employees/"),
            api.get("/employees/list/"),
            api.get(`/visit-agenda/clients/${clientIdValue}/team/`),
        ]);

        const merged = [];
        requests.forEach((result) => {
            if (result.status === "fulfilled") {
                merged.push(...normalizeUsers(result.value?.data));
            }
        });

        const allowedRoles = new Set(["HQEPL", "SGM", "EMPLOYEE", ""]);
        const deduped = new Map();

        merged.forEach((user) => {
            if (!allowedRoles.has(user.role)) return;
            if (!deduped.has(user.id)) {
                deduped.set(user.id, user);
            }
        });

        return Array.from(deduped.values()).sort((a, b) => {
            const roleWeight = { HQEPL: 1, SGM: 2, EMPLOYEE: 3, "": 4 };
            const ra = roleWeight[a.role] || 9;
            const rb = roleWeight[b.role] || 9;
            if (ra !== rb) return ra - rb;
            return a.full_name.localeCompare(b.full_name);
        });
    };

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
                const reps = await collectHqeplRepresentatives(clientId);
                setHqeplOptions(reps);
            } catch (error) {
                console.error("Failed to load team members:", error);
                setHqeplOptions([]);
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
            const frameX = 8;
            const frameY = 8;
            const frameWidth = pageWidth - 16;
            const headerHeight = 44;

            // Light page background with a table-like header block.
            doc.setFillColor(247, 250, 252);
            doc.rect(0, 0, pageWidth, doc.internal.pageSize.height, "F");
            doc.setFillColor(255, 255, 255);
            doc.setDrawColor(0, 0, 0);
            doc.rect(frameX, frameY, frameWidth, headerHeight, "FD");

            const hqeplLogoData = await getImageDataUrl("/HqeplLOGO.png");
            if (hqeplLogoData) {
                try {
                    addImageContain(doc, hqeplLogoData, frameX + 5, frameY + 5, 36, 22);
                } catch (error) {
                    console.warn("Failed to add HQEPL logo to PDF", error);
                }
            }

            const clientLogoData = clientLogoUrl ? await getImageDataUrl(resolveMediaUrl(clientLogoUrl)) : null;
            if (clientLogoData) {
                try {
                    addImageContain(doc, clientLogoData, frameX + frameWidth - 41, frameY + 5, 36, 22);
                } catch (error) {
                    console.warn("Failed to add client logo to PDF", error);
                }
            }

            // Equal-sized logo boxes to keep both logos visually aligned.
            doc.setDrawColor(0, 0, 0);
            doc.rect(frameX + 4, frameY + 4, 38, 24);
            doc.rect(frameX + frameWidth - 42, frameY + 4, 38, 24);

            doc.setTextColor(15, 23, 42);
            doc.setFontSize(20);
            doc.setFont("helvetica", "bold");
            doc.text(companyName || "Client Name", pageWidth / 2, frameY + 13, { align: "center" });

            const badgeWidth = 50;
            const badgeHeight = 9;
            const badgeX = (pageWidth - badgeWidth) / 2;
            const badgeY = frameY + 19;
            doc.setFillColor(224, 236, 248);
            doc.setDrawColor(0, 0, 0);
            doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 4, 4, "FD");
            doc.setTextColor(79, 127, 179);
            doc.setFontSize(9.5);
            doc.text("VISIT AGENDA", pageWidth / 2, badgeY + 6.7, { align: "center" });

            const dateBoxWidth = 58;
            const dateBoxHeight = 10;
            const dateBoxX = frameX + frameWidth - dateBoxWidth - 8;
            const dateBoxY = frameY + 31;
            doc.setFillColor(248, 250, 252);
            doc.setDrawColor(0, 0, 0);
            doc.rect(dateBoxX, dateBoxY, dateBoxWidth, dateBoxHeight, "FD");
            doc.setTextColor(148, 163, 184);
            doc.setFontSize(8);
            doc.text("VISIT DATE", dateBoxX + 4, dateBoxY + 6.5);
            doc.setTextColor(51, 65, 85);
            doc.setFontSize(9.5);
            doc.text(formatDateForDisplay(visitDate), dateBoxX + dateBoxWidth - 4, dateBoxY + 6.5, { align: "right" });

            // Table content mirrors visible Visit Agenda columns and labels.
            const tableData = rows.map((row, index) => {
                const reps = hqeplOptions
                    .filter(opt => Array.isArray(row.hqeplReps) && row.hqeplReps.includes(opt.id))
                    .map(opt => opt.full_name)
                    .join(", ");

                const timeDisplay = [row.startTime || "--:--", row.endTime || "--:--"].join("\n");

                return [
                    index + 1,
                    row.activity || "Activity details...",
                    timeDisplay,
                    row.output || "Expected output...",
                    reps || "-",
                    row.teamMembers || "Names...",
                    row.priorTasks || "Pre-requisites..."
                ];
            });

            autoTable(doc, {
                startY: frameY + headerHeight,
                margin: { left: frameX, right: frameX },
                head: [
                    [
                        "SR NO",
                        "ACTIVITY",
                        "TENTATIVE TIME",
                        "OUTPUT",
                        "HQEPL\nREPRESENTATIVE",
                        "REQUIRED TEAM\nMEMBERS",
                        "TASKS TO BE COMPLETED\nBY TEAM PRIOR TO VISIT"
                    ]
                ],
                body: tableData,
                theme: "grid",
                headStyles: {
                    fillColor: [79, 127, 179],
                    textColor: [255, 255, 255],
                    fontSize: 8.25,
                    halign: "left",
                    valign: "middle",
                    cellPadding: 4,
                    minCellHeight: 14,
                    lineColor: [0, 0, 0],
                },
                bodyStyles: {
                    textColor: [71, 85, 105],
                    valign: "middle",
                    lineColor: [0, 0, 0],
                    cellPadding: 3.5,
                    minCellHeight: 18,
                },
                styles: { fontSize: 8.5, overflow: "linebreak" },
                columnStyles: {
                    0: { halign: "center", cellWidth: 14, fontStyle: "bold" },
                    1: { cellWidth: 52 },
                    2: { cellWidth: 26 },
                    3: { cellWidth: 44 },
                    4: { cellWidth: 52 },
                    5: { cellWidth: 38 },
                    6: { cellWidth: 48 },
                },
                didParseCell: (data) => {
                    if (data.section === "body") {
                        const isSecondPatternRow = data.row.index % 2 === 1;
                        data.cell.styles.fillColor = isSecondPatternRow ? [255, 255, 255] : [238, 244, 251];
                    }
                },
            });

            // Draw one outer border so header and table appear as a single block.
            const finalY = doc.lastAutoTable?.finalY || frameY + headerHeight + 20;
            doc.setDrawColor(0, 0, 0);
            doc.setLineWidth(0.4);
            doc.rect(frameX, frameY, frameWidth, finalY - frameY);

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
                    <div className="grid grid-cols-1 md:grid-cols-3 items-start gap-8">
                        {/* Left Column: Navigation & HQEPL Logo */}
                        <div className="flex flex-col items-center md:items-start gap-6">
                            <button
                                onClick={() => navigate(-1)}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg transition-all border border-slate-200 group"
                            >
                                <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                                <span className="text-xs font-bold uppercase tracking-wider">Back</span>
                            </button>
                            
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center w-40 h-24 shadow-inner">
                                <img src="/HqeplLOGO.png" alt="HQEPL Logo" className="max-h-full max-w-full object-contain" />
                            </div>
                        </div>

                        {/* Center Column: Core Info */}
                        <div className="flex flex-col items-center text-center gap-6">
                            <div className="w-full">
                                <input
                                    type="text"
                                    value={companyName}
                                    onChange={(e) => setCompanyName(e.target.value)}
                                    className="text-3xl md:text-4xl font-black text-slate-900 bg-transparent border-b-2 border-transparent hover:border-slate-100 focus:border-blue-400 focus:outline-none transition-all text-center w-full px-2"
                                    placeholder="Enter Company Name"
                                />
                            </div>

                            <div className="bg-[#4f7fb3]/10 text-[#4f7fb3] border border-[#4f7fb3]/20 px-8 py-2 rounded-full shadow-sm">
                                <span className="text-base font-black uppercase tracking-[0.25em]">Visit Agenda</span>
                            </div>

                            <div className="flex flex-col items-center gap-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Visit Date</span>
                                <input
                                    type="date"
                                    value={visitDate}
                                    onChange={(e) => setVisitDate(e.target.value)}
                                    className="bg-slate-50 px-6 py-2 rounded-xl border border-slate-200 text-sm font-black text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400/20 transition-all cursor-pointer"
                                />
                            </div>
                        </div>

                        {/* Right Column: Actions & Client Logo */}
                        <div className="flex flex-col items-center md:items-end gap-6">
                            <button
                                onClick={handleDownloadPDF}
                                disabled={isFinalizing}
                                className="w-full md:w-auto px-6 py-3 bg-[#4f7fb3] text-white rounded-xl shadow-lg shadow-blue-900/10 hover:shadow-blue-900/20 hover:bg-blue-600 transition-all flex items-center justify-center gap-3 group disabled:opacity-60"
                            >
                                {isFinalizing ? (
                                    <Loader2 size={20} className="animate-spin" />
                                ) : (
                                    <Download size={20} className="group-hover:scale-110 transition-transform" />
                                )}
                                <span className="text-xs font-black uppercase tracking-widest">
                                    {isFinalizing ? "Processing..." : "Download PDF"}
                                </span>
                            </button>

                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center w-40 h-24 shadow-inner overflow-hidden">
                                {clientLogoUrl ? (
                                    <img
                                        src={resolveMediaUrl(clientLogoUrl)}
                                        alt="Client Logo"
                                        className="max-h-full max-w-full object-contain"
                                        onError={(e) => { e.target.style.display = 'none'; }}
                                    />
                                ) : (
                                    <div className="text-[10px] text-slate-300 font-bold uppercase text-center p-2">
                                        Client Logo Placeholder
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto pb-2">
                        <table className="w-full min-w-[1000px] lg:min-w-full">
                            <thead>
                                <tr className="bg-[#4f7fb3] text-white text-[10px] md:text-xs uppercase tracking-widest text-left">
                                    <th className="p-5 w-16 text-center font-black border-r border-white/20">
                                        <span className="inline-block leading-tight whitespace-nowrap">Sr. No.</span>
                                    </th>
                                    <th className="p-5 w-1/5 font-black border-r border-white/20">
                                        <span className="inline-block leading-tight whitespace-nowrap">Activity</span>
                                    </th>
                                    <th className="p-5 w-40 font-black border-r border-white/20">
                                        <span className="inline-block leading-tight">Tentative<br />Time</span>
                                    </th>
                                    <th className="p-5 w-1/5 font-black border-r border-white/20">
                                        <span className="inline-block leading-tight whitespace-nowrap">Output</span>
                                    </th>
                                    <th className="p-5 w-1/5 font-black border-r border-white/20">
                                        <span className="inline-block leading-tight">HQEPL<br />Representative</span>
                                    </th>
                                    <th className="p-5 w-48 font-black border-r border-white/20">
                                        <span className="inline-block leading-tight">Required Team<br />Members</span>
                                    </th>
                                    <th className="p-5 font-black border-none">
                                        <span className="inline-block leading-tight">Tasks to be completed by Team<br />Prior to Visit</span>
                                    </th>
                                    <th className="p-5 w-12 border-none"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {rows.map((row, index) => (
                                    <tr
                                        key={index}
                                        className={`group transition-colors ${index % 2 === 0 ? "bg-[#dbe7f4]" : "bg-white"} hover:bg-blue-100/70`}
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
                                        <td className="p-3 border-r border-slate-100">
                                            <div className="flex flex-col gap-2 p-1">
                                                <TimeSelector
                                                    value={row.startTime || "09:00"}
                                                    onChange={(val) => updateRow(index, "startTime", val)}
                                                />
                                                <TimeSelector
                                                    value={row.endTime || "10:00"}
                                                    onChange={(val) => updateRow(index, "endTime", val)}
                                                />
                                            </div>
                                        </td>
                                        <td className="p-0 border-r border-slate-100">
                                            <textarea
                                                value={row.output}
                                                onChange={(e) => updateRow(index, "output", e.target.value)}
                                                className="w-full h-full p-4 bg-transparent resize-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500/50 focus:outline-none text-sm font-medium min-h-[100px]"
                                                placeholder="Expected output..."
                                            />
                                        </td>
                                        <td className="p-0 border-r border-slate-100">
                                            <button
                                                type="button"
                                                onClick={() => setModalRowIndex(index)}
                                                className="w-full h-full p-4 text-left bg-transparent hover:bg-white/50 focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500/50 focus:outline-none text-sm min-h-[100px] flex flex-col justify-center transition-all"
                                            >
                                                {Array.isArray(row.hqeplReps) && row.hqeplReps.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {hqeplOptions
                                                            .filter(opt => row.hqeplReps.includes(opt.id))
                                                            .map(opt => (
                                                                <span key={opt.id} className="bg-white shadow-sm px-2.5 py-1 rounded-lg border border-blue-100 text-[10px] font-black text-[#4f7fb3] uppercase tracking-tighter">
                                                                    {opt.full_name}{opt.role ? ` (${opt.role})` : ""}
                                                                </span>
                                                            ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 italic text-xs font-medium">Select Rep...</span>
                                                )}
                                            </button>
                                        </td>
                                        <td className="p-0 border-r border-slate-100">
                                            <textarea
                                                value={row.teamMembers}
                                                onChange={(e) => updateRow(index, "teamMembers", e.target.value)}
                                                className="w-full h-full p-4 bg-transparent resize-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500/50 focus:outline-none text-sm font-medium min-h-[100px]"
                                                placeholder="Names..."
                                            />
                                        </td>
                                        <td className="p-0">
                                            <textarea
                                                value={row.priorTasks}
                                                onChange={(e) => updateRow(index, "priorTasks", e.target.value)}
                                                className="w-full h-full p-4 bg-transparent resize-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500/50 focus:outline-none text-sm font-medium min-h-[100px]"
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
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-slate-700 font-medium">{rep.full_name}</span>
                                            {rep.role && (
                                                <span className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                                                    {rep.role}
                                                </span>
                                            )}
                                        </div>
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
