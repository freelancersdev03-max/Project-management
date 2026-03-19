import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Box } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import api from '../../api';

const DDFMS = () => {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const { clientId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [approvedPeriod, setApprovedPeriod] = useState(null);
  const [periodOptions, setPeriodOptions] = useState([]);
  const [selectedPeriodKey, setSelectedPeriodKey] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [clientName, setClientName] = useState('');
  const [responsibleOptions, setResponsibleOptions] = useState([]);
  const stepDefinitions = [
    'Take input / format from Senior',
    'Train / transfer the information to the internal team (SC or FHH?)',
    'Prepare and review the relevant documents',
    'Checking to be done by Senior',
    'Conduct the training / auditing / discussion / time study, etc.',
    'Share the output (test score / photographs / auditing report / discussion MOM)',
    'Feedback / approval / agreement from relevant process owner / client owner',
  ];
  const stepPercentages = [10, 20, 50, 60, 70, 80, 100];

  const [deliverables, setDeliverables] = useState([]);
  const [contributorHoursByDeliverable, setContributorHoursByDeliverable] = useState({});
  const [startDatesByDeliverable, setStartDatesByDeliverable] = useState({});
  const [submittedRows, setSubmittedRows] = useState({});
  const [editingSubmittedRows, setEditingSubmittedRows] = useState({});
  const [rowSubmitLoading, setRowSubmitLoading] = useState({});
  const [monthStartWorkingDate, setMonthStartWorkingDate] = useState('');

  const [tableData, setTableData] = useState({});
  const [saveNonce, setSaveNonce] = useState(0);
  const [autosaveState, setAutosaveState] = useState('idle');
  const [autosaveError, setAutosaveError] = useState('');
  const [isBackendReady, setIsBackendReady] = useState(false);
  const [activePlanId, setActivePlanId] = useState(null);
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);

  const tableDataRef = useRef({});
  const backendDeliverableMapRef = useRef({});
  const stepIdMapRef = useRef({});
  const startDatesByDeliverableRef = useRef({});
  const pendingChangedKeysRef = useRef(new Set());
  const autosaveTimeoutRef = useRef(null);
  const savedMonthStartDateRef = useRef('');

  const getMemberDisplayName = (member) => {
    const fullName = String(member?.full_name || '').trim();
    if (fullName) return fullName;

    const firstName = String(member?.first_name || '').trim();
    const lastName = String(member?.last_name || '').trim();
    const combinedName = `${firstName} ${lastName}`.trim();
    if (combinedName) return combinedName;

    const username = String(member?.username || member?.name || '').trim();
    if (username) return username;

    const email = String(member?.email || '').trim();
    if (email) return email.split('@')[0];

    return 'Unnamed';
  };

  const formatDateYYYYMMDD = (dateObj) => {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatPeriodKey = (year, month) => `${year}-${String(month).padStart(2, '0')}`;

  const parsePeriodKey = (key) => {
    if (!key || typeof key !== 'string') return null;
    const match = key.match(/^(\d{4})-(\d{2})$/);
    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    if (!year || !month || month < 1 || month > 12) return null;

    return { year, month, key: formatPeriodKey(year, month) };
  };

  const getPreviousWorkingDateSkippingSunday = (dateStr) => {
    if (!dateStr) return '';

    const date = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(date.getTime())) return '';

    date.setDate(date.getDate() - 1);
    while (date.getDay() === 0) {
      date.setDate(date.getDate() - 1);
    }

    return formatDateYYYYMMDD(date);
  };

  const shiftSundayTargetDateToSaturday = (dateStr) => {
    if (!dateStr) return '';

    const parsed = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return dateStr;

    if (parsed.getDay() === 0) {
      parsed.setDate(parsed.getDate() - 1);
    }

    return formatDateYYYYMMDD(parsed);
  };

  const getLastWorkingDayOfMonth = (year, monthIndex) => {
    const date = new Date(year, monthIndex + 1, 0);
    while (date.getDay() === 0 || date.getDay() === 6) {
      date.setDate(date.getDate() - 1);
    }
    return date;
  };

  const getMonthStartWorkingDateSkippingSunday = (year, monthIndex) => {
    const date = new Date(year, monthIndex, 1);
    while (date.getDay() === 0) {
      date.setDate(date.getDate() + 1);
    }
    return formatDateYYYYMMDD(date);
  };

  const getStepDatesFromPercentages = (step7DateStr, startWorkingDateStr) => {
    if (!step7DateStr || !startWorkingDateStr) return null;

    const step7Date = new Date(`${step7DateStr}T00:00:00`);
    const startDate = new Date(`${startWorkingDateStr}T00:00:00`);
    if (Number.isNaN(step7Date.getTime()) || Number.isNaN(startDate.getTime())) return null;

    const totalDaysBetween = Math.max(
      0,
      Math.round((step7Date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    );
    const prefillPercentages = stepPercentages.slice(0, 6);

    return prefillPercentages.map((percentage) => {
      const stepTargetDay = Math.ceil((percentage / 100) * totalDaysBetween);
      const computedDate = new Date(startDate);
      computedDate.setDate(computedDate.getDate() + stepTargetDay);

      return shiftSundayTargetDateToSaturday(formatDateYYYYMMDD(computedDate));
    });
  };

  const getDeliverableStartDate = (deliverableId) => {
    return startDatesByDeliverable[deliverableId] || '';
  };

  const getArrayFromResponse = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.results)) return data.results;
    return [];
  };

  const parseResponsibleId = (value) => {
    if (!value || typeof value !== 'string' || !value.startsWith('id:')) return null;
    const raw = value.slice(3);
    return /^\d+$/.test(raw) ? Number(raw) : null;
  };

  const getSourceSignature = (sourceType, sourceId) => {
    const safeSourceType = sourceType || 'MANUAL';
    const safeSourceId = sourceId === null || sourceId === undefined ? '' : String(sourceId);
    return `${safeSourceType}:${safeSourceId}`;
  };

  const savePendingChanges = async () => {
    const changedKeys = Array.from(pendingChangedKeysRef.current);
    if (changedKeys.length === 0) return true;

    const uniqueStepTokens = new Set();
    const tokenToKeys = {};

    changedKeys.forEach((key) => {
      const match = key.match(/^(.*)-(\d+)-(owner|date)$/);
      if (!match) return;

      const deliverableId = match[1];
      const stepIndex = Number(match[2]);
      const token = `${deliverableId}-${stepIndex}`;
      uniqueStepTokens.add(token);

      if (!tokenToKeys[token]) tokenToKeys[token] = [];
      tokenToKeys[token].push(key);
    });

    if (uniqueStepTokens.size === 0) {
      pendingChangedKeysRef.current.clear();
      return true;
    }

    setAutosaveState('saving');
    setAutosaveError('');

    const failedTokens = [];

    for (const token of uniqueStepTokens) {
      try {
        const tokenMatch = token.match(/^(.*)-(\d+)$/);
        if (!tokenMatch) continue;

        const deliverableFrontendId = tokenMatch[1];
        const stepIndex = Number(tokenMatch[2]);
        const backendDeliverableId = backendDeliverableMapRef.current[deliverableFrontendId];

        if (!backendDeliverableId) {
          failedTokens.push(token);
          continue;
        }

        const stepNumber = stepIndex + 1;
        const ownerKey = `${deliverableFrontendId}-${stepIndex}-owner`;
        const dateKey = `${deliverableFrontendId}-${stepIndex}-date`;

        const payload = {
          deliverable: backendDeliverableId,
          step_number: stepNumber,
          responsible: parseResponsibleId(tableDataRef.current[ownerKey]),
          target_date: tableDataRef.current[dateKey] || null,
          remarks: '',
        };

        const stepLookupKey = `${backendDeliverableId}-${stepNumber}`;
        const existingStepId = stepIdMapRef.current[stepLookupKey];

        if (existingStepId) {
          await api.patch(`ddfms/steps/${existingStepId}/`, payload);
        } else {
          const createRes = await api.post('ddfms/steps/', payload);
          const createdStepId = createRes?.data?.id;
          if (createdStepId) {
            stepIdMapRef.current[stepLookupKey] = createdStepId;
          }
        }

        const savedKeys = tokenToKeys[token] || [];
        savedKeys.forEach((savedKey) => pendingChangedKeysRef.current.delete(savedKey));
      } catch (error) {
        failedTokens.push(token);
      }
    }

    if (failedTokens.length > 0) {
      setAutosaveState('error');
      setAutosaveError('Auto-save failed for some changes. It will retry on your next edit.');
      return false;
    }

    setAutosaveState('saved');
    setAutosaveError('');
    return true;
  };

  const getMissingRequiredSteps = (deliverableId) => {
    const missingSteps = [];

    stepDefinitions.forEach((_, stepIndex) => {
      const ownerKey = `${deliverableId}-${stepIndex}-owner`;
      const dateKey = `${deliverableId}-${stepIndex}-date`;
      const hasOwner = Boolean(tableDataRef.current[ownerKey]);
      const hasDate = Boolean(tableDataRef.current[dateKey]);

      if (!hasOwner || !hasDate) {
        missingSteps.push(stepIndex + 1);
      }
    });

    return missingSteps;
  };

  const toggleSubmittedRowEditMode = (deliverableId) => {
    setEditingSubmittedRows((prev) => ({
      ...prev,
      [deliverableId]: !prev[deliverableId],
    }));
  };

  const handleAssignAllSteps = async () => {
    const toSubmit = deliverables.filter(d => !submittedRows[d.id] || editingSubmittedRows[d.id]);

    if (toSubmit.length === 0) {
      alert('No pending changes to assign.');
      return;
    }

    // Check for missing steps in any of the rows to be submitted
    const rowsWithErrors = [];
    toSubmit.forEach(d => {
      const missing = getMissingRequiredSteps(d.id);
      if (missing.length > 0) {
        rowsWithErrors.push({ title: d.title, steps: missing });
      }
    });

    if (rowsWithErrors.length > 0) {
      const errorMsg = rowsWithErrors
        .map(err => `"${err.title}": Missing steps ${err.steps.join(', ')}`)
        .join('\n');
      alert(`Cannot assign all steps. Some rows are incomplete:\n\n${errorMsg}`);
      return;
    }

    if (!confirm(`Are you sure you want to assign steps for all ${toSubmit.length} deliverables?`)) {
      return;
    }

    setIsBulkSubmitting(true);
    let successCount = 0;
    let failCount = 0;

    for (const d of toSubmit) {
      const backendDeliverableId = backendDeliverableMapRef.current[d.id];
      if (!backendDeliverableId) {
        failCount++;
        continue;
      }

      // Ensure pending changes for this row are saved first
      const hasPendingRowChanges = Array.from(pendingChangedKeysRef.current).some((key) =>
        key.startsWith(`${d.id}-`)
      );

      if (hasPendingRowChanges) {
        const saveOk = await savePendingChanges();
        if (!saveOk) {
          failCount++;
          continue;
        }
      }

      try {
        await api.patch(`ddfms/deliverables/${backendDeliverableId}/`, { is_submitted: true });
        setSubmittedRows((prev) => ({ ...prev, [d.id]: true }));
        setEditingSubmittedRows((prev) => ({ ...prev, [d.id]: false }));
        successCount++;
      } catch (error) {
        console.error(`Failed to submit row ${d.id}`, error);
        failCount++;
      }
    }

    setIsBulkSubmitting(false);
    if (failCount === 0) {
      alert(`Successfully assigned all ${successCount} deliverables.`);
    } else {
      alert(`Assigned ${successCount} deliverables. ${failCount} failed. Please check your connection and try again.`);
    }
  };

  useEffect(() => {
    const fetchApprovedDeliverables = async () => {
      if (!clientId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setLoadError('');

      try {
        // Fetch client details early to ensure name is displayed even if no submissions exist
        const clientRes = await api.get(`clients/${clientId}/`);
        const clientData = clientRes?.data || {};
        setClientName(clientData?.company_name || clientData?.name || '');

        const submissionsRes = await api.get(`ddtme/submissions/?client_id=${clientId}`);
        const submissions = Array.isArray(submissionsRes.data)
          ? submissionsRes.data
          : (submissionsRes.data?.results || []);

        const approvedSubmissions = submissions.filter(
          (entry) => String(entry?.status || '').toUpperCase() === 'APPROVED'
        );

        if (approvedSubmissions.length === 0) {
          setPeriodOptions([]);
          const selectedFromKey = parsePeriodKey(selectedPeriodKey);
          const fallbackDate = selectedFromKey
            ? new Date(selectedFromKey.year, selectedFromKey.month - 1, 1)
            : new Date();
          const fallbackMonth = fallbackDate.getMonth() + 1;
          const fallbackYear = fallbackDate.getFullYear();
          const fallbackKey = formatPeriodKey(fallbackYear, fallbackMonth);

          if (!selectedFromKey) {
            setSelectedPeriodKey(fallbackKey);
          }

          setApprovedPeriod(null);
          setDeliverables([]);
          setContributorHoursByDeliverable({});
          setMonthStartWorkingDate(getMonthStartWorkingDateSkippingSunday(fallbackYear, fallbackMonth - 1));
          setActivePlanId(null);
          setTableData({});
          setIsBackendReady(false);
          setStartDatesByDeliverable({});
          setSubmittedRows({});
          setEditingSubmittedRows({});
          setRowSubmitLoading({});
          backendDeliverableMapRef.current = {};
          stepIdMapRef.current = {};
          pendingChangedKeysRef.current.clear();
          return;
        }

        const sortedApproved = [...approvedSubmissions].sort((a, b) => {
          const yearDiff = Number(b?.year || 0) - Number(a?.year || 0);
          if (yearDiff !== 0) return yearDiff;

          const monthDiff = Number(b?.month || 0) - Number(a?.month || 0);
          if (monthDiff !== 0) return monthDiff;

          return Number(b?.id || 0) - Number(a?.id || 0);
        });

        const uniquePeriodsMap = new Map();
        sortedApproved.forEach((submission) => {
          const month = Number(submission?.month || 0);
          const year = Number(submission?.year || 0);
          if (!month || !year) return;

          const key = `${year}-${String(month).padStart(2, '0')}`;
          if (!uniquePeriodsMap.has(key)) {
            uniquePeriodsMap.set(key, {
              key,
              month,
              year,
              label: new Date(year, month - 1, 1).toLocaleString('default', {
                month: 'long',
                year: 'numeric',
              }),
            });
          }
        });

        const availablePeriods = Array.from(uniquePeriodsMap.values());
        setPeriodOptions(availablePeriods);

        const selectedFromKey = parsePeriodKey(selectedPeriodKey);
        const latestAvailablePeriod = availablePeriods[0] || null;
        const selectedPeriod = selectedFromKey || latestAvailablePeriod;

        if (!selectedFromKey && latestAvailablePeriod?.key && latestAvailablePeriod.key !== selectedPeriodKey) {
          setSelectedPeriodKey(latestAvailablePeriod.key);
        }

        const selectedMonth = selectedPeriod?.month;
        const selectedYear = selectedPeriod?.year;

        if (!selectedMonth || !selectedYear) {
          setApprovedPeriod(null);
          setDeliverables([]);
          setContributorHoursByDeliverable({});
          setResponsibleOptions([]);
          setStartDatesByDeliverable({});
          setSubmittedRows({});
          setEditingSubmittedRows({});
          setRowSubmitLoading({});
          return;
        }

        const hasApprovedForSelectedMonth = availablePeriods.some(
          (period) => Number(period.month) === Number(selectedMonth) && Number(period.year) === Number(selectedYear)
        );

        if (!hasApprovedForSelectedMonth) {
          setApprovedPeriod(null);
          setDeliverables([]);
          setContributorHoursByDeliverable({});
          setResponsibleOptions([]);
          setMonthStartWorkingDate(getMonthStartWorkingDateSkippingSunday(Number(selectedYear), Number(selectedMonth) - 1));
          setActivePlanId(null);
          setTableData({});
          setIsBackendReady(false);
          setStartDatesByDeliverable({});
          setSubmittedRows({});
          setEditingSubmittedRows({});
          setRowSubmitLoading({});
          backendDeliverableMapRef.current = {};
          stepIdMapRef.current = {};
          pendingChangedKeysRef.current.clear();
          return;
        }

        setApprovedPeriod({ month: selectedMonth, year: selectedYear });

        const headers = {};

        const [bigTasksRes, additionalTasksRes, entriesRes] = await Promise.all([
          api.get(`ddtme/big-tasks/?client_id=${clientId}&month=${selectedMonth}&year=${selectedYear}`, { headers }),
          api.get(`ddtme/additional-tasks/?client_id=${clientId}&month=${selectedMonth}&year=${selectedYear}`, { headers }),
          api.get(`ddtme/man-day-entries/?client_id=${clientId}&month=${selectedMonth}&year=${selectedYear}`, { headers }),
        ]);

        const role = (localStorage.getItem('role') || '').toUpperCase();

        const fetchProjectsData = async () => {
          try {
            if (role === 'EMPLOYEE') {
              const employeeProjectsRes = await api.get('employees/my-projects/', { headers });
              const employeeProjects = Array.isArray(employeeProjectsRes.data)
                ? employeeProjectsRes.data
                : (employeeProjectsRes.data?.results || []);

              return employeeProjects.filter((project) => {
                const projectClientId = project?.client?.id
                  ?? project?.client_id
                  ?? project?.client;
                return String(projectClientId) === String(clientId);
              });
            }

            let projectsEndpoint = `projects/?client_id=${clientId}`;
            if (role === 'SGM') projectsEndpoint = `sgm/projects/?client_id=${clientId}`;

            const projectsRes = await api.get(projectsEndpoint, { headers });
            return Array.isArray(projectsRes.data)
              ? projectsRes.data
              : (projectsRes.data?.results || []);
          } catch (projectError) {
            console.warn('Failed to load projects for DDFMS context, continuing with defaults.', projectError);
            return [];
          }
        };

        const [projectsData, employeesRes] = await Promise.all([
          fetchProjectsData(),
          api.get(`clients/${clientId}/employees/`, { headers }),
        ]);

        // Re-using clientData from above

        const clientEmployees = Array.isArray(employeesRes.data)
          ? employeesRes.data
          : (employeesRes.data?.results || []);

        const entriesData = Array.isArray(entriesRes.data)
          ? entriesRes.data
          : (entriesRes.data?.results || []);

        const bigTasks = Array.isArray(bigTasksRes.data)
          ? bigTasksRes.data
          : (bigTasksRes.data?.results || []);
        const additionalTasks = Array.isArray(additionalTasksRes.data)
          ? additionalTasksRes.data
          : (additionalTasksRes.data?.results || []);

        const selectedMonthIndex = Number(selectedMonth) - 1;
        const selectedPeriodStart = new Date(Number(selectedYear), selectedMonthIndex, 1);
        const nextSelectedPeriodStart = new Date(Number(selectedYear), selectedMonthIndex + 1, 1);
        const selectedPeriodLastWorkingDate = getLastWorkingDayOfMonth(Number(selectedYear), selectedMonthIndex);
        const selectedPeriodLastWorkingDateStr = formatDateYYYYMMDD(selectedPeriodLastWorkingDate);

        const normalizeTask = (task, type, index) => {
          const rawDate = task?.target_date ? String(task.target_date).slice(0, 10) : '';
          const parsedDate = rawDate ? new Date(`${rawDate}T00:00:00`) : null;

          if (parsedDate && parsedDate < selectedPeriodStart) {
            return null;
          }

          let effectiveTargetDate = rawDate;
          if (parsedDate && parsedDate >= nextSelectedPeriodStart) {
            effectiveTargetDate = selectedPeriodLastWorkingDateStr;
          }

          if (!effectiveTargetDate) {
            effectiveTargetDate = selectedPeriodLastWorkingDateStr;
          }

          effectiveTargetDate = shiftSundayTargetDateToSaturday(effectiveTargetDate);

          return {
            id: `${type}-${task?.id || index}`,
            title: type === 'big' ? (task.ddtme_title || task.title) : task.title,
            startDate: '',
            targetDate: effectiveTargetDate,
            sourceType: type === 'big' ? 'BIG_TASK' : 'ADDITIONAL_TASK',
            sourceId: task?.id ?? null,
          };
        };

        const normalizedBigTasks = bigTasks
          .filter((task) => task?.title)
          .map((task, index) => normalizeTask(task, 'big', index))
          .filter(Boolean);

        const normalizedAdditionalTasks = additionalTasks
          .filter((task) => task?.title)
          .map((task, index) => normalizeTask(task, 'add', index))
          .filter(Boolean);

        const normalized = [...normalizedBigTasks, ...normalizedAdditionalTasks];

        const hierarchyRank = { HH: 1, SC: 2, SGM: 3 };
        const memberMap = new Map();

        const extractHierarchyMap = (hierarchyItems) => {
          const hierarchyMap = {};
          if (!Array.isArray(hierarchyItems)) return hierarchyMap;

          hierarchyItems.forEach((item) => {
            const rawHierarchy = String(item?.hierarchy || '').toUpperCase();
            if (!hierarchyRank[rawHierarchy]) return;

            const keys = [];
            if (item.member_id !== null && item.member_id !== undefined) {
              keys.push(`id:${String(item.member_id)}`);
            }
            if (item.member_key !== null && item.member_key !== undefined) {
              keys.push(`key:${String(item.member_key)}`);
            }

            keys.forEach((key) => {
              const existingHierarchy = hierarchyMap[key];
              if (!existingHierarchy || hierarchyRank[rawHierarchy] >= hierarchyRank[existingHierarchy]) {
                hierarchyMap[key] = rawHierarchy;
              }
            });
          });

          return hierarchyMap;
        };

        const hierarchyByMemberGlobal = extractHierarchyMap(clientData?.client_hierarchy);

        // Keep project-level hierarchy as a fallback for older data while preferring client-level hierarchy.
        projectsData.forEach((project) => {
          const projectHierarchyMap = extractHierarchyMap(project?.project_hierarchy);
          Object.entries(projectHierarchyMap).forEach(([key, hierarchy]) => {
            const existingHierarchy = hierarchyByMemberGlobal[key];
            if (!existingHierarchy) {
              hierarchyByMemberGlobal[key] = hierarchy;
            }
          });
        });

        const addOption = (value, label, hierarchy) => {
          const safeHierarchy = hierarchyRank[hierarchy] ? hierarchy : 'HH';
          const next = { value, label, hierarchy: safeHierarchy };
          const existing = memberMap.get(value);

          const isUnnamedLabel = (rawLabel) => String(rawLabel || '').toLowerCase().startsWith('unnamed');

          if (!existing) {
            memberMap.set(value, next);
            return;
          }

          const nextRank = hierarchyRank[next.hierarchy] || 0;
          const existingRank = hierarchyRank[existing.hierarchy] || 0;

          if (nextRank > existingRank) {
            memberMap.set(value, next);
            return;
          }

          if (nextRank === existingRank && isUnnamedLabel(existing.label) && !isUnnamedLabel(next.label)) {
            memberMap.set(value, next);
          }
        };

        clientEmployees.forEach((employee, index) => {
          const memberId = employee?.user_id ?? employee?.id ?? employee?.employee_id;
          const memberKey = String(memberId ?? `employee-${index}`);
          const username = getMemberDisplayName(employee);
          const hierarchy = hierarchyByMemberGlobal[`id:${memberKey}`]
            || hierarchyByMemberGlobal[`key:${memberKey}`]
            || 'HH';
          addOption(`id:${memberKey}`, `${username} (${hierarchy})`, hierarchy);
        });

        const clientInternalTeam = Array.isArray(clientData?.internal_team_details)
          ? clientData.internal_team_details
          : [];

        clientInternalTeam.forEach((member, index) => {
          const memberId = member?.id;
          const memberKey = String(memberId ?? `internal-${index}`);
          const username = getMemberDisplayName(member);
          const hierarchy = hierarchyByMemberGlobal[`id:${memberKey}`]
            || hierarchyByMemberGlobal[`key:${memberKey}`]
            || 'HH';
          addOption(`id:${memberKey}`, `${username} (${hierarchy})`, hierarchy);
        });

        const clientSgms = Array.isArray(clientData?.assigned_sgms_details)
          ? clientData.assigned_sgms_details
          : [];

        clientSgms.forEach((sgm, index) => {
          const sgmId = sgm?.id;
          const sgmKey = String(sgmId ?? `sgm-${index}`);
          const username = getMemberDisplayName(sgm);
          addOption(`id:${sgmKey}`, `${username} (SGM)`, 'SGM');
        });

        projectsData.forEach((project) => {
          const hierarchyByMember = extractHierarchyMap(project?.project_hierarchy);

          const sgmDetail = project?.assigned_sgm_details
            || (project?.assigned_sgm_name || project?.assigned_sgm
              ? {
                id: project.assigned_sgm,
                username: project.assigned_sgm_name || 'Unnamed',
                full_name: project.assigned_sgm_name || 'Unnamed',
              }
              : null);

          if (sgmDetail) {
            const name = getMemberDisplayName(sgmDetail);
            const value = `id:${String(sgmDetail.id ?? `sgm-${name}`)}`;
            addOption(value, `${name} (SGM)`, 'SGM');
          }

          const internalTeam = Array.isArray(project?.team_members_details)
            ? project.team_members_details
            : (Array.isArray(project?.internal_team_details) ? project.internal_team_details : []);

          internalTeam.forEach((member, index) => {
            const name = getMemberDisplayName(member);
            const memberId = member?.id;
            const memberKey = String(memberId ?? `internal-${index}-${name}`);
            const hierarchy = hierarchyByMemberGlobal[`id:${memberKey}`]
              || hierarchyByMemberGlobal[`key:${memberKey}`]
              || hierarchyByMember[`id:${memberKey}`]
              || hierarchyByMember[`key:${memberKey}`]
              || 'HH';
            const value = `id:${memberKey}`;
            addOption(value, `${name} (${hierarchy})`, hierarchy);
          });
        });

        const responsibleMembers = Array.from(memberMap.values());
        setResponsibleOptions(responsibleMembers);

        const userIdByEmployeeId = new Map();
        clientEmployees.forEach((employee) => {
          const employeeId = employee?.employee_id ?? employee?.id;
          const userId = employee?.user_id;
          if (employeeId !== null && employeeId !== undefined && userId !== null && userId !== undefined) {
            userIdByEmployeeId.set(String(employeeId), String(userId));
          }
        });

        const contributorHoursMap = {};
        entriesData.forEach((entry) => {
          const planHours = Number(entry?.plan_hours || 0);
          const offHours = Number(entry?.off_hours || 0);
          const totalHours = planHours + offHours;
          if (totalHours <= 0) return;

          const taskKey = entry?.big_task
            ? `big-${entry.big_task}`
            : (entry?.additional_task ? `add-${entry.additional_task}` : null);
          if (!taskKey) return;

          const entryUserId = entry?.employee_user_id;
          const employeeId = entry?.employee_id ?? entry?.employee;
          const resolvedUserId = entryUserId ?? userIdByEmployeeId.get(String(employeeId));
          const userId = resolvedUserId !== null && resolvedUserId !== undefined ? String(resolvedUserId) : '';
          if (!userId) return;

          if (!contributorHoursMap[taskKey]) contributorHoursMap[taskKey] = {};
          const memberKey = `id:${userId}`;
          contributorHoursMap[taskKey][memberKey] = Number(contributorHoursMap[taskKey][memberKey] || 0) + totalHours;
        });

        setContributorHoursByDeliverable(contributorHoursMap);
        setDeliverables(normalized);
      } catch (error) {
        console.error('Failed to fetch approved DDTME deliverables for DDFMS', error);
        setLoadError('Failed to load approved DDTME data.');
        setApprovedPeriod(null);
        setPeriodOptions([]);
        setDeliverables([]);
        setContributorHoursByDeliverable({});
        setResponsibleOptions([]);
        setStartDatesByDeliverable({});
        setSubmittedRows({});
        setEditingSubmittedRows({});
        setRowSubmitLoading({});
      } finally {
        setLoading(false);
      }
    };

    fetchApprovedDeliverables();
  }, [clientId, selectedPeriodKey]);

  const updateCell = (key, value) => {
    const dateKeyMatch = key.match(/^(.*)-(\d+)-date$/);
    const normalizedDateValue = dateKeyMatch ? shiftSundayTargetDateToSaturday(value) : value;

    if (dateKeyMatch && normalizedDateValue && normalizedDateValue < todayStr) {
      alert("Target date cannot be in the past.");
      return;
    }

    if (!dateKeyMatch) {
      pendingChangedKeysRef.current.add(key);
      setTableData((prev) => ({ ...prev, [key]: normalizedDateValue }));
      setSaveNonce((prev) => prev + 1);
      return;
    }

    const deliverableId = dateKeyMatch[1];
    const stepIndex = Number(dateKeyMatch[2]);

    if (stepIndex === 6) {
      setTableData((prev) => {
        const next = { ...prev, [key]: normalizedDateValue };
        pendingChangedKeysRef.current.add(key);

        const rowStartDate = getDeliverableStartDate(deliverableId);
        const computedStepDates = getStepDatesFromPercentages(normalizedDateValue, rowStartDate);
        if (computedStepDates) {
          computedStepDates.forEach((computedDate, index) => {
            const computedDateKey = `${deliverableId}-${index}-date`;
            next[computedDateKey] = computedDate;
            pendingChangedKeysRef.current.add(computedDateKey);
          });
        }

        const step7DateKey = `${deliverableId}-6-date`;
        next[step7DateKey] = normalizedDateValue;
        pendingChangedKeysRef.current.add(step7DateKey);

        return next;
      });

      setSaveNonce((prev) => prev + 1);
      return;
    }

    setTableData((prev) => {
      const next = { ...prev, [key]: normalizedDateValue };
      pendingChangedKeysRef.current.add(key);

      let previousDate = normalizedDateValue;
      for (let index = stepIndex - 1; index >= 0; index -= 1) {
        previousDate = getPreviousWorkingDateSkippingSunday(previousDate);
        const previousDateKey = `${deliverableId}-${index}-date`;
        next[previousDateKey] = previousDate;
        pendingChangedKeysRef.current.add(previousDateKey);
      }

      return next;
    });

    setSaveNonce((prev) => prev + 1);
  };

  const handleDeliverableStartDateChange = async (deliverableId, startDateValue) => {
    if (startDateValue && startDateValue < todayStr) {
      alert("Start date cannot be in the past.");
      return;
    }
    const normalizedStartDate = startDateValue || '';

    setStartDatesByDeliverable((prev) => ({
      ...prev,
      [deliverableId]: normalizedStartDate,
    }));

    const step7DateKey = `${deliverableId}-6-date`;
    const step7Date = tableDataRef.current[step7DateKey] || '';

    if (step7Date && normalizedStartDate) {
      setTableData((prev) => {
        const computedStepDates = getStepDatesFromPercentages(step7Date, normalizedStartDate);
        if (!computedStepDates) return prev;

        let changed = false;
        const next = { ...prev };

        computedStepDates.forEach((computedDate, index) => {
          const computedDateKey = `${deliverableId}-${index}-date`;
          if (next[computedDateKey] !== computedDate) {
            next[computedDateKey] = computedDate;
            pendingChangedKeysRef.current.add(computedDateKey);
            changed = true;
          }
        });

        if (changed) {
          setSaveNonce((nonce) => nonce + 1);
          return next;
        }

        return prev;
      });
    }

    const backendDeliverableId = backendDeliverableMapRef.current[deliverableId];
    if (!backendDeliverableId) return;

    try {
      await api.patch(`ddfms/deliverables/${backendDeliverableId}/`, {
        start_date: normalizedStartDate || null,
      });
    } catch (error) {
      console.error('Failed to save deliverable start date', error);
      alert('Failed to save start date. Please retry.');
    }
  };

  useEffect(() => {
    if (!approvedPeriod?.month || !approvedPeriod?.year) return;

    const year = Number(approvedPeriod.year);
    const monthIndex = Number(approvedPeriod.month) - 1;
    if (Number.isNaN(year) || Number.isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) return;

    setMonthStartWorkingDate(getMonthStartWorkingDateSkippingSunday(year, monthIndex));
    setIsBackendReady(false);
    setActivePlanId(null);
    setTableData({});
    backendDeliverableMapRef.current = {};
    stepIdMapRef.current = {};
    pendingChangedKeysRef.current.clear();
  }, [approvedPeriod]);

  useEffect(() => {
    tableDataRef.current = tableData;
  }, [tableData]);

  useEffect(() => {
    startDatesByDeliverableRef.current = startDatesByDeliverable;
  }, [startDatesByDeliverable]);

  useEffect(() => {
    const initializeDdfmsData = async () => {
      if (!clientId || !approvedPeriod) {
        return;
      }

      try {
        setIsBackendReady(false);
        setAutosaveState('saving');
        setAutosaveError('');

        const plansRes = await api.get(
          `ddfms/plans/?client_id=${clientId}&month=${approvedPeriod.month}&year=${approvedPeriod.year}`
        );
        const existingPlans = getArrayFromResponse(plansRes.data);

        const defaultMonthStartDate = getMonthStartWorkingDateSkippingSunday(
          Number(approvedPeriod.year),
          Number(approvedPeriod.month) - 1
        );

        let plan = existingPlans[0] || null;
        if (!plan) {
          const createPlanRes = await api.post('ddfms/plans/', {
            client: Number(clientId),
            month: Number(approvedPeriod.month),
            year: Number(approvedPeriod.year),
            start_working_date: defaultMonthStartDate,
          });
          plan = createPlanRes.data;
        }

        const planId = plan?.id;
        if (!planId) {
          throw new Error('Unable to initialize DDFMS plan');
        }

        setActivePlanId(planId);

        const resolvedMonthStartDate = plan?.start_working_date
          ? String(plan.start_working_date).slice(0, 10)
          : defaultMonthStartDate;
        setMonthStartWorkingDate(resolvedMonthStartDate);
        savedMonthStartDateRef.current = resolvedMonthStartDate;

        const deliverablesRes = await api.get(`ddfms/deliverables/?plan_id=${planId}`);
        const backendDeliverables = getArrayFromResponse(deliverablesRes.data);

        const existingBySignature = backendDeliverables.reduce((acc, item) => {
          const signature = getSourceSignature(item?.source_type, item?.source_id);
          acc[signature] = item;
          return acc;
        }, {});

        const frontendToBackendMap = {};
        const frontendStartDateMap = {};
        const frontendSubmittedMap = {};

        for (let index = 0; index < deliverables.length; index += 1) {
          const deliverable = deliverables[index];
          const signature = getSourceSignature(deliverable.sourceType, deliverable.sourceId);
          let backendDeliverable = existingBySignature[signature];
          const pendingStartDate = startDatesByDeliverableRef.current[deliverable.id] || '';
          const rowStartDate = pendingStartDate || deliverable.startDate || '';
          const normalizedRowStartDate = rowStartDate || null;

          if (!backendDeliverable) {
            const createDeliverableRes = await api.post('ddfms/deliverables/', {
              plan: planId,
              source_type: deliverable.sourceType || 'MANUAL',
              source_id: deliverable.sourceId,
              title: deliverable.title,
              start_date: normalizedRowStartDate,
              target_date: deliverable.targetDate || null,
              order_index: index,
            });
            backendDeliverable = createDeliverableRes.data;
            existingBySignature[signature] = backendDeliverable;
          } else {
            const backendStartDate = backendDeliverable?.start_date
              ? String(backendDeliverable.start_date).slice(0, 10)
              : '';

            if (normalizedRowStartDate && backendStartDate !== normalizedRowStartDate) {
              const updateDeliverableRes = await api.patch(`ddfms/deliverables/${backendDeliverable.id}/`, {
                start_date: normalizedRowStartDate,
              });
              backendDeliverable = updateDeliverableRes.data;
              existingBySignature[signature] = backendDeliverable;
            }
          }

          if (backendDeliverable?.id) {
            frontendToBackendMap[deliverable.id] = backendDeliverable.id;
          }

          frontendStartDateMap[deliverable.id] = backendDeliverable?.start_date
            ? String(backendDeliverable.start_date).slice(0, 10)
            : (rowStartDate || '');

          frontendSubmittedMap[deliverable.id] = Boolean(backendDeliverable?.is_submitted);
        }

        backendDeliverableMapRef.current = frontendToBackendMap;
        setStartDatesByDeliverable(frontendStartDateMap);
        setSubmittedRows(frontendSubmittedMap);
        setEditingSubmittedRows({});
        setRowSubmitLoading({});

        const stepsRes = await api.get(`ddfms/steps/?plan_id=${planId}`);
        const backendSteps = getArrayFromResponse(stepsRes.data);
        const backendToFrontendMap = Object.entries(frontendToBackendMap).reduce((acc, [frontendId, backendId]) => {
          acc[String(backendId)] = frontendId;
          return acc;
        }, {});

        const loadedTableData = {};
        const loadedStepIdMap = {};

        backendSteps.forEach((step) => {
          const backendDeliverableId = step?.deliverable;
          const frontendDeliverableId = backendToFrontendMap[String(backendDeliverableId)];
          if (!frontendDeliverableId) return;

          const stepNumber = Number(step?.step_number || 0);
          if (stepNumber < 1 || stepNumber > 12) return;

          const stepIndex = stepNumber - 1;
          const ownerKey = `${frontendDeliverableId}-${stepIndex}-owner`;
          const dateKey = `${frontendDeliverableId}-${stepIndex}-date`;
          const rawStepDate = step?.target_date ? String(step.target_date).slice(0, 10) : '';
          const normalizedStepDate = shiftSundayTargetDateToSaturday(rawStepDate);

          loadedTableData[ownerKey] = step?.responsible ? `id:${step.responsible}` : '';
          loadedTableData[dateKey] = normalizedStepDate;

          if (rawStepDate && rawStepDate !== normalizedStepDate) {
            pendingChangedKeysRef.current.add(dateKey);
          }

          loadedStepIdMap[`${backendDeliverableId}-${stepNumber}`] = step?.id;
        });

        deliverables.forEach((deliverable) => {
          const taskTargetDate = deliverable?.targetDate ? String(deliverable.targetDate).slice(0, 10) : '';
          if (!taskTargetDate) return;

          const step7DateKey = `${deliverable.id}-6-date`;
          if (loadedTableData[step7DateKey] !== taskTargetDate) {
            loadedTableData[step7DateKey] = taskTargetDate;
            pendingChangedKeysRef.current.add(step7DateKey);
          }

          const rowStartDate = frontendStartDateMap[deliverable.id] || '';
          const computedStepDates = getStepDatesFromPercentages(taskTargetDate, rowStartDate);
          if (!computedStepDates) return;

          computedStepDates.forEach((computedDate, index) => {
            const computedDateKey = `${deliverable.id}-${index}-date`;
            if (loadedTableData[computedDateKey] !== computedDate) {
              loadedTableData[computedDateKey] = computedDate;
              pendingChangedKeysRef.current.add(computedDateKey);
            }
          });
        });

        stepIdMapRef.current = loadedStepIdMap;

        setTableData(loadedTableData);

        setIsBackendReady(true);
        setAutosaveState('saved');
      } catch (error) {
        console.error('Failed to initialize DDFMS autosave context', error);
        setActivePlanId(null);
        setIsBackendReady(false);
        setAutosaveState('error');
        setAutosaveError('Auto-save unavailable. Please refresh and try again.');
      }
    };

    initializeDdfmsData();
  }, [clientId, approvedPeriod, deliverables]);

  useEffect(() => {
    if (!activePlanId || !monthStartWorkingDate) return;
    if (savedMonthStartDateRef.current === monthStartWorkingDate) return;

    let isCancelled = false;

    const saveMonthStartDate = async () => {
      try {
        await api.patch(`ddfms/plans/${activePlanId}/`, {
          start_working_date: monthStartWorkingDate,
        });

        if (!isCancelled) {
          savedMonthStartDateRef.current = monthStartWorkingDate;
        }
      } catch (error) {
        if (!isCancelled) {
          console.error('Failed to save DDFMS month start working date', error);
        }
      }
    };

    saveMonthStartDate();

    return () => {
      isCancelled = true;
    };
  }, [activePlanId, monthStartWorkingDate]);

  useEffect(() => {
    if (saveNonce <= 0) return;
    if (!isBackendReady) return;

    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    autosaveTimeoutRef.current = setTimeout(() => {
      savePendingChanges();
    }, 600);

    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, [saveNonce, isBackendReady]);

  useEffect(() => {
    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isBackendReady) return;
    if (pendingChangedKeysRef.current.size === 0) return;
    setSaveNonce((prev) => prev + 1);
  }, [isBackendReady]);

  useEffect(() => {
    if (!Array.isArray(deliverables) || deliverables.length === 0) return;
    if (!Array.isArray(responsibleOptions) || responsibleOptions.length === 0) return;

    const seniorSteps = new Set([1, 2, 4, 6, 7]);

    const toHierarchy = (option) => String(option?.hierarchy || 'HH').toUpperCase();
    const byRole = (options, role) => options.filter((option) => toHierarchy(option) === role);

    const pickHighestHours = (options, taskHoursMap) => {
      if (!Array.isArray(options) || options.length === 0) return null;

      const sorted = [...options].sort((a, b) => {
        const hoursA = Number(taskHoursMap?.[a.value] || 0);
        const hoursB = Number(taskHoursMap?.[b.value] || 0);
        if (hoursA !== hoursB) return hoursB - hoursA;
        return String(a?.label || '').localeCompare(String(b?.label || ''));
      });

      return sorted[0] || null;
    };

    const pickSeniorAndJunior = (taskHoursMap) => {
      const membersWithHours = responsibleOptions.filter((option) => Number(taskHoursMap?.[option.value] || 0) > 0);
      const pool = membersWithHours.length > 0 ? membersWithHours : responsibleOptions;

      const sgmPool = byRole(pool, 'SGM');
      const scPool = byRole(pool, 'SC');
      const hhPool = byRole(pool, 'HH');

      const senior = pickHighestHours(sgmPool, taskHoursMap)
        || pickHighestHours(scPool, taskHoursMap)
        || pickHighestHours(hhPool, taskHoursMap)
        || pool[0]
        || null;

      if (!senior) return { senior: null, junior: null };

      const seniorRole = toHierarchy(senior);
      let junior = null;

      if (seniorRole === 'SGM') {
        junior = pickHighestHours(hhPool, taskHoursMap)
          || pickHighestHours(scPool, taskHoursMap)
          || senior;
      } else if (seniorRole === 'SC') {
        junior = pickHighestHours(hhPool, taskHoursMap) || senior;
      } else {
        junior = senior;
      }

      return { senior, junior };
    };

    setTableData((prev) => {
      const next = { ...prev };
      let changed = false;

      deliverables.forEach((deliverable) => {
        const isRowLocked = Boolean(submittedRows[deliverable.id]) && !Boolean(editingSubmittedRows[deliverable.id]);
        if (isRowLocked) return;

        const taskHoursMap = contributorHoursByDeliverable?.[deliverable.id] || {};
        const { senior, junior } = pickSeniorAndJunior(taskHoursMap);
        if (!senior?.value || !junior?.value) return;

        stepDefinitions.forEach((_, stepIndex) => {
          const ownerKey = `${deliverable.id}-${stepIndex}-owner`;
          const stepNumber = stepIndex + 1;
          const desiredOwner = seniorSteps.has(stepNumber) ? senior.value : junior.value;

          if (next[ownerKey] !== desiredOwner) {
            next[ownerKey] = desiredOwner;
            pendingChangedKeysRef.current.add(ownerKey);
            changed = true;
          }
        });
      });

      if (changed) {
        setSaveNonce((nonce) => nonce + 1);
      }

      return changed ? next : prev;
    });
  }, [deliverables, responsibleOptions, contributorHoursByDeliverable, stepDefinitions, submittedRows, editingSubmittedRows]);

  const currentPeriodIndex = periodOptions.findIndex((period) => period.key === selectedPeriodKey);
  const parsedSelectedPeriod = parsePeriodKey(selectedPeriodKey);
  const fallbackDisplayPeriod = approvedPeriod
    ? {
      year: Number(approvedPeriod.year),
      month: Number(approvedPeriod.month),
    }
    : (periodOptions[0]
      ? { year: Number(periodOptions[0].year), month: Number(periodOptions[0].month) }
      : { year: new Date().getFullYear(), month: new Date().getMonth() + 1 });

  const displayYear = parsedSelectedPeriod?.year || fallbackDisplayPeriod.year;
  const displayMonth = parsedSelectedPeriod?.month || fallbackDisplayPeriod.month;
  const currentPeriodLabel = new Date(displayYear, displayMonth - 1, 1).toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

  const canGoPrevMonth = true;
  const canGoNextMonth = true;

  const goToPrevMonth = () => {
    const prevDate = new Date(displayYear, displayMonth - 2, 1);
    setSelectedPeriodKey(formatPeriodKey(prevDate.getFullYear(), prevDate.getMonth() + 1));
  };

  const goToNextMonth = () => {
    const nextDate = new Date(displayYear, displayMonth, 1);
    setSelectedPeriodKey(formatPeriodKey(nextDate.getFullYear(), nextDate.getMonth() + 1));
  };

  const stickyDeliverableWidthPx = 480;
  const stickyDateColumnWidthPx = 150;
  const stickyStartDateLeftPx = stickyDeliverableWidthPx;
  const stickyTargetDateLeftPx = stickyDeliverableWidthPx + stickyDateColumnWidthPx;
  const ddfmsScrollbarStyles = `
    .ddfms-scrollbar {
      scrollbar-width: thin;
      scrollbar-color: #64748b #e2e8f0;
    }

    .ddfms-scrollbar::-webkit-scrollbar {
      width: 10px;
      height: 10px;
    }

    .ddfms-scrollbar::-webkit-scrollbar-track {
      background: linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%);
      border-radius: 999px;
    }

    .ddfms-scrollbar::-webkit-scrollbar-thumb {
      background: linear-gradient(180deg, #94a3b8 0%, #64748b 100%);
      border-radius: 999px;
      border: 2px solid #e2e8f0;
    }

    .ddfms-scrollbar::-webkit-scrollbar-thumb:hover {
      background: linear-gradient(180deg, #64748b 0%, #475569 100%);
    }
  `;

  return (
    <div className="h-screen w-screen bg-[#FBFBFB] antialiased font-sans flex overflow-hidden">
      <style>{ddfmsScrollbarStyles}</style>
      <Sidebar />

      <main className="flex-1 overflow-hidden transition-all duration-300">
        <div className="h-full max-w-[1600px] mx-auto px-6 pt-6 pb-4 flex flex-col gap-6">
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm flex items-center justify-between gap-4">
            {/* LEFT: BACK BUTTON + ICON + TITLE */}
            <div className="flex items-center gap-4 min-w-[300px]">
              <button
                onClick={() => navigate('/ddfms')}
                className="p-1.5 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                title="Back to DDFMS"
              >
                <ChevronLeft size={20} />
              </button>

              <div className="h-6 w-px bg-slate-200 ml-1"></div>

              <div className="flex items-center gap-3 ml-1">
                <span className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
                  <Box size={16} />
                </span>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">DDFMS Workspace</h1>
              </div>
            </div>

            {/* CENTER: CLIENT NAME */}
            <div className="flex-1 text-center">
              <p className="text-slate-600 text-sm font-bold truncate px-4">{clientName}</p>
            </div>

            {/* RIGHT: MONTH NAVIGATION */}
            <div className="flex items-center gap-3 min-w-[200px] justify-end">
              <button
                type="button"
                onClick={goToPrevMonth}
                disabled={!canGoPrevMonth}
                className="p-1.5 rounded-full border border-slate-200 text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs font-black uppercase tracking-widest text-slate-700 min-w-[120px] text-center">{currentPeriodLabel}</span>
              <button
                type="button"
                onClick={goToNextMonth}
                disabled={!canGoNextMonth}
                className="p-1.5 rounded-full border border-slate-200 text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {!loading && !approvedPeriod && !loadError && (
            <p className="text-amber-700 text-sm mt-2 font-semibold">
              No approved DDTME submission found for selected month.
            </p>
          )}

          {loadError && (
            <p className="text-red-600 text-sm mt-2 font-semibold">{loadError}</p>
          )}


          <div className="mt-1 flex-1 min-h-0 flex flex-col gap-3">

            <div
              className="border border-slate-200 rounded-xl overflow-x-auto overflow-y-auto shadow-sm ddfms-scrollbar flex-1 min-h-0"
            >
              <table className="w-full min-w-[3000px] border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200">
                    <th
                      className="sticky left-0 z-30 bg-slate-100 p-3 text-left text-[11px] font-black uppercase tracking-wider text-slate-700 border-r border-slate-200"
                      style={{ width: `${stickyDeliverableWidthPx}px`, minWidth: `${stickyDeliverableWidthPx}px`, maxWidth: `${stickyDeliverableWidthPx}px` }}
                    >
                      Deliverable / Step
                    </th>
                    <th
                      className="sticky z-30 bg-slate-100 p-3 text-center text-[11px] font-black uppercase tracking-wider text-slate-700 border-r border-slate-200"
                      style={{ left: `${stickyStartDateLeftPx}px`, width: `${stickyDateColumnWidthPx}px`, minWidth: `${stickyDateColumnWidthPx}px`, maxWidth: `${stickyDateColumnWidthPx}px` }}
                    >
                      Start Date
                    </th>
                    <th
                      className="sticky z-30 bg-slate-100 p-3 text-center text-[11px] font-black uppercase tracking-wider text-slate-700 border-r border-slate-200"
                      style={{ left: `${stickyTargetDateLeftPx}px`, width: `${stickyDateColumnWidthPx}px`, minWidth: `${stickyDateColumnWidthPx}px`, maxWidth: `${stickyDateColumnWidthPx}px` }}
                    >
                      Target Date
                    </th>
                    {stepDefinitions.map((stepText, index) => (
                      <th
                        key={`step-${index + 1}`}
                        colSpan={2}
                        className="p-3 text-center text-[11px] font-black uppercase tracking-wider text-slate-700 border-r border-slate-200 min-w-[180px]"
                      >
                        <div className="space-y-1 normal-case tracking-normal">
                          <div className="uppercase text-[11px] font-black tracking-wider">Step {index + 1}</div>
                          <div className="text-[12px] font-bold text-slate-600 leading-relaxed">{stepText}</div>
                        </div>
                      </th>
                    ))}
                    <th className="p-3 text-center text-[11px] font-black uppercase tracking-wider text-slate-700 min-w-[180px]">
                      Actions
                    </th>
                  </tr>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th
                      className="sticky left-0 z-30 bg-slate-50 p-2 text-left text-[11px] font-bold text-slate-500 border-r border-slate-200"
                      style={{ width: `${stickyDeliverableWidthPx}px`, minWidth: `${stickyDeliverableWidthPx}px`, maxWidth: `${stickyDeliverableWidthPx}px` }}
                    >
                      Item
                    </th>
                    <th
                      className="sticky z-30 bg-slate-50 p-2 text-center text-[11px] font-bold text-slate-500 border-r border-slate-200"
                      style={{ left: `${stickyStartDateLeftPx}px`, width: `${stickyDateColumnWidthPx}px`, minWidth: `${stickyDateColumnWidthPx}px`, maxWidth: `${stickyDateColumnWidthPx}px` }}
                    >
                      Start Date
                    </th>
                    <th
                      className="sticky z-30 bg-slate-50 p-2 text-center text-[11px] font-bold text-slate-500 border-r border-slate-200"
                      style={{ left: `${stickyTargetDateLeftPx}px`, width: `${stickyDateColumnWidthPx}px`, minWidth: `${stickyDateColumnWidthPx}px`, maxWidth: `${stickyDateColumnWidthPx}px` }}
                    >
                      Target Date
                    </th>
                    {stepDefinitions.map((_, index) => (
                      <React.Fragment key={`step-sub-${index + 1}`}>
                        <th className="p-2 text-center text-[11px] font-bold text-slate-500 border-r border-slate-200 min-w-[140px]">
                          Responsible Person
                        </th>
                        <th className="p-2 text-center text-[11px] font-bold text-slate-500 border-r border-slate-200 min-w-[140px]">
                          Target Date
                        </th>
                      </React.Fragment>
                    ))}
                    <th className="p-2 text-center text-[11px] font-bold text-slate-500 min-w-[180px]">
                      Row Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {deliverables.map((deliverable, rowIndex) => {
                    const isRowSubmitted = Boolean(submittedRows[deliverable.id]);
                    const isRowEditMode = Boolean(editingSubmittedRows[deliverable.id]);
                    const isRowLocked = isRowSubmitted && !isRowEditMode;
                    const isRowSubmitting = Boolean(rowSubmitLoading[deliverable.id]);
                    const rowBackgroundClass = isRowSubmitted ? 'bg-emerald-50/70' : 'bg-white';

                    return (
                      <tr key={deliverable.id} className={`${rowBackgroundClass} border-b border-slate-100`}>
                        <td
                          className={`sticky left-0 z-20 ${rowBackgroundClass} p-1.5 pr-6 border-r border-slate-200 align-top`}
                          style={{ width: `${stickyDeliverableWidthPx}px`, minWidth: `${stickyDeliverableWidthPx}px`, maxWidth: `${stickyDeliverableWidthPx}px` }}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="text-[12px] font-black text-slate-500">{rowIndex + 1})</span>
                            <div className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-[10px] font-semibold text-slate-800 truncate">
                              {deliverable.title}
                            </div>
                          </div>
                        </td>

                        <td
                          className={`sticky z-20 ${rowBackgroundClass} p-1.5 border-r border-slate-200`}
                          style={{ left: `${stickyStartDateLeftPx}px`, width: `${stickyDateColumnWidthPx}px`, minWidth: `${stickyDateColumnWidthPx}px`, maxWidth: `${stickyDateColumnWidthPx}px` }}
                        >
                          <input
                            type="date"
                            value={getDeliverableStartDate(deliverable.id)}
                            min={todayStr}
                            onChange={(e) => handleDeliverableStartDateChange(deliverable.id, e.target.value)}
                            disabled={isRowLocked}
                            className={`w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-[10px] font-semibold text-slate-700 focus:outline-none ${isRowLocked ? 'opacity-70 cursor-not-allowed' : ''}`}
                          />
                        </td>

                        <td
                          className={`sticky z-20 ${rowBackgroundClass} p-1.5 border-r border-slate-200`}
                          style={{ left: `${stickyTargetDateLeftPx}px`, width: `${stickyDateColumnWidthPx}px`, minWidth: `${stickyDateColumnWidthPx}px`, maxWidth: `${stickyDateColumnWidthPx}px` }}
                        >
                          <input
                            type="date"
                            value={deliverable.targetDate || ''}
                            readOnly
                            className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-[10px] font-semibold text-slate-700 focus:outline-none"
                          />
                        </td>

                        {stepDefinitions.map((_, stepIndex) => {
                          const ownerKey = `${deliverable.id}-${stepIndex}-owner`;
                          const dateKey = `${deliverable.id}-${stepIndex}-date`;

                          return (
                            <React.Fragment key={`${deliverable.id}-${stepIndex}`}>
                              <td className="p-1.5 border-r border-slate-200">
                                <select
                                  value={tableData[ownerKey] || ''}
                                  onChange={(e) => updateCell(ownerKey, e.target.value)}
                                  disabled={isRowLocked}
                                  className={`w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[10px] font-semibold text-slate-700 focus:outline-none ${isRowLocked ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                  <option value="">Select</option>
                                  {responsibleOptions.map((memberOption) => (
                                    <option key={memberOption.value} value={memberOption.value}>
                                      {memberOption.label}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="p-1.5 border-r border-slate-200">
                                <input
                                  type="date"
                                  value={tableData[dateKey] || ''}
                                  min={todayStr}
                                  onChange={(e) => updateCell(dateKey, e.target.value)}
                                  disabled={isRowLocked}
                                  className={`w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[10px] font-semibold text-slate-700 focus:outline-none ${isRowLocked ? 'opacity-70 cursor-not-allowed' : ''}`}
                                />
                              </td>
                            </React.Fragment>
                          );
                        })}

                        <td className={`p-1.5 border-r border-slate-200 ${rowBackgroundClass}`}>
                          <div className="flex items-center justify-center gap-2">
                            {isRowSubmitted ? (
                              <button
                                type="button"
                                onClick={() => toggleSubmittedRowEditMode(deliverable.id)}
                                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all ${isRowEditMode
                                  ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 shadow-sm'
                                  }`}
                              >
                                {isRowEditMode ? 'Cancel Edit' : 'Edit Row'}
                              </button>
                            ) : (
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-[10px] font-black text-amber-600 uppercase tracking-tighter bg-amber-50 px-2 py-0.5 rounded">
                                  Pending Assign
                                </span>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {deliverables.some((d) => !submittedRows[d.id] || editingSubmittedRows[d.id]) && (
                    <tr className="bg-slate-50">
                      <td colSpan={17} className="p-3 border-r border-slate-200"></td>
                      <td className="p-3 text-center">
                        <button
                          onClick={handleAssignAllSteps}
                          disabled={isBulkSubmitting || deliverables.length === 0}
                          className={`w-full py-2.5 rounded-full text-xs font-black uppercase tracking-widest shadow-md transition-all transform active:scale-95 ${isBulkSubmitting || deliverables.length === 0
                            ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:-translate-y-0.5 shadow-emerald-100'
                            }`}
                        >
                          {isBulkSubmitting ? 'Submitting...' : 'Submit'}
                        </button>
                      </td>
                    </tr>
                  )}

                  {!loading && deliverables.length === 0 && (
                    <tr>
                      <td
                        colSpan={4 + stepDefinitions.length * 2}
                        className="p-6 text-center text-sm font-semibold text-slate-500"
                      >
                        No deliverables available from approved DDTME.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DDFMS;
