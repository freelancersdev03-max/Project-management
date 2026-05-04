import React, { useMemo, useState, useEffect } from "react";
import { Calendar, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import Sidebar from "../../components/Sidebar";
import api from "../../api";

const rgyOptions = [
	{ value: "G", label: "G", className: "bg-green-500 text-white", bgClass: "bg-green-50" },
	{ value: "Y", label: "Y", className: "bg-yellow-300 text-black", bgClass: "bg-yellow-50" },
	{ value: "R", label: "R", className: "bg-red-500 text-white", bgClass: "bg-red-50" },
	{ value: "H", label: "H", className: "bg-blue-600 text-white", bgClass: "bg-blue-50" }
];

const getRygClass = value =>
	rgyOptions.find(opt => opt.value === value)?.className || "bg-slate-200 text-slate-700";

const getRygFromStatus = (status) => {
	if (status === "Completed") return "G";
	if (status === "In Progress") return "Y";
	return "R";
};

const getBigTaskStatusFromRyg = ryg => (ryg === "G" ? "Completed" : "In Progress");

const buildMonthLabel = (month, year) => {
	const date = new Date(year, month - 1, 1);
	return date.toLocaleString("default", { month: "short", year: "numeric" });
};

const buildLongMonthLabel = (month, year) => {
	const date = new Date(year, month - 1, 1);
	return date.toLocaleString("default", { month: "long", year: "numeric" }).toUpperCase();
};

const formatWeekDate = (value) => {
	if (!value) return "";
	if (typeof value === "string") {
		const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
		if (match) {
			return `${match[3]}-${match[2]}-${match[1]}`;
		}
	}

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;
	const day = String(date.getDate()).padStart(2, "0");
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const year = date.getFullYear();
	return `${day}-${month}-${year}`;
};

const DDTMERYG = () => {
	const { clientId } = useParams();
	const navigate = useNavigate();
	const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
	const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

	const [objectives, setObjectives] = useState([]);
	const [activityRows, setActivityRows] = useState([]);
	const [submission, setSubmission] = useState(null);
	const [isLoading, setIsLoading] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [isDownloading, setIsDownloading] = useState(false);
	const [error, setError] = useState("");
	const [saveError, setSaveError] = useState("");
	const [lastSavedActivityIndex, setLastSavedActivityIndex] = useState(null);
	const [lastSavedObjectiveIndex, setLastSavedObjectiveIndex] = useState(null);
	const [lastSaveTime, setLastSaveTime] = useState(null);

	const title = `${buildMonthLabel(selectedMonth, selectedYear)} Deliverable Plan`;

	const keyObjectiveCounts = useMemo(() => {
		return objectives.reduce((acc, row) => {
			const key = row.ryg || "";
			acc[key] = (acc[key] || 0) + 1;
			return acc;
		}, {});
	}, [objectives]);

	const overallDeliverablesCounts = useMemo(() => {
		return activityRows.reduce((acc, row) => {
			const key = row.ryg || "";
			acc[key] = (acc[key] || 0) + 1;
			return acc;
		}, {});
	}, [activityRows]);

	const summaryRows = useMemo(() => {
		const totalObjectives = objectives.length;
		const totalDeliverables = activityRows.length;

		return rgyOptions.map((colorOpt) => {
			const objCount = keyObjectiveCounts[colorOpt.value] || 0;
			const objPercent = totalObjectives
				? Math.round((objCount / totalObjectives) * 100)
				: 0;

			const delCount = overallDeliverablesCounts[colorOpt.value] || 0;
			const delPercent = totalDeliverables
				? Math.round((delCount / totalDeliverables) * 100)
				: 0;

			return {
				value: colorOpt.value,
				label: colorOpt.label,
				objCount,
				objPercent,
				delCount,
				delPercent,
			};
		});
	}, [objectives.length, activityRows.length, keyObjectiveCounts, overallDeliverablesCounts]);

	const majorObjectiveRows = useMemo(() => {
		const rowCount = Math.max(objectives.length, summaryRows.length);
		return Array.from({ length: rowCount }, (_, index) => ({
			objective: objectives[index] || null,
			summary: summaryRows[index] || null,
			index,
		}));
	}, [objectives, summaryRows]);

	const handlePrevMonth = () => {
		setSelectedMonth(prev => {
			if (prev === 1) {
				setSelectedYear(year => year - 1);
				return 12;
			}
			return prev - 1;
		});
	};

	const handleNextMonth = () => {
		setSelectedMonth(prev => {
			if (prev === 12) {
				setSelectedYear(year => year + 1);
				return 1;
			}
			return prev + 1;
		});
	};

	const handleObjectiveRygChange = async (index, newValue) => {
		const previousValue = objectives[index]?.ryg;
		const objectiveId = objectives[index]?.id;
		const updated = [...objectives];
		updated[index].ryg = newValue;
		setObjectives(updated);
		setSaveError("");

		if (!objectiveId) return;

		setIsSaving(true);
		try {
			await api.patch(`ddtme/monthly-objectives/${objectiveId}/`, {
				is_completed: newValue === "G",
				ryg_status: newValue
			});
			setLastSavedObjectiveIndex(index);
			setLastSaveTime(Date.now());
			setTimeout(() => setLastSavedObjectiveIndex(null), 2000);
			setTimeout(() => setLastSaveTime(null), 3000);
		} catch (saveErr) {
			const rollback = [...updated];
			rollback[index].ryg = previousValue;
			setObjectives(rollback);
			setSaveError("Autosave failed for objective. Please try again.");
			console.error("Failed to autosave objective RYG", saveErr);
		} finally {
			setIsSaving(false);
		}
	};

	const handleActivityRygChange = async (index, newValue) => {
		const previousValue = activityRows[index]?.ryg;
		const rowId = activityRows[index]?.id;
		const taskType = activityRows[index]?.taskType;
		const updated = [...activityRows];
		updated[index].ryg = newValue;
		setActivityRows(updated);
		setSaveError("");

		if (!rowId) return;

		setIsSaving(true);
		try {
			if (taskType === "big") {
				await api.patch(`ddtme/big-tasks/${rowId}/`, {
					status: getBigTaskStatusFromRyg(newValue),
					ryg_status: newValue
				});
			} else {
				await api.patch(`ddtme/additional-tasks/${rowId}/`, {
					ryg_status: newValue
				});
			}
			setLastSavedActivityIndex(index);
			setLastSaveTime(Date.now());
			setTimeout(() => setLastSavedActivityIndex(null), 2000);
			setTimeout(() => setLastSaveTime(null), 3000);
		} catch (saveErr) {
			const rollback = [...updated];
			rollback[index].ryg = previousValue;
			setActivityRows(rollback);
			setSaveError("Autosave failed for activity. Please try again.");
			console.error("Failed to autosave activity RYG", saveErr);
		} finally {
			setIsSaving(false);
		}
	};

	const handleDownloadPdf = async () => {
		setIsDownloading(true);
		setSaveError("");
		try {
			const pdf = new jsPDF("l", "mm", "a4");
			const monthLabel = buildMonthLabel(selectedMonth, selectedYear);
			const rygPdfCellColor = {
				G: [34, 197, 94],
				Y: [250, 204, 21],
				R: [239, 68, 68],
				H: [37, 99, 235]
			};
			const rygPdfTextColor = {
				G: [255, 255, 255],
				Y: [0, 0, 0],
				R: [255, 255, 255],
				H: [255, 255, 255]
			};
			const rygPdfRowBg = {
				G: [220, 252, 231],
				Y: [254, 249, 195],
				R: [254, 226, 226],
				H: [219, 234, 254]
			};

			pdf.setFontSize(16);
			pdf.text(`${monthLabel} Deliverable Plan`, 14, 16);
			pdf.setFontSize(10);
			pdf.text(`Status: ${submission?.status || "N/A"}`, 14, 22);

			// --- Table 1: Month's Major Objectives (matches on-screen layout) ---
			const totalObjectives = objectives.length;
			const totalDeliverables = activityRows.filter(r => r.type === "row").length;
			const rowCount = Math.max(objectives.length, rgyOptions.length);
			const majorObjBody = [];

			for (let i = 0; i < rowCount; i++) {
				const obj = objectives[i] || null;
				const sumOpt = rgyOptions[i] || null;

				const objCount = sumOpt ? (keyObjectiveCounts[sumOpt.value] || 0) : 0;
				const objPercent = sumOpt && totalObjectives ? Math.round((objCount / totalObjectives) * 100) : 0;
				const delCount = sumOpt ? (overallDeliverablesCounts[sumOpt.value] || 0) : 0;
				const delPercent = sumOpt && totalDeliverables ? Math.round((delCount / totalDeliverables) * 100) : 0;

				majorObjBody.push([
					obj ? String(i + 1) : "-",
					obj ? obj.objective : "-",
					obj ? obj.ryg : "-",
					sumOpt ? sumOpt.label : "-",
					sumOpt ? String(objCount) : "-",
					sumOpt ? `${objPercent}%` : "-",
					sumOpt ? String(delCount) : "-",
					sumOpt ? `${delPercent}%` : "-"
				]);
			}

			autoTable(pdf, {
				startY: 30,
				head: [
					[
						{ content: "Sr. No.", rowSpan: 2, styles: { valign: "middle", halign: "center" } },
						{ content: "Objective", rowSpan: 2, styles: { valign: "middle" } },
						{ content: "RYG", rowSpan: 2, styles: { valign: "middle", halign: "center" } },
						{ content: "Summary RYG", rowSpan: 2, styles: { valign: "middle", halign: "center" } },
						{ content: "Key Objective", colSpan: 2, styles: { halign: "center" } },
						{ content: "Overall Deliverables", colSpan: 2, styles: { halign: "center" } }
					],
					[
						{ content: "Count", styles: { halign: "center" } },
						{ content: "%", styles: { halign: "center" } },
						{ content: "Count", styles: { halign: "center" } },
						{ content: "%", styles: { halign: "center" } }
					]
				],
				body: majorObjBody,
				theme: "grid",
				headStyles: { fillColor: [30, 41, 59], fontSize: 8, fontStyle: "bold" },
				styles: { fontSize: 8, cellPadding: 2 },
				columnStyles: {
					0: { halign: "center", cellWidth: 15 },
					2: { halign: "center", cellWidth: 15 },
					3: { halign: "center", cellWidth: 25 },
					4: { halign: "center", cellWidth: 18 },
					5: { halign: "center", cellWidth: 15 },
					6: { halign: "center", cellWidth: 18 },
					7: { halign: "center", cellWidth: 15 }
				},
				didParseCell: (data) => {
					if (data.section !== "body") return;
					// RYG column (index 2) - color the cell like a badge
					if (data.column.index === 2) {
						const val = data.cell.raw;
						if (rygPdfCellColor[val]) {
							data.cell.styles.fillColor = rygPdfCellColor[val];
							data.cell.styles.textColor = rygPdfTextColor[val];
							data.cell.styles.fontStyle = "bold";
						}
					}
					// Summary RYG column (index 3) - color the cell like a badge
					if (data.column.index === 3) {
						const val = data.cell.raw;
						if (rygPdfCellColor[val]) {
							data.cell.styles.fillColor = rygPdfCellColor[val];
							data.cell.styles.textColor = rygPdfTextColor[val];
							data.cell.styles.fontStyle = "bold";
						}
					}
				}
			});

			// --- Table 2: Activities & RYG Status (matches on-screen layout) ---
			let actSrNo = 0;
			const activityBody = activityRows
				.filter((row) => row.type === "row")
				.map((row) => {
					actSrNo += 1;
					return [
						actSrNo,
						row.activity,
						row.projectName || "",
						formatWeekDate(row.week),
						row.ryg,
						row.remarks || ""
					];
				});

			autoTable(pdf, {
				startY: (pdf.lastAutoTable?.finalY || 30) + 10,
				head: [["Sr. No.", "Activity", "Project", "Week", "RYG Status", "Remarks"]],
				body: activityBody,
				theme: "grid",
				headStyles: { fillColor: [30, 41, 59], fontSize: 8, fontStyle: "bold" },
				styles: { fontSize: 8, cellPadding: 2 },
				columnStyles: {
					0: { halign: "center", cellWidth: 15 },
					4: { halign: "center", cellWidth: 22 }
				},
				didParseCell: (data) => {
					if (data.section !== "body") return;
					// RYG Status column (index 4) - color the cell
					if (data.column.index === 4) {
						const val = data.cell.raw;
						if (rygPdfCellColor[val]) {
							data.cell.styles.fillColor = rygPdfCellColor[val];
							data.cell.styles.textColor = rygPdfTextColor[val];
							data.cell.styles.fontStyle = "bold";
						}
					}
					// Lightly tint the entire row based on RYG
					const rygVal = data.row.raw?.[4];
					if (data.column.index !== 4 && rygPdfRowBg[rygVal]) {
						data.cell.styles.fillColor = rygPdfRowBg[rygVal];
					}
				}
			});

			const fileMonth = buildMonthLabel(selectedMonth, selectedYear).replace(/\s+/g, "-");
			pdf.save(`${fileMonth}-ddtme-report.pdf`);
		} catch (pdfError) {
			setSaveError("PDF download failed. Please try again.");
			console.error("Failed to generate PDF", pdfError);
		} finally {
			setIsDownloading(false);
		}
	};



	useEffect(() => {
		if (!clientId) return;
		const fetchData = async () => {
			setIsLoading(true);
			setError("");
			try {
				const subRes = await api.get(
					`ddtme/submissions/?client_id=${clientId}&month=${selectedMonth}&year=${selectedYear}`
				);
				const subData = Array.isArray(subRes.data) ? subRes.data : (subRes.data.results || []);
				const currentSubmission = subData[0] || null;
				setSubmission(currentSubmission);

				if (!currentSubmission || currentSubmission.status !== "Approved") {
					setObjectives([]);
					setActivityRows([]);
					return;
				}

				const objRes = await api.get(
					`ddtme/monthly-objectives/?client_id=${clientId}&month=${selectedMonth}&year=${selectedYear}`
				);
				const objData = Array.isArray(objRes.data) ? objRes.data : (objRes.data.results || []);
				setObjectives(
					objData.map((obj, index) => ({
						id: obj.id,
						srNo: index + 1,
						objective: obj.objective,
						ryg: obj.ryg_status || (obj.is_completed ? "G" : "Y"),
						deliverablesCount: 0,
						deliverablesPercent: 0
					}))
				);

				const bigRes = await api.get(
					`ddtme/big-tasks/?client_id=${clientId}&month=${selectedMonth}&year=${selectedYear}`
				);
				const bigData = Array.isArray(bigRes.data) ? bigRes.data : (bigRes.data.results || []);

				const addRes = await api.get(
					`ddtme/additional-tasks/?client_id=${clientId}&month=${selectedMonth}&year=${selectedYear}`
				);
				const addData = Array.isArray(addRes.data) ? addRes.data : (addRes.data.results || []);

				const bigRows = bigData.map(task => ({
					id: task.id,
					taskType: "big",
					type: "row",
					activity: task.title,
					projectName: task.project_name || task.project?.name || "",
					week: task.target_date || "",
					ryg: task.ryg_status || getRygFromStatus(task.status),
					remarks: ""
				}));
				const addRows = addData.map(task => ({
					id: task.id,
					taskType: "additional",
					type: "row",
					activity: task.title,
					projectName: task.project_name || task.project?.name || "",
					week: task.target_date || "",
					ryg: task.ryg_status || "Y",
					remarks: ""
				}));

				const sortedRows = [...bigRows, ...addRows].sort((left, right) => {
					const leftProject = left.projectName || "";
					const rightProject = right.projectName || "";

					if (!leftProject && !rightProject) return 0;
					if (!leftProject) return 1;
					if (!rightProject) return -1;

					const projectCompare = leftProject.localeCompare(rightProject, undefined, {
						sensitivity: "base"
					});
					if (projectCompare !== 0) return projectCompare;

					return (left.activity || "").localeCompare(right.activity || "", undefined, {
						sensitivity: "base"
					});
				});

				setActivityRows(sortedRows);
			} catch (fetchError) {
				console.error("Failed to fetch DDTME RYG data", fetchError);
				setError("Failed to load approved DDTME data.");
				setObjectives([]);
				setActivityRows([]);
			} finally {
				setIsLoading(false);
			}
		};

		fetchData();
	}, [clientId, selectedMonth, selectedYear]);

	let srNoCounter = 0;

	const isApproved = submission?.status === "Approved";

	return (
		<div className="h-screen w-screen bg-[#FBFBFB] antialiased font-sans flex overflow-hidden">
			<Sidebar />

			<main className="flex-1 overflow-y-auto transition-all duration-300 pb-20">
				<div className="max-w-375 mx-auto px-6 py-8 space-y-8">
					<div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-3">
						<div className="grid grid-cols-1 gap-3 lg:grid-cols-[auto_1fr_auto] lg:items-center">
							<div className="flex items-center gap-3 min-w-0">
								<button
									type="button"
									onClick={() => navigate(-1)}
									className="p-2 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
								>
									<ChevronLeft size={16} />
								</button>
								<div className="h-6 w-px bg-slate-200" />
								<div className="flex items-center gap-2 text-slate-800 min-w-0">
									<Calendar size={16} className="text-slate-500 shrink-0" />
									<span className="text-base font-black truncate">DDTME Workspace</span>
								</div>
							</div>

							<div className="text-center">
								<p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">{title}</p>
							</div>

							<div className="flex items-center justify-end gap-3">
							<button
								type="button"									onClick={handleDownloadPdf}
									disabled={isDownloading}
									className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-slate-700 hover:bg-slate-100 disabled:opacity-60"
								>
									{isDownloading ? "Downloading..." : "Download PDF"}
								</button>
								<div className="flex items-center gap-2">
									<button
										type="button"
										onClick={handlePrevMonth}
										className="p-2 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
									>
										<ChevronLeft size={14} />
									</button>
									<span className="text-xs font-black uppercase tracking-[0.16em] text-slate-600 whitespace-nowrap">
										{buildLongMonthLabel(selectedMonth, selectedYear)}
									</span>
									<button
										type="button"
										onClick={handleNextMonth}
										className="p-2 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
									>
										<ChevronRight size={14} />
									</button>
								</div>
							</div>
						</div>
					</div>

					{error && (
						<div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
							{error}
						</div>
					)}

					{saveError && (
						<div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
							{saveError}
						</div>
					)}

					{lastSaveTime && (
						<div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700 flex items-center gap-2">
							<Check size={16} />
							All changes saved successfully
						</div>
					)}

					{!isLoading && !isApproved && !error && (
						<div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600">
							No approved DDTME data for {buildMonthLabel(selectedMonth, selectedYear)}.
						</div>
					)}

					{isApproved && (
						<>
							<div className="bg-white rounded-3xl shadow-sm p-6 border border-slate-200 overflow-x-auto">
								<div className="flex items-center justify-between mb-4">
									<h2 className="text-xl font-black">Month&apos;s Major Objectives</h2>
								</div>

								<table className="w-full border-collapse text-sm min-w-245">
									<thead>
										<tr className="bg-slate-800 text-white">
											<th rowSpan={2} className="p-2 border">Sr. No.</th>
											<th rowSpan={2} className="p-2 border">Objective</th>
											<th rowSpan={2} className="p-2 border">RYG</th>
											<th rowSpan={2} className="p-2 border">Summary RYG</th>
											<th colSpan={2} className="p-2 border">Key Objective</th>
											<th colSpan={2} className="p-2 border">Overall Deliverables</th>
										</tr>
										<tr className="bg-slate-100 text-slate-700">
											<th className="p-2 border">Count</th>
											<th className="p-2 border">%</th>
											<th className="p-2 border">Count</th>
											<th className="p-2 border">%</th>
										</tr>
									</thead>
									<tbody>
										{majorObjectiveRows.map(({ objective, summary, index }) => (
											<tr key={`major-objective-${index}`} className="hover:bg-slate-50">
												<td className="p-2 border text-center font-bold text-slate-700">
													{objective ? (objective.srNo || index + 1) : "-"}
												</td>
												<td className="p-2 border">
													{objective ? (
														<input
															value={objective.objective}
															readOnly
															className="w-full bg-transparent outline-none font-medium"
														/>
													) : (
														<span className="text-slate-300">-</span>
													)}
												</td>
												<td className="p-2 border text-center">
													{objective ? (
														<div className="flex items-center justify-center gap-2">
															<select
																value={objective.ryg}
																onChange={(e) => handleObjectiveRygChange(index, e.target.value)}
																className={`${getRygClass(objective.ryg)} rounded-lg px-2 py-1 font-bold cursor-pointer whitespace-nowrap`}
															>
																{rgyOptions.map(opt => (
																	<option key={opt.value} value={opt.value} className="text-slate-900">
																		{opt.label}
																	</option>
																))}
															</select>
															{lastSavedObjectiveIndex === index && (
																<div className="text-green-600 text-sm font-bold animate-pulse">✓</div>
															)}
														</div>
													) : (
														<span className="text-slate-300">-</span>
													)}
												</td>
												<td className="p-2 border text-center">
													{summary ? (
														<span className={`${getRygClass(summary.value)} rounded-full px-3 py-1 inline-block font-bold`}>
															{summary.label}
														</span>
													) : (
														<span className="text-slate-300">-</span>
													)}
												</td>
												<td className="p-2 border text-center font-semibold">
													{summary ? summary.objCount : "-"}
												</td>
												<td className="p-2 border text-center font-semibold">
													{summary ? `${summary.objPercent}%` : "-"}
												</td>
												<td className="p-2 border text-center font-semibold">
													{summary ? summary.delCount : "-"}
												</td>
												<td className="p-2 border text-center font-semibold">
													{summary ? `${summary.delPercent}%` : "-"}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>

							<div className="bg-white rounded-3xl shadow-sm p-6 border border-slate-200 overflow-x-auto">
								<div className="flex flex-wrap items-center gap-3 justify-between mb-4">
									<h2 className="text-xl font-black">Activities & RYG Status</h2>
								</div>

								<table className="w-full border-collapse text-sm">
									<thead>
										<tr className="bg-slate-800 text-white">
											<th className="p-2 border">Sr. No.</th>
											<th className="p-2 border">Activity</th>
											<th className="p-2 border">Project</th>
											<th className="p-2 border">Week</th>
											<th className="p-2 border">RYG Status</th>
											<th className="p-2 border">Remarks</th>
										</tr>
									</thead>
									<tbody>
										{activityRows.map((row, index) => {
											if (row.type === "section") {
												return (
													<tr key={`section-${index}`} className="bg-slate-900 text-white">
														<td className="p-2 border font-bold text-center">-</td>
														<td className="p-2 border" colSpan={5}>
															<input
																value={row.title}
																readOnly
																className="w-full bg-transparent outline-none uppercase font-bold tracking-wide"
															/>
														</td>
													</tr>
												);
											}

											srNoCounter += 1;

											return (
												<tr key={`row-${index}`} className="hover:bg-slate-50">
													<td className="p-2 border text-center font-bold">{srNoCounter}</td>
												<td className="p-2 border relative group">
													<input
														value={row.activity}
														readOnly
														className="w-full bg-transparent outline-none truncate"
													/>
													{row.activity && (
														<div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs font-semibold px-3 py-2 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
															{row.activity}
															<div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
														</div>
													)}
													</td>
												<td className="p-2 border relative group">
													<input
														value={row.projectName || ""}
														readOnly
														className="w-full bg-transparent outline-none truncate"
													/>
													{row.projectName && (
														<div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs font-semibold px-3 py-2 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
															{row.projectName}
															<div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
														</div>
													)}
													</td>
												<td className="p-2 border relative group">
													<input
														value={formatWeekDate(row.week)}
														readOnly
														className="w-full bg-transparent outline-none truncate"
													/>
													{row.week && (
														<div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs font-semibold px-3 py-2 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
															{formatWeekDate(row.week)}
															<div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
														</div>
													)}
													</td>
													<td className="p-2 border relative">
														<div className="flex items-center gap-2">
															<select
																value={row.ryg}
																onChange={(e) => handleActivityRygChange(index, e.target.value)}
																className={`flex-1 rounded-lg px-2 py-1 font-bold ${getRygClass(row.ryg)}`}
															>
																{rgyOptions.map(opt => (
																	<option key={opt.value} value={opt.value} className="text-slate-900">
																		{opt.label}
																	</option>
																))}
															</select>
															{lastSavedActivityIndex === index && (
																<div className="text-green-600 text-sm font-bold animate-pulse">✓</div>
															)}
														</div>
													</td>
													<td className="p-2 border">
														<input
															value={row.remarks}
															readOnly
															className="w-full bg-transparent outline-none"
														/>
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
						</>
					)}
				</div>
			</main>
		</div>
	);
};

export default DDTMERYG;
