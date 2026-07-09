import React, { useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "../components/Sidebar";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Trash2, Download, X, ArrowLeft, Loader2 } from "lucide-react";
import api from "../api";
import { resolveMediaUrl } from "../utils/media";
import { Band } from "../components/kayaara/Band";

const TimeSelector = ({ value, onChange }) => {
    const time = value || "09:00";
    const [hours, minutes] = time.includes(":") ? time.split(":") : ["09", "00"];

    const hourOptions = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
    const minuteOptions = ["00", "15", "30", "45"];

    return (
        <div
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg transition-all"
            style={{ background: "var(--k-white)", border: "1px solid var(--k-grey-200)", boxShadow: "var(--k-shadow-card)" }}
        >
            <select
                value={hours}
                onChange={(e) => onChange(`${e.target.value}:${minutes}`)}
                className="bg-transparent text-xs font-semibold outline-none cursor-pointer appearance-none px-1 tabular-nums"
                style={{ color: "var(--k-grey-700)" }}
            >
                {hourOptions.map((h) => (
                    <option key={h} value={h}>{h}</option>
                ))}
            </select>
            <span className="font-bold" style={{ color: "var(--k-blue)" }}>:</span>
            <select
                value={minutes}
                onChange={(e) => onChange(`${hours}:${e.target.value}`)}
                className="bg-transparent text-xs font-semibold outline-none cursor-pointer appearance-none px-1 tabular-nums"
                style={{ color: "var(--k-grey-700)" }}
            >
                {minuteOptions.map((m) => (
                    <option key={m} value={m}>{m}</option>
                ))}
            </select>
        </div>
    );
};

const MeetingAgenda = () => {
    const { clientId } = useParams();
    const navigate = useNavigate();
    const [visitDate, setVisitDate] = useState(new Date().toISOString().split("T")[0]);
    const [companyName, setCompanyName] = useState("Jacktech Hydraulic");
    const [kayaaraOptions, setKayaaraOptions] = useState([]);
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
        kayaaraReps: [],
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
            api.get("/admin/users/?role=KAYAARA"),
            api.get("/admin/users/?role=MLS"),
            api.get("/admin/users/?role=SGM"),
            api.get("/admin/users/?role=EMPLOYEE"),
            api.get("/sgm/employees/"),
            api.get("/employees/list/"),
            api.get(`/meeting-agenda/clients/${clientIdValue}/team/`),
        ]);

        const merged = [];
        requests.forEach((result) => {
            if (result.status === "fulfilled") {
                merged.push(...normalizeUsers(result.value?.data));
            }
        });

        const allowedRoles = new Set(["KAYAARA", "SGM", "EMPLOYEE", ""]);
        const deduped = new Map();

        merged.forEach((user) => {
            if (!allowedRoles.has(user.role)) return;
            if (!deduped.has(user.id)) {
                deduped.set(user.id, user);
            }
        });

        return Array.from(deduped.values()).sort((a, b) => {
            const roleWeight = { KAYAARA: 1, SGM: 2, EMPLOYEE: 3, "": 4 };
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
        const loadKAYAARA = async () => {
            if (!clientId) return;
            try {
                const reps = await collectHqeplRepresentatives(clientId);
                setKayaaraOptions(reps);
            } catch (error) {
                console.error("Failed to load team members:", error);
                setKayaaraOptions([]);
            }
        };

        loadKAYAARA();
    }, [clientId]);

    useEffect(() => {
        const loadAgenda = async () => {
            if (!clientId) return;
            try {
                const response = await api.get(`/meeting-agenda/clients/${clientId}/`);
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
                        kayaaraReps: Array.isArray(item.kayaara_reps) ? item.kayaara_reps : [],
                        priorTasks: item.prior_tasks || "",
                    }));
                    setRows(mappedRows);
                } else {
                    setRows([emptyRow]);
                }
                setAgendaLoaded(true);
            } catch (error) {
                console.error("Failed to load Meeting Agenda:", error);
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
                await api.put(`/meeting-agenda/clients/${clientId}/`, {
                    visit_date: visitDate,
                    items: rows.map((row, index) => ({
                        activity: row.activity,
                        start_time: row.startTime,
                        end_time: row.endTime,
                        output: row.output,
                        team_members: row.teamMembers,
                        kayaara_reps: Array.isArray(row.kayaaraReps) ? row.kayaaraReps : [],
                        prior_tasks: row.priorTasks,
                        order: index + 1,
                    })),
                });
            } catch (error) {
                console.error("Failed to auto-save Meeting Agenda:", error);
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
                kayaaraReps: [],
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
            kayaara_reps: Array.isArray(row.kayaaraReps) ? row.kayaaraReps : [],
            prior_tasks: row.priorTasks,
            order: index + 1,
        })),
    });

    const handleDownloadPDF = async () => {
        if (!clientId || isFinalizing) return;

        setIsFinalizing(true);
        try {
            await api.put(`/meeting-agenda/clients/${clientId}/`, buildAgendaPayload());
            await api.post(`/meeting-agenda/clients/${clientId}/finalize/`, {
                visit_date: visitDate,
            });
        } catch (error) {
            console.error("Failed to save visit log before download:", error);
            window.alert("Unable to save this Meeting Agenda into Visit Log. Please try again.");
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
            doc.setFillColor(242, 243, 245);
            doc.rect(0, 0, pageWidth, doc.internal.pageSize.height, "F");
            doc.setFillColor(255, 255, 255);
            doc.setDrawColor(33, 33, 33);
            doc.rect(frameX, frameY, frameWidth, headerHeight, "FD");


            const kayaaraLogoData = await getImageDataUrl("/kayaara-logo.png");
            if (kayaaraLogoData) {
                try {
                    // The KAYAARA logo is a wide lockup (~4.87:1, e.g. 1474x303).
                    // Draw it at a fixed width and derive the height from the real
                    // image aspect ratio so it is never squashed into a square box.
                    const logoWidth = 48;
                    const logoHeight = logoWidth * (kayaaraLogoData.height / kayaaraLogoData.width); // ≈ 10 for 4.87:1
                    const logoY = frameY + 4 + (24 - logoHeight) / 2; // vertically centered in the logo strip
                    doc.addImage(kayaaraLogoData.dataUrl, kayaaraLogoData.format, frameX + 5, logoY, logoWidth, logoHeight);
                } catch (error) {
                    console.warn("Failed to add KAYAARA logo to PDF", error);
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

            // Outline boxes sized to each logo: wide lockup for KAYAARA, square-ish for client.
            doc.setDrawColor(33, 33, 33);
            doc.rect(frameX + 4, frameY + 4, 50, 24);
            doc.rect(frameX + frameWidth - 42, frameY + 4, 38, 24);

            doc.setTextColor(33, 33, 33);
            doc.setFontSize(20);
            doc.setFont("helvetica", "bold");
            doc.text(companyName || "Client Name", pageWidth / 2, frameY + 13, { align: "center" });

            const badgeWidth = 50;
            const badgeHeight = 9;
            const badgeX = (pageWidth - badgeWidth) / 2;
            const badgeY = frameY + 19;
            doc.setFillColor(233, 244, 255);
            doc.setDrawColor(33, 33, 33);
            doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 4, 4, "FD");
            doc.setTextColor(0, 134, 255);
            doc.setFontSize(9.5);
            doc.text("Meeting Agenda", pageWidth / 2, badgeY + 6.7, { align: "center" });

            const dateBoxWidth = 58;
            const dateBoxHeight = 10;
            const dateBoxX = frameX + frameWidth - dateBoxWidth - 8;
            const dateBoxY = frameY + 31;
            doc.setFillColor(242, 243, 245);
            doc.setDrawColor(33, 33, 33);
            doc.rect(dateBoxX, dateBoxY, dateBoxWidth, dateBoxHeight, "FD");
            doc.setTextColor(138, 144, 153);
            doc.setFontSize(8);
            doc.text("VISIT DATE", dateBoxX + 4, dateBoxY + 6.5);
            doc.setTextColor(75, 79, 85);
            doc.setFontSize(9.5);
            doc.text(formatDateForDisplay(visitDate), dateBoxX + dateBoxWidth - 4, dateBoxY + 6.5, { align: "right" });

            // Table content mirrors visible Meeting Agenda columns and labels.
            const tableData = rows.map((row, index) => {
                const reps = kayaaraOptions
                    .filter(opt => Array.isArray(row.kayaaraReps) && row.kayaaraReps.includes(opt.id))
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
                        "KAYAARA\nREPRESENTATIVE",
                        "REQUIRED TEAM\nMEMBERS",
                        "TASKS TO BE COMPLETED\nBY TEAM PRIOR TO VISIT"
                    ]
                ],
                body: tableData,
                theme: "grid",
                headStyles: {
                    fillColor: [0, 134, 255],
                    textColor: [255, 255, 255],
                    fontSize: 8.25,
                    halign: "left",
                    valign: "middle",
                    cellPadding: 4,
                    minCellHeight: 14,
                    lineColor: [33, 33, 33],
                },
                bodyStyles: {
                    textColor: [75, 79, 85],
                    valign: "middle",
                    lineColor: [33, 33, 33],
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
                        data.cell.styles.fillColor = isSecondPatternRow ? [255, 255, 255] : [233, 244, 255];
                    }
                },
            });

            // Draw one outer border so header and table appear as a single block.
            const finalY = doc.lastAutoTable?.finalY || frameY + headerHeight + 20;
            doc.setDrawColor(33, 33, 33);
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
        <div className="h-screen w-screen flex overflow-hidden" style={{ background: "var(--k-white)", fontFamily: "Poppins, sans-serif" }}>
            <Sidebar />

            <div className="flex-1 flex flex-col overflow-hidden">
                <main className="flex-1 overflow-y-auto k-scroll">

                    {/* Band 1 · WHITE · header */}
                    <motion.header
                        initial={{ opacity: 0, y: -14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                        className="k-band-white k-band-pad border-b"
                        style={{ borderColor: "var(--k-grey-200)" }}
                    >
                        <div className="grid grid-cols-1 md:grid-cols-3 items-start gap-8">
                            {/* Left Column: Navigation & KAYAARA Logo */}
                            <div className="flex flex-col items-center md:items-start gap-6">
                                <button
                                    onClick={() => navigate(-1)}
                                    className="k-btn-ghost flex items-center gap-2 text-xs uppercase tracking-wider"
                                >
                                    <ArrowLeft size={16} />
                                    Back
                                </button>

                                <img src="/kayaara-logo.png" alt="KAYAARA Logo" className="h-12 w-auto object-contain" />
                            </div>

                            {/* Center Column: Core Info */}
                            <div className="flex flex-col items-center text-center gap-5">
                                <div className="w-full">
                                    <input
                                        type="text"
                                        value={companyName}
                                        onChange={(e) => setCompanyName(e.target.value)}
                                        className="text-3xl md:text-4xl font-bold bg-transparent border-b-2 border-transparent focus:outline-none transition-all text-center w-full px-2"
                                        style={{ color: "var(--k-ink)" }}
                                        onFocus={(e) => { e.target.style.borderBottomColor = "var(--k-blue)"; }}
                                        onBlur={(e) => { e.target.style.borderBottomColor = "transparent"; }}
                                        placeholder="Enter Company Name"
                                    />
                                </div>

                                <span className="k-pill !text-sm !px-8 !py-2 uppercase tracking-[0.25em]">Meeting Agenda</span>

                                <div className="flex flex-col items-center gap-2">
                                    <span className="k-eyebrow">Visit Date</span>
                                    <input
                                        type="date"
                                        value={visitDate}
                                        onChange={(e) => setVisitDate(e.target.value)}
                                        className="k-input !w-auto px-6 py-2 text-sm font-semibold cursor-pointer tabular-nums"
                                    />
                                </div>
                            </div>

                            {/* Right Column: Actions & Client Logo */}
                            <div className="flex flex-col items-center md:items-end gap-6">
                                <button
                                    onClick={handleDownloadPDF}
                                    disabled={isFinalizing}
                                    className="k-btn-primary w-full md:w-auto flex items-center justify-center gap-2 text-xs uppercase tracking-widest"
                                >
                                    {isFinalizing ? (
                                        <Loader2 size={18} className="animate-spin" />
                                    ) : (
                                        <Download size={18} />
                                    )}
                                    <span>{isFinalizing ? "Processing..." : "Download PDF"}</span>
                                </button>

                                <div className="k-card-grey p-4 flex items-center justify-center w-40 h-24 overflow-hidden">
                                    {clientLogoUrl ? (
                                        <img
                                            src={resolveMediaUrl(clientLogoUrl)}
                                            alt="Client Logo"
                                            className="max-h-full max-w-full object-contain"
                                            onError={(e) => { e.target.style.display = 'none'; }}
                                        />
                                    ) : (
                                        <div className="k-eyebrow text-center p-2">
                                            Client Logo Placeholder
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.header>

                    {/* Band 2 · GREY · agenda table */}
                    <Band tone="grey" eyebrow="Agenda" title="Visit plan">
                        <div className="k-card-static overflow-hidden">
                            <div className="overflow-x-auto k-scroll pb-2">
                                <table className="w-full min-w-[1000px] lg:min-w-full">
                                    <thead>
                                        <tr
                                            className="text-[10px] uppercase tracking-[0.14em] text-left"
                                            style={{ background: "var(--k-band-grey)", color: "var(--k-grey-500)" }}
                                        >
                                            <th className="p-4 w-16 text-center font-semibold border-b border-r" style={{ borderColor: "var(--k-grey-200)" }}>
                                                <span className="inline-block leading-tight whitespace-nowrap">Sr. No.</span>
                                            </th>
                                            <th className="p-4 w-1/5 font-semibold border-b border-r" style={{ borderColor: "var(--k-grey-200)" }}>
                                                <span className="inline-block leading-tight whitespace-nowrap">Activity</span>
                                            </th>
                                            <th className="p-4 w-40 font-semibold border-b border-r" style={{ borderColor: "var(--k-grey-200)" }}>
                                                <span className="inline-block leading-tight">Tentative<br />Time</span>
                                            </th>
                                            <th className="p-4 w-1/5 font-semibold border-b border-r" style={{ borderColor: "var(--k-grey-200)" }}>
                                                <span className="inline-block leading-tight whitespace-nowrap">Output</span>
                                            </th>
                                            <th className="p-4 w-1/5 font-semibold border-b border-r" style={{ borderColor: "var(--k-grey-200)" }}>
                                                <span className="inline-block leading-tight">KAYAARA<br />Representative</span>
                                            </th>
                                            <th className="p-4 w-48 font-semibold border-b border-r" style={{ borderColor: "var(--k-grey-200)" }}>
                                                <span className="inline-block leading-tight">Required Team<br />Members</span>
                                            </th>
                                            <th className="p-4 font-semibold border-b" style={{ borderColor: "var(--k-grey-200)" }}>
                                                <span className="inline-block leading-tight">Tasks to be completed by Team<br />Prior to Visit</span>
                                            </th>
                                            <th className="p-4 w-12 border-b" style={{ borderColor: "var(--k-grey-200)" }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map((row, index) => (
                                            <motion.tr
                                                key={index}
                                                initial={{ opacity: 0, y: 12 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                                                className="group transition-colors"
                                                style={{ background: index % 2 === 0 ? "var(--k-blue-tint)" : "var(--k-white)" }}
                                            >
                                                <td className="p-3 text-center font-semibold border-b border-r" style={{ color: "var(--k-grey-500)", borderColor: "var(--k-grey-100)" }}>
                                                    {row.id}
                                                </td>
                                                <td className="p-0 border-b border-r" style={{ borderColor: "var(--k-grey-100)" }}>
                                                    <textarea
                                                        value={row.activity}
                                                        onChange={(e) => updateRow(index, "activity", e.target.value)}
                                                        className="w-full h-full p-3 bg-transparent resize-none focus:outline-none text-sm min-h-[80px]"
                                                        style={{ color: "var(--k-grey-700)" }}
                                                        placeholder="Activity details..."
                                                    />
                                                </td>
                                                <td className="p-3 border-b border-r" style={{ borderColor: "var(--k-grey-100)" }}>
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
                                                <td className="p-0 border-b border-r" style={{ borderColor: "var(--k-grey-100)" }}>
                                                    <textarea
                                                        value={row.output}
                                                        onChange={(e) => updateRow(index, "output", e.target.value)}
                                                        className="w-full h-full p-4 bg-transparent resize-none focus:outline-none text-sm font-medium min-h-[100px]"
                                                        style={{ color: "var(--k-grey-700)" }}
                                                        placeholder="Expected output..."
                                                    />
                                                </td>
                                                <td className="p-0 border-b border-r" style={{ borderColor: "var(--k-grey-100)" }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => setModalRowIndex(index)}
                                                        className="w-full h-full p-4 text-left bg-transparent focus:outline-none text-sm min-h-[100px] flex flex-col justify-center transition-all"
                                                    >
                                                        {Array.isArray(row.kayaaraReps) && row.kayaaraReps.length > 0 ? (
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {kayaaraOptions
                                                                    .filter(opt => row.kayaaraReps.includes(opt.id))
                                                                    .map(opt => (
                                                                        <span key={opt.id} className="k-pill uppercase">
                                                                            {opt.full_name}{opt.role ? ` (${opt.role})` : ""}
                                                                        </span>
                                                                    ))}
                                                            </div>
                                                        ) : (
                                                            <span className="italic text-xs font-medium" style={{ color: "var(--k-grey-500)" }}>Select Rep...</span>
                                                        )}
                                                    </button>
                                                </td>
                                                <td className="p-0 border-b border-r" style={{ borderColor: "var(--k-grey-100)" }}>
                                                    <textarea
                                                        value={row.teamMembers}
                                                        onChange={(e) => updateRow(index, "teamMembers", e.target.value)}
                                                        className="w-full h-full p-4 bg-transparent resize-none focus:outline-none text-sm font-medium min-h-[100px]"
                                                        style={{ color: "var(--k-grey-700)" }}
                                                        placeholder="Names..."
                                                    />
                                                </td>
                                                <td className="p-0 border-b" style={{ borderColor: "var(--k-grey-100)" }}>
                                                    <textarea
                                                        value={row.priorTasks}
                                                        onChange={(e) => updateRow(index, "priorTasks", e.target.value)}
                                                        className="w-full h-full p-4 bg-transparent resize-none focus:outline-none text-sm font-medium min-h-[100px]"
                                                        style={{ color: "var(--k-grey-700)" }}
                                                        placeholder="Pre-requisites..."
                                                    />
                                                </td>
                                                <td className="p-2 text-center border-b" style={{ borderColor: "var(--k-grey-100)" }}>
                                                    <button
                                                        onClick={() => deleteRow(index)}
                                                        className="k-btn-icon opacity-0 group-hover:opacity-100"
                                                        aria-label="Delete row"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="p-4 border-t" style={{ background: "var(--k-band-grey)", borderColor: "var(--k-grey-200)" }}>
                                <button
                                    onClick={addRow}
                                    className="px-6 py-3 rounded-xl font-semibold text-sm w-full transition-all flex items-center justify-center gap-2"
                                    style={{
                                        background: "var(--k-white)",
                                        border: "2px dashed var(--k-grey-300)",
                                        color: "var(--k-grey-500)",
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = "var(--k-blue)";
                                        e.currentTarget.style.color = "var(--k-blue)";
                                        e.currentTarget.style.background = "var(--k-blue-tint)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = "var(--k-grey-300)";
                                        e.currentTarget.style.color = "var(--k-grey-500)";
                                        e.currentTarget.style.background = "var(--k-white)";
                                    }}
                                >
                                    <Plus size={18} /> Add New Activity Row
                                </button>
                            </div>
                        </div>
                    </Band>
                </main>
            </div>

            {/* KAYAARA Rep Selection Modal */}
            {modalRowIndex !== null && (
                <div className="k-backdrop">
                    <div className="k-modal !max-w-md max-h-[80vh]">
                        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "var(--k-grey-200)" }}>
                            <h3 className="text-lg font-bold" style={{ color: "var(--k-ink)" }}>
                                Select <span style={{ color: "var(--k-blue)" }}>KAYAARA</span> Representatives
                            </h3>
                            <button
                                onClick={() => setModalRowIndex(null)}
                                className="k-btn-icon"
                                aria-label="Close"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto k-scroll p-4">
                            {kayaaraOptions.map((rep) => {
                                const row = rows[modalRowIndex];
                                const isChecked = Array.isArray(row?.kayaaraReps) && row.kayaaraReps.includes(rep.id);
                                return (
                                    <label
                                        key={rep.id}
                                        className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors"
                                        style={{ background: isChecked ? "var(--k-blue-tint)" : "transparent" }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={(e) => {
                                                const currentReps = Array.isArray(row.kayaaraReps) ? [...row.kayaaraReps] : [];
                                                if (e.target.checked) {
                                                    updateRow(modalRowIndex, "kayaaraReps", [...currentReps, rep.id]);
                                                } else {
                                                    updateRow(modalRowIndex, "kayaaraReps", currentReps.filter(id => id !== rep.id));
                                                }
                                            }}
                                            className="w-5 h-5 rounded"
                                        />
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium" style={{ color: isChecked ? "var(--k-blue)" : "var(--k-grey-700)" }}>{rep.full_name}</span>
                                            {rep.role && (
                                                <span className="k-pill-grey uppercase !text-[9px]">
                                                    {rep.role}
                                                </span>
                                            )}
                                        </div>
                                    </label>
                                );
                            })}
                            {kayaaraOptions.length === 0 && (
                                <div className="text-center py-8" style={{ color: "var(--k-grey-500)" }}>No team members available</div>
                            )}
                        </div>
                        <div className="p-4 border-t" style={{ borderColor: "var(--k-grey-200)" }}>
                            <button
                                onClick={() => setModalRowIndex(null)}
                                className="k-btn-primary w-full"
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

export default MeetingAgenda;
