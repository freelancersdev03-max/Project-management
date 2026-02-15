import React, { useMemo, useState, useEffect } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { useParams } from "react-router-dom";
import Navbar from "../../components/Navbar";
import api from "../../api";

const rgyOptions = [
	{ value: "G", label: "G", className: "bg-green-500 text-white" },
	{ value: "Y", label: "Y", className: "bg-yellow-300 text-black" },
	{ value: "R", label: "R", className: "bg-red-500 text-white" },
	{ value: "H", label: "H", className: "bg-blue-600 text-white" }
];

const getRygClass = value =>
	rgyOptions.find(opt => opt.value === value)?.className || "bg-slate-200 text-slate-700";

const getRygFromStatus = (status) => {
	if (status === "Completed") return "G";
	if (status === "In Progress") return "Y";
	return "R";
};

const buildMonthLabel = (month, year) => {
	const date = new Date(year, month - 1, 1);
	return date.toLocaleString("default", { month: "short", year: "numeric" });
};

const DDTMERYG = () => {
	const { clientId } = useParams();
	const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
	const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

	const [objectives, setObjectives] = useState([]);
	const [activityRows, setActivityRows] = useState([]);
	const [submission, setSubmission] = useState(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");

	const title = `${buildMonthLabel(selectedMonth, selectedYear)} Deliverable Plan`;
	const statusTitle = submission?.status === "Approved"
		? `Approved status for ${buildMonthLabel(selectedMonth, selectedYear)}`
		: `Awaiting approval for ${buildMonthLabel(selectedMonth, selectedYear)}`;

	const keyObjectiveCounts = useMemo(() => {
		return objectives.reduce((acc, row) => {
			const key = row.ryg || "";
			acc[key] = (acc[key] || 0) + 1;
			return acc;
		}, {});
	}, [objectives]);

	const totals = useMemo(() => {
		return objectives.reduce(
			(acc, row) => {
				acc.deliverablesCount += Number(row.deliverablesCount || 0);
				return acc;
			},
			{ keyObjectivesCount: objectives.length, deliverablesCount: 0 }
		);
	}, [objectives]);

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
						srNo: index + 1,
						objective: obj.objective,
						ryg: obj.is_completed ? "G" : "Y",
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
					type: "row",
					activity: task.title,
					week: task.target_date || "",
					ryg: getRygFromStatus(task.status),
					remarks: ""
				}));
				const addRows = addData.map(task => ({
					type: "row",
					activity: task.title,
					week: task.target_date || "",
					ryg: "Y",
					remarks: ""
				}));

				setActivityRows([...bigRows, ...addRows]);
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
		<div className="min-h-screen bg-slate-50">
			<Navbar hideLogin />

			<main className="max-w-[1500px] mx-auto px-6 py-8 space-y-8">
				<div className="bg-white rounded-3xl shadow-sm p-6 border border-slate-200">
					<div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
						<div>
							<h1 className="text-3xl font-black">{title}</h1>
							<p className="text-slate-500 italic mt-1 flex items-center gap-2">
								<Calendar size={16} /> Editable RYG deliverable tracker
							</p>
						</div>

						<div className="flex flex-col items-end gap-3">
							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={handlePrevMonth}
									className="p-2 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
								>
									<ChevronLeft size={16} />
								</button>
								<span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
									{buildMonthLabel(selectedMonth, selectedYear)}
								</span>
								<button
									type="button"
									onClick={handleNextMonth}
									className="p-2 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
								>
									<ChevronRight size={16} />
								</button>
							</div>
							<p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">{statusTitle}</p>
							<div className="text-sm font-bold text-slate-600">
								Totals: {totals.keyObjectivesCount} key objectives, {totals.deliverablesCount} deliverables
							</div>
						</div>
					</div>
				</div>

				{error && (
					<div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
						{error}
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
								<h2 className="text-xl font-black">This Month's Major Objectives</h2>
							</div>

							<table className="w-full border-collapse text-sm">
								<thead>
									<tr className="bg-slate-800 text-white">
										<th rowSpan={2} className="p-2 border">Sr.</th>
										<th rowSpan={2} className="p-2 border">Objective</th>
										<th rowSpan={2} className="p-2 border">RYG</th>
										<th colSpan={2} className="p-2 border">Key Objectives</th>
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
									{objectives.map((row, index) => {
										const totalObjectives = objectives.length;
										const countForColor = keyObjectiveCounts[row.ryg] || 0;
										const percentForColor = totalObjectives
											? Math.round((countForColor / totalObjectives) * 100)
											: 0;

										return (
											<tr key={index} className="hover:bg-slate-50">
												<td className="p-2 border text-center font-bold">{index + 1}</td>
												<td className="p-2 border">
													<input
														value={row.objective}
														readOnly
														className="w-full bg-transparent outline-none"
													/>
												</td>
												<td className="p-2 border">
													<select
														value={row.ryg}
														disabled
														className={`w-full rounded-lg px-2 py-1 font-bold ${getRygClass(row.ryg)}`}
													>
														{rgyOptions.map(opt => (
															<option key={opt.value} value={opt.value} className="text-slate-900">
																{opt.label}
															</option>
														))}
													</select>
												</td>
												<td className="p-2 border text-center font-semibold">{countForColor}</td>
												<td className="p-2 border text-center font-semibold">{percentForColor}%</td>
												<td className="p-2 border text-center">
													<input
														type="number"
														min={0}
														value={row.deliverablesCount}
														readOnly
														className="w-full text-center bg-transparent outline-none"
													/>
												</td>
												<td className="p-2 border text-center">
													<input
														type="number"
														min={0}
														max={100}
														value={row.deliverablesPercent}
														readOnly
														className="w-full text-center bg-transparent outline-none"
													/>
												</td>
											</tr>
										);
									})}

									<tr className="bg-slate-100 font-bold">
										<td colSpan={3} className="p-2 border text-right">Total</td>
										<td className="p-2 border text-center">{totals.keyObjectivesCount}</td>
										<td className="p-2 border" />
										<td className="p-2 border text-center">{totals.deliverablesCount}</td>
										<td className="p-2 border" />
									</tr>
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
													<td className="p-2 border" colSpan={4}>
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
												<td className="p-2 border">
													<input
														value={row.activity}
														readOnly
														className="w-full bg-transparent outline-none"
													/>
												</td>
												<td className="p-2 border">
													<input
														value={row.week}
														readOnly
														className="w-full bg-transparent outline-none"
													/>
												</td>
												<td className="p-2 border">
													<select
														value={row.ryg}
														disabled
														className={`w-full rounded-lg px-2 py-1 font-bold ${getRygClass(row.ryg)}`}
													>
														{rgyOptions.map(opt => (
															<option key={opt.value} value={opt.value} className="text-slate-900">
																{opt.label}
															</option>
														))}
													</select>
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
			</main>
		</div>
	);
};

export default DDTMERYG;
