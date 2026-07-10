import React, { useState, useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ComposedChart
} from 'recharts';
import { motion } from 'framer-motion';
import { ChevronDown, X } from 'lucide-react';

// Strict 3-color chart palette — blue family + ink + grey only
const EMPLOYEE_COLORS = [
  '#0086ff', '#66b6ff', '#212121', '#c9cdd3', '#0068c9',
  '#8a9099', '#0086ff', '#66b6ff', '#212121', '#c9cdd3'
];

const getEmployeeColor = (index) => EMPLOYEE_COLORS[index % EMPLOYEE_COLORS.length];

const PerformanceAnalytics = ({ teamData, displayPeriods }) => {
  const [metricFilter, setMetricFilter] = useState('all'); // 'all', 'ats', 'otc'
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [selectedEmployeeDetail, setSelectedEmployeeDetail] = useState(null);

  // Transform data for overall performance chart
  const overallChartData = useMemo(() => {
    if (!teamData.length) return [];

    // Get all employees with their data
    const employeeList = teamData.filter(item => item.isEmployee);
    
    return displayPeriods.map((period, idx) => {
      const dataPoint = { period: period.label, periodIdx: idx };

      if (metricFilter === 'ats' || metricFilter === 'all') {
        const atsValues = employeeList
          .map(emp => {
            const val = parseFloat(emp.periodData[idx]?.ats || '0');
            return isNaN(val) ? 0 : val;
          })
          .filter(v => v > 0);
        dataPoint.atsAvg = atsValues.length ? (atsValues.reduce((a, b) => a + b) / atsValues.length).toFixed(1) : 0;
      }

      if (metricFilter === 'otc' || metricFilter === 'all') {
        const otcValues = employeeList
          .map(emp => {
            const val = parseFloat(emp.periodData[idx]?.otc || '0');
            return isNaN(val) ? 0 : val;
          })
          .filter(v => v > 0);
        dataPoint.otcAvg = otcValues.length ? (otcValues.reduce((a, b) => a + b) / otcValues.length).toFixed(1) : 0;
      }

      // Add individual employee data
      employeeList.forEach((emp, empIdx) => {
        const atsVal = parseFloat(emp.periodData[idx]?.ats || '0');
        const otcVal = parseFloat(emp.periodData[idx]?.otc || '0');
        
        if (metricFilter === 'ats' || metricFilter === 'all') {
          dataPoint[`${emp.id}_ats`] = isNaN(atsVal) ? 0 : atsVal;
        }
        if (metricFilter === 'otc' || metricFilter === 'all') {
          dataPoint[`${emp.id}_otc`] = isNaN(otcVal) ? 0 : otcVal;
        }
      });

      return dataPoint;
    });
  }, [teamData, displayPeriods, metricFilter]);

  // Data for employee detail view
  const employeeDetailData = useMemo(() => {
    if (!selectedEmployeeDetail) return null;

    const employee = teamData.find(emp => emp.id === selectedEmployeeDetail);
    if (!employee) return null;

    // Get team averages for each period
    const employeeList = teamData.filter(item => item.isEmployee);

    const chartData = displayPeriods.map((period, idx) => {
      const empAts = parseFloat(employee.periodData[idx]?.ats || '0');
      const empOtc = parseFloat(employee.periodData[idx]?.otc || '0');

      // Calculate team averages
      const teamAtsValues = employeeList
        .map(emp => parseFloat(emp.periodData[idx]?.ats || '0'))
        .filter(v => !isNaN(v) && v > 0);
      const teamOtcValues = employeeList
        .map(emp => parseFloat(emp.periodData[idx]?.otc || '0'))
        .filter(v => !isNaN(v) && v > 0);

      return {
        period: period.label,
        empAts: isNaN(empAts) ? 0 : empAts,
        empOtc: isNaN(empOtc) ? 0 : empOtc,
        teamAts: teamAtsValues.length ? (teamAtsValues.reduce((a, b) => a + b) / teamAtsValues.length).toFixed(1) : 0,
        teamOtc: teamOtcValues.length ? (teamOtcValues.reduce((a, b) => a + b) / teamOtcValues.length).toFixed(1) : 0,
      };
    });

    return {
      employee,
      chartData
    };
  }, [selectedEmployeeDetail, teamData, displayPeriods]);

  const employeeOptions = useMemo(() => {
    return teamData.filter(item => item.isEmployee).sort((a, b) => a.name.localeCompare(b.name));
  }, [teamData]);

  const handleEmployeeToggle = (employeeId) => {
    setSelectedEmployees(prev => {
      if (prev.includes(employeeId)) {
        return prev.filter(id => id !== employeeId);
      } else if (prev.length < 5) {
        return [...prev, employeeId];
      }
      return prev;
    });
  };

  const toggleEmployeeDetail = (employeeId) => {
    setSelectedEmployeeDetail(selectedEmployeeDetail === employeeId ? null : employeeId);
  };

  if (!teamData.length) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Overall Performance Chart */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="k-card overflow-hidden hover:!transform-none"
      >
        <div className="p-4 md:p-6 border-b" style={{ borderColor: 'var(--k-grey-200)' }}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="k-section-title">Overall Employees Performance</h2>
              <p className="text-sm mt-1" style={{ color: 'var(--k-grey-500)' }}>Weekly performance trends across the team</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {['all', 'ats', 'otc'].map(filter => (
                <button
                  key={filter}
                  onClick={() => setMetricFilter(filter)}
                  className={metricFilter === filter ? 'k-pill-solid !text-xs !px-3 !py-1.5 uppercase' : 'k-pill-grey !text-xs !px-3 !py-1.5 uppercase'}
                >
                  {filter === 'all' ? 'Both' : filter}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 md:p-6">
          {overallChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={overallChartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--k-grey-200)" />
                <XAxis
                  dataKey="period"
                  stroke="var(--k-grey-500)"
                  style={{ fontSize: '12px' }}
                />
                <YAxis
                  stroke="var(--k-grey-500)"
                  style={{ fontSize: '12px' }}
                  domain={[0, 100]}
                  label={{ value: 'Performance %', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--k-white)',
                    border: '1px solid var(--k-grey-200)',
                    borderRadius: '12px',
                    padding: '12px',
                    fontFamily: 'Poppins, sans-serif',
                  }}
                  labelStyle={{ color: 'var(--k-ink)' }}
                  formatter={(value) => `${value}%`}
                />
                <Legend
                  wrapperStyle={{ paddingTop: '16px' }}
                  iconType="line"
                />

                {metricFilter === 'all' && (
                  <>
                    <Line
                      type="monotone"
                      dataKey="atsAvg"
                      stroke="#0086ff"
                      name="ATS Average"
                      strokeWidth={2.5}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                      isAnimationActive={true}
                      animationDuration={1200}
                      animationEasing="ease-out"
                      animationBegin={200}
                    />
                    <Line
                      type="monotone"
                      dataKey="otcAvg"
                      stroke="#66b6ff"
                      name="OTC Average"
                      strokeWidth={2.5}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                      isAnimationActive={true}
                      animationDuration={1200}
                      animationEasing="ease-out"
                      animationBegin={200}
                    />
                  </>
                )}

                {metricFilter === 'ats' && (
                  <Line
                    type="monotone"
                    dataKey="atsAvg"
                    stroke="#0086ff"
                    name="ATS Average"
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                    isAnimationActive={true}
                    animationDuration={1200}
                    animationEasing="ease-out"
                    animationBegin={200}
                  />
                )}

                {metricFilter === 'otc' && (
                  <Line
                    type="monotone"
                    dataKey="otcAvg"
                    stroke="#66b6ff"
                    name="OTC Average"
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                    isAnimationActive={true}
                    animationDuration={1200}
                    animationEasing="ease-out"
                    animationBegin={200}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-80 flex items-center justify-center" style={{ color: 'var(--k-grey-500)' }}>
              No data available
            </div>
          )}
        </div>
      </motion.div>

      {/* Employee Selector */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.55, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        className="k-card overflow-hidden hover:!transform-none"
      >
        <div className="p-4 md:p-6 border-b" style={{ borderColor: 'var(--k-grey-200)' }}>
          <h3 className="k-section-title mb-4">Individual Employee Analytics</h3>

          <div className="relative">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {employeeOptions.map((emp, idx) => {
                const isSelected = selectedEmployeeDetail === emp.id;
                return (
                  <button
                    key={emp.id}
                    onClick={() => toggleEmployeeDetail(emp.id)}
                    className="p-3 rounded-lg border-2 transition-all text-left"
                    style={{
                      borderColor: isSelected ? 'var(--k-blue)' : 'var(--k-grey-200)',
                      background: isSelected ? 'var(--k-blue-tint)' : 'var(--k-band-grey)',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: getEmployeeColor(idx) }}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--k-ink)' }}>{emp.name}</p>
                        <p className="text-xs" style={{ color: 'var(--k-grey-500)' }}>
                          Avg: {emp.overall.ats}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {selectedEmployeeDetail && employeeDetailData && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="p-4 md:p-6 border-t"
            style={{ borderColor: 'var(--k-grey-200)' }}
          >
            {/* Header with close button */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h4 className="text-base font-bold" style={{ color: 'var(--k-ink)' }}>
                  {employeeDetailData.employee.name} - Performance Details
                </h4>
                <p className="text-sm mt-1" style={{ color: 'var(--k-grey-500)' }}>
                  Comparing with team averages
                </p>
              </div>
              <button
                onClick={() => setSelectedEmployeeDetail(null)}
                className="k-btn-icon"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Employee vs Team Average */}
              <div className="k-card-grey p-4">
                <h5 className="text-sm font-semibold mb-3" style={{ color: 'var(--k-grey-700)' }}>
                  Employee vs Team Average
                </h5>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={employeeDetailData.chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--k-grey-200)" />
                    <XAxis dataKey="period" stroke="var(--k-grey-500)" style={{ fontSize: '11px' }} />
                    <YAxis stroke="var(--k-grey-500)" style={{ fontSize: '11px' }} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--k-white)',
                        border: '1px solid var(--k-grey-200)',
                        borderRadius: '12px',
                        fontFamily: 'Poppins, sans-serif',
                      }}
                      formatter={(value) => `${value}%`}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Line
                      type="monotone"
                      dataKey="empAts"
                      stroke="#0086ff"
                      name="Your ATS"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                      animationDuration={1200}
                      animationEasing="ease-out"
                      animationBegin={200}
                    />
                    <Line
                      type="monotone"
                      dataKey="teamAts"
                      stroke="#c9cdd3"
                      name="Team ATS Avg"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                      animationDuration={1200}
                      animationEasing="ease-out"
                      animationBegin={200}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Weekly ATS vs OTC */}
              <div className="k-card-grey p-4">
                <h5 className="text-sm font-semibold mb-3" style={{ color: 'var(--k-grey-700)' }}>
                  Weekly ATS vs OTC
                </h5>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={employeeDetailData.chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--k-grey-200)" />
                    <XAxis dataKey="period" stroke="var(--k-grey-500)" style={{ fontSize: '11px' }} />
                    <YAxis stroke="var(--k-grey-500)" style={{ fontSize: '11px' }} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--k-white)',
                        border: '1px solid var(--k-grey-200)',
                        borderRadius: '12px',
                        fontFamily: 'Poppins, sans-serif',
                      }}
                      formatter={(value) => `${value}%`}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar
                      dataKey="empAts"
                      fill="#0086ff"
                      name="ATS"
                      radius={[8, 8, 0, 0]}
                      animationDuration={1200}
                      animationEasing="ease-out"
                      animationBegin={200}
                    />
                    <Bar
                      dataKey="empOtc"
                      fill="#66b6ff"
                      name="OTC"
                      radius={[8, 8, 0, 0]}
                      animationDuration={1200}
                      animationEasing="ease-out"
                      animationBegin={200}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-6 border-t" style={{ borderColor: 'var(--k-grey-200)' }}>
              {[
                {
                  label: 'Avg ATS',
                  value: employeeDetailData.employee.overall.ats,
                  color: 'blue'
                },
                {
                  label: 'Avg OTC',
                  value: employeeDetailData.employee.overall.otc,
                  color: 'blueLight'
                },
                {
                  label: 'Team ATS',
                  value: (
                    employeeDetailData.chartData
                      .map(d => parseFloat(d.teamAts))
                      .reduce((a, b) => a + b, 0) / employeeDetailData.chartData.length
                  ).toFixed(1) + '%',
                  color: 'grey'
                },
                {
                  label: 'Team OTC',
                  value: (
                    employeeDetailData.chartData
                      .map(d => parseFloat(d.teamOtc))
                      .reduce((a, b) => a + b, 0) / employeeDetailData.chartData.length
                  ).toFixed(1) + '%',
                  color: 'grey'
                }
              ].map((stat, idx) => {
                const colorStyleMap = {
                  blue: { background: 'var(--k-blue-tint)', color: 'var(--k-blue)', borderColor: 'var(--k-grey-200)' },
                  blueLight: { background: 'var(--k-blue-tint)', color: 'var(--k-blue-dark)', borderColor: 'var(--k-grey-200)' },
                  grey: { background: 'var(--k-band-grey)', color: 'var(--k-grey-700)', borderColor: 'var(--k-grey-200)' },
                };
                return (
                  <div key={idx} className="p-3 rounded-lg border" style={colorStyleMap[stat.color]}>
                    <p className="text-xs font-semibold uppercase tracking-wide opacity-75">
                      {stat.label}
                    </p>
                    <p className="text-lg font-bold mt-1">{stat.value}</p>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default React.memo(PerformanceAnalytics);
