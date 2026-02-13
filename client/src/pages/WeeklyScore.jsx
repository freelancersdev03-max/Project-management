import React, { useState, useMemo } from 'react';
import {
  CalendarDays, ChevronLeft, ChevronRight,
  Filter, FileSpreadsheet, Activity
} from 'lucide-react';
import Navbar from '../components/Navbar';

const WeeklyScore = () => {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 0, 1)); // Jan 2026

  // Helper to calculate weeks: Starts on 1st, ends on Saturday
  const getWeeksInMonth = (year, month) => {
    const weeks = [];
    const lastDay = new Date(year, month + 1, 0);

    let start = new Date(year, month, 1);

    // If month starts on Sunday, skip it
    if (start.getDay() === 0) {
      start.setDate(2);
    }

    let weekCount = 1;

    while (start <= lastDay) {
      let end = new Date(start);

      // WEEK 1: end on first Sunday
      if (weekCount === 1) {
        let daysToSunday = 7 - end.getDay();
        if (daysToSunday === 7) daysToSunday = 0;
        end.setDate(end.getDate() + daysToSunday);
      }
      // OTHER WEEKS: Mon–Sun
      else {
        end.setDate(end.getDate() + 6);
      }

      if (end > lastDay) end = new Date(lastDay);

      const totalDays =
        Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;

      weeks.push({
        label: `Week ${weekCount}`,
        start: start.getDate(),
        end: end.getDate(),
        isShort: totalDays < 7
      });

      start = new Date(end);
      start.setDate(start.getDate() + 1);
      weekCount++;
    }

    return weeks;
  };


  const weeks = useMemo(() =>
    getWeeksInMonth(currentDate.getFullYear(), currentDate.getMonth()),
    [currentDate]
  );

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Dummy data mapping
  const teamData = [
    { name: "Mr. RONIT ADHIKARI", scores: ["-60.83%", "-0.49%", "-75.24%", "0.00%", "0.00%"] },
    { name: "Mr. HARSHIL SUREJA", scores: ["0.00%", "-15.42%", "-40.67%", "0.00%", "0.00%"] },
  ];

  // Helper for score color
  const getScoreColor = (scoreStr) => {
    const val = parseFloat(scoreStr.replace('%', ''));
    if (val < 0) return 'text-red-600 bg-red-50';
    if (val > 0) return 'text-green-600 bg-green-50';
    return 'text-slate-500 bg-slate-100';
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-slate-800">
      <Navbar hideLogin={true} />

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-lg text-white shadow-md shadow-blue-200">
              <CalendarDays size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Planning Period</p>
              <h1 className="text-2xl font-bold text-slate-900">{monthName}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
            <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))}
              className="p-2 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-600">
              <ChevronLeft size={18} />
            </button>
            <span className="px-3 text-sm font-medium text-slate-600 min-w-[100px] text-center">Navigate</span>
            <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}
              className="p-2 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-600">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Activity className="text-blue-600" size={20} />
              Performance Overview
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-xs">
                <tr>
                  <th className="px-6 py-4 font-semibold w-1/4">Team Member</th>
                  {weeks.map((wk, i) => (
                    <th key={i} className="px-4 py-4 text-center">
                      <div className="flex flex-col items-center">
                        <span className={wk.isShort ? 'text-amber-600' : ''}>{wk.label}</span>
                        <span className="text-[10px] font-normal normal-case text-slate-400 mt-0.5">
                          {wk.start}-{wk.end} {currentDate.toLocaleString('default', { month: 'short' })}
                        </span>
                        {wk.isShort && <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full mt-1">SHORT</span>}
                      </div>
                    </th>
                  ))}
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teamData.map((user, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-xs">
                          {user.name.charAt(0)}{user.name.split(' ')[1]?.[0]}
                        </div>
                        <span className="font-semibold text-slate-700">{user.name}</span>
                      </div>
                    </td>
                    {weeks.map((_, i) => (
                      <td key={i} className="px-4 py-4 text-center">
                        <span className={`inline-block px-3 py-1.5 rounded-md font-medium text-xs ${getScoreColor(user.scores[i] || '0%')}`}>
                          {user.scores[i] || "0.00%"}
                        </span>
                      </td>
                    ))}
                    <td className="px-6 py-4 text-right">
                      <button className="text-blue-600 hover:text-blue-700 font-medium text-xs hover:underline">
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default WeeklyScore;