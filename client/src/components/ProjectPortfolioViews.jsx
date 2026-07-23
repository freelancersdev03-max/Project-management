import React, { useMemo, useState } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Flag,
  GanttChart,
  LayoutGrid,
  List,
  Milestone,
  Play,
  Users,
} from 'lucide-react';
import { PriorityBadge, getPriorityDetails } from '../utils/priorityUtils.jsx';

const PROJECT_VIEW_OPTIONS = [
  { id: 'list', label: 'List', icon: <List size={14} /> },
  { id: 'calendar', label: 'Calendar', icon: <CalendarDays size={14} /> },
  { id: 'gantt', label: 'Gantt', icon: <GanttChart size={14} /> },
  { id: 'workload', label: 'Workload', icon: <Users size={14} /> },
  { id: 'grid', label: 'Grid', icon: <LayoutGrid size={14} /> },
];

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_FORMAT = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' });
const SHORT_DATE_FORMAT = new Intl.DateTimeFormat('en', { day: '2-digit', month: 'short', year: 'numeric' });

const parseDate = (value) => {
  if (!value) return null;
  const [year, month, day] = String(value).slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toDateKey = (date) => {
  if (!date) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const addDays = (date, amount) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
const daysBetween = (start, end) => Math.round((end.getTime() - start.getTime()) / DAY_MS);
const formatDate = (value) => {
  const date = value instanceof Date ? value : parseDate(value);
  return date ? SHORT_DATE_FORMAT.format(date) : '-';
};

const formatStatus = (status) => String(status || 'ACTIVE').replaceAll('_', ' ');

const statusStyle = (status) => {
  const value = String(status || '').toUpperCase();
  if (value === 'COMPLETED') return { background: '#ecfdf5', color: '#047857' };
  if (value === 'HOLD') return { background: '#fff7ed', color: '#c2410c' };
  if (value === 'PLANNING') return { background: 'var(--k-band-grey)', color: 'var(--k-grey-700)' };
  return { background: 'var(--k-blue-tint)', color: 'var(--k-blue)' };
};

const ProjectStatus = ({ status }) => (
  <span
    className="inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase"
    style={statusStyle(status)}
  >
    {formatStatus(status)}
  </span>
);

export const ProjectViewTabs = ({ value, onChange }) => (
  <div
    className="inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-lg p-1 k-scroll"
    style={{ background: 'var(--k-white)', border: '1px solid var(--k-grey-200)' }}
    role="tablist"
    aria-label="Project views"
  >
    {PROJECT_VIEW_OPTIONS.map(({ id, label, icon }) => {
      const selected = value === id;
      return (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={selected}
          onClick={() => onChange(id)}
          className="flex min-h-9 shrink-0 items-center gap-2 rounded-md px-3 text-xs font-semibold transition-colors"
          style={{
            background: selected ? 'var(--k-blue)' : 'transparent',
            color: selected ? 'var(--k-white)' : 'var(--k-grey-700)',
          }}
        >
          {icon}
          {label}
        </button>
      );
    })}
  </div>
);

const ProjectList = ({ projects, onOpenProject, getProjectLeadName }) => (
  <div className="overflow-hidden rounded-lg border bg-white" style={{ borderColor: 'var(--k-grey-200)' }}>
    <div className="overflow-x-auto">
      <table className="w-full k-table">
        <thead>
          <tr style={{ background: 'var(--k-band-grey)' }}>
            <th>Project</th>
            <th>Status</th>
            <th>Priority</th>
            <th>Lead</th>
            <th>Start date</th>
            <th>Completion date</th>
            <th>Progress</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => {
            const pStyle = getPriorityDetails(project.priority);
            return (
              <tr
                key={project.id}
                className="cursor-pointer transition-colors hover:bg-[var(--k-blue-tint)]"
                style={{ borderLeft: `4px solid ${pStyle.borderColor}` }}
                onClick={() => onOpenProject(project.id)}
              >
                <td>
                  <p className="text-sm font-bold" style={{ color: 'var(--k-ink)' }}>{project.name}</p>
                  <p className="mt-0.5 max-w-[320px] truncate text-[11px]" style={{ color: 'var(--k-grey-500)' }}>
                    {project.description || 'No description'}
                  </p>
                </td>
                <td><ProjectStatus status={project.status} /></td>
                <td className="text-xs font-semibold">
                  <PriorityBadge priority={project.priority} size="sm" />
                </td>
                <td className="text-xs">{getProjectLeadName(project)}</td>
                <td className="whitespace-nowrap text-xs tabular-nums">{formatDate(project.start_date)}</td>
                <td className="whitespace-nowrap text-xs tabular-nums">{formatDate(project.end_date)}</td>
                <td className="min-w-[130px]">
                  <div className="flex items-center gap-2">
                    <div className="h-2 min-w-20 flex-1 overflow-hidden rounded-full" style={{ background: 'var(--k-grey-100)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.min(100, Math.max(0, Number(project.overall_progress) || 0))}%`, background: 'var(--k-blue)' }}
                      />
                    </div>
                    <span className="text-[11px] font-bold tabular-nums" style={{ color: 'var(--k-blue)' }}>
                      {project.overall_progress || 0}%
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
);

const CalendarEvent = ({ event, onOpenProject }) => {
  const Icon = event.kind === 'start' ? Play : event.kind === 'completion' ? Flag : Milestone;
  const colors = event.kind === 'start'
    ? { background: 'var(--k-blue-tint)', color: 'var(--k-blue)' }
    : event.kind === 'completion'
      ? { background: '#ecfdf5', color: '#047857' }
      : { background: '#fff7ed', color: '#c2410c' };

  return (
    <button
      type="button"
      onClick={() => onOpenProject(event.projectId)}
      className="flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-left text-[10px] font-semibold transition-opacity hover:opacity-75"
      style={colors}
      title={`${event.projectName}: ${event.label}`}
    >
      <Icon size={10} className="shrink-0" />
      <span className="truncate">{event.projectName}</span>
      <span className="ml-auto shrink-0 opacity-70">{event.label}</span>
    </button>
  );
};

const ProjectCalendar = ({ projects, onOpenProject }) => {
  const today = useMemo(() => new Date(), []);
  const [viewDate, setViewDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), today.getDate()));
  const [mode, setMode] = useState('month');

  const eventsByDate = useMemo(() => {
    const map = new Map();
    const addEvent = (dateValue, event) => {
      const date = parseDate(dateValue);
      if (!date) return;
      const key = toDateKey(date);
      map.set(key, [...(map.get(key) || []), event]);
    };

    projects.forEach((project) => {
      addEvent(project.start_date, {
        projectId: project.id,
        projectName: project.name,
        kind: 'start',
        label: 'Start',
      });
      addEvent(project.end_date, {
        projectId: project.id,
        projectName: project.name,
        kind: 'completion',
        label: 'Complete',
      });
      (project.milestones || []).forEach((milestoneItem) => {
        addEvent(milestoneItem.due_date, {
          projectId: project.id,
          projectName: project.name,
          kind: 'milestone',
          label: milestoneItem.name || 'Milestone',
        });
      });
    });
    return map;
  }, [projects]);

  const monthStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const monthGridStart = addDays(monthStart, -monthStart.getDay());
  const weekStart = addDays(viewDate, -viewDate.getDay());
  const visibleDays = mode === 'month'
    ? Array.from({ length: 42 }, (_, index) => addDays(monthGridStart, index))
    : mode === 'week'
      ? Array.from({ length: 7 }, (_, index) => addDays(weekStart, index))
      : [viewDate];

  const movePeriod = (direction) => {
    setViewDate((current) => {
      if (mode === 'month') return new Date(current.getFullYear(), current.getMonth() + direction, 1);
      if (mode === 'week') return addDays(current, direction * 7);
      return addDays(current, direction);
    });
  };

  const periodLabel = mode === 'month'
    ? MONTH_FORMAT.format(viewDate)
    : mode === 'week'
      ? `${formatDate(weekStart)} - ${formatDate(addDays(weekStart, 6))}`
      : formatDate(viewDate);

  return (
    <div className="overflow-hidden rounded-lg border bg-white" style={{ borderColor: 'var(--k-grey-200)' }}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-3" style={{ borderColor: 'var(--k-grey-200)' }}>
        <div className="inline-flex rounded-lg border p-1" style={{ borderColor: 'var(--k-grey-200)' }}>
          {['month', 'week', 'day'].map((calendarMode) => (
            <button
              key={calendarMode}
              type="button"
              onClick={() => setMode(calendarMode)}
              className="rounded-md px-3 py-1.5 text-xs font-semibold capitalize"
              style={{
                background: mode === calendarMode ? 'var(--k-blue)' : 'transparent',
                color: mode === calendarMode ? 'var(--k-white)' : 'var(--k-grey-700)',
              }}
            >
              {calendarMode}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => movePeriod(-1)} className="k-btn-icon" aria-label={`Previous ${mode}`}><ChevronLeft size={16} /></button>
          <span className="min-w-[190px] text-center text-sm font-bold" style={{ color: 'var(--k-ink)' }}>{periodLabel}</span>
          <button type="button" onClick={() => movePeriod(1)} className="k-btn-icon" aria-label={`Next ${mode}`}><ChevronRight size={16} /></button>
          <button type="button" onClick={() => setViewDate(new Date())} className="k-btn-ghost text-xs">Today</button>
        </div>
      </div>

      {mode !== 'day' && (
        <div className="grid grid-cols-7 border-b" style={{ borderColor: 'var(--k-grey-200)', background: 'var(--k-band-grey)' }}>
          {WEEK_DAYS.map((day) => <div key={day} className="px-2 py-2 text-center text-[10px] font-bold uppercase" style={{ color: 'var(--k-grey-500)' }}>{day}</div>)}
        </div>
      )}

      <div className={mode === 'month' ? 'grid grid-cols-7' : mode === 'week' ? 'grid grid-cols-7' : ''}>
        {visibleDays.map((date) => {
          const key = toDateKey(date);
          const events = eventsByDate.get(key) || [];
          const isToday = key === toDateKey(today);
          const outsideMonth = mode === 'month' && date.getMonth() !== viewDate.getMonth();
          return (
            <div
              key={key}
              className={`${mode === 'day' ? 'min-h-[360px]' : mode === 'week' ? 'min-h-[320px]' : 'min-h-[112px]'} min-w-0 border-b border-r p-1.5`}
              style={{
                borderColor: 'var(--k-grey-100)',
                background: outsideMonth ? 'var(--k-band-grey)' : isToday ? 'var(--k-blue-tint)' : 'var(--k-white)',
              }}
            >
              <div className="mb-1 flex items-center justify-between">
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold"
                  style={{ background: isToday ? 'var(--k-blue)' : 'transparent', color: isToday ? 'white' : 'var(--k-grey-700)' }}
                >
                  {date.getDate()}
                </span>
                {mode === 'day' && <span className="text-xs font-semibold" style={{ color: 'var(--k-grey-500)' }}>{WEEK_DAYS[date.getDay()]}</span>}
              </div>
              <div className="space-y-1">
                {events.map((event, index) => <CalendarEvent key={`${key}-${event.projectId}-${event.kind}-${index}`} event={event} onOpenProject={onOpenProject} />)}
                {events.length === 0 && mode === 'day' && (
                  <p className="py-16 text-center text-sm" style={{ color: 'var(--k-grey-500)' }}>No project dates or milestones scheduled.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ProjectGantt = ({ projects, onOpenProject }) => {
  const datedProjects = useMemo(() => projects.map((project) => {
    const start = parseDate(project.start_date);
    const completion = parseDate(project.end_date);
    return { ...project, start, completion };
  }).filter((project) => project.start && project.completion && project.completion >= project.start), [projects]);

  if (!datedProjects.length) {
    return <div className="rounded-lg border bg-white px-5 py-16 text-center text-sm" style={{ borderColor: 'var(--k-grey-200)', color: 'var(--k-grey-500)' }}>Add project start and completion dates to display the Gantt chart.</div>;
  }

  const earliest = new Date(Math.min(...datedProjects.map((project) => project.start.getTime())));
  const latest = new Date(Math.max(...datedProjects.map((project) => project.completion.getTime())));
  const rangeStart = new Date(earliest.getFullYear(), earliest.getMonth(), 1);
  const rangeEnd = new Date(latest.getFullYear(), latest.getMonth() + 1, 0);
  const totalDays = Math.max(1, daysBetween(rangeStart, rangeEnd) + 1);
  const chartWidth = Math.max(760, Math.min(totalDays * 16, 4800));

  const months = [];
  for (let cursor = new Date(rangeStart); cursor <= rangeEnd; cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)) {
    const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const clampedEnd = monthEnd > rangeEnd ? rangeEnd : monthEnd;
    months.push({
      key: `${cursor.getFullYear()}-${cursor.getMonth()}`,
      label: cursor.toLocaleDateString('en', { month: 'short', year: 'numeric' }),
      width: ((daysBetween(cursor, clampedEnd) + 1) / totalDays) * 100,
    });
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-white" style={{ borderColor: 'var(--k-grey-200)' }}>
      <div className="overflow-x-auto k-scroll">
        <div style={{ minWidth: 240 + chartWidth }}>
          <div className="flex border-b" style={{ borderColor: 'var(--k-grey-200)', background: 'var(--k-band-grey)' }}>
            <div className="sticky left-0 z-20 w-60 shrink-0 border-r px-4 py-3 text-[10px] font-bold uppercase" style={{ borderColor: 'var(--k-grey-200)', background: 'var(--k-band-grey)', color: 'var(--k-grey-500)' }}>
              Project dates
            </div>
            <div className="flex" style={{ width: chartWidth }}>
              {months.map((month) => (
                <div key={month.key} className="shrink-0 border-r px-2 py-3 text-center text-[10px] font-bold uppercase" style={{ width: `${month.width}%`, borderColor: 'var(--k-grey-200)', color: 'var(--k-grey-500)' }}>
                  {month.label}
                </div>
              ))}
            </div>
          </div>

          {datedProjects.map((project) => {
            const left = (daysBetween(rangeStart, project.start) / totalDays) * 100;
            const width = Math.max(((daysBetween(project.start, project.completion) + 1) / totalDays) * 100, 0.8);
            return (
              <button key={project.id} type="button" onClick={() => onOpenProject(project.id)} className="flex w-full border-b text-left transition-colors hover:bg-[var(--k-blue-tint)]" style={{ borderColor: 'var(--k-grey-100)' }}>
                <div className="sticky left-0 z-10 w-60 shrink-0 border-r bg-white px-4 py-3" style={{ borderColor: 'var(--k-grey-200)' }}>
                  <p className="truncate text-xs font-bold" style={{ color: 'var(--k-ink)' }}>{project.name}</p>
                  <p className="mt-1 text-[10px] tabular-nums" style={{ color: 'var(--k-grey-500)' }}>{formatDate(project.start)} - {formatDate(project.completion)}</p>
                </div>
                <div className="relative h-16" style={{ width: chartWidth }}>
                  {months.slice(0, -1).map((month, index) => {
                    const boundary = months.slice(0, index + 1).reduce((sum, item) => sum + item.width, 0);
                    return <span key={month.key} className="absolute inset-y-0 border-r" style={{ left: `${boundary}%`, borderColor: 'var(--k-grey-100)' }} />;
                  })}
                  <div
                    className="absolute top-1/2 flex h-7 -translate-y-1/2 items-center overflow-hidden rounded-md px-2 text-[10px] font-bold text-white"
                    style={{ left: `${left}%`, width: `${width}%`, minWidth: 24, background: 'var(--k-blue)' }}
                    title={`${project.name}: ${formatDate(project.start)} to ${formatDate(project.completion)}`}
                  >
                    <span className="truncate">{project.overall_progress || 0}%</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      {datedProjects.length < projects.length && (
        <p className="border-t px-4 py-2 text-[11px]" style={{ borderColor: 'var(--k-grey-200)', color: 'var(--k-grey-500)' }}>
          {projects.length - datedProjects.length} project(s) omitted because start or completion dates are missing or invalid.
        </p>
      )}
    </div>
  );
};

const ProjectWorkload = ({ projects, onOpenProject }) => {
  const members = useMemo(() => {
    const map = new Map();
    const addMember = (person, role, project) => {
      if (!person) return;
      const id = person.id ?? person.email ?? person.username;
      if (!id) return;
      const key = String(id);
      const current = map.get(key) || {
        key,
        name: person.full_name || person.username || person.email || 'Team member',
        roles: [],
        projects: [],
      };
      if (!current.roles.includes(role)) current.roles.push(role);
      if (!current.projects.some((item) => item.id === project.id)) current.projects.push(project);
      map.set(key, current);
    };

    projects.forEach((project) => {
      addMember(project.assigned_sgm_details, 'Project lead', project);
      addMember(project.assigned_kayaara_details, 'KAYAARA', project);
      addMember(project.external_lead ? { id: project.external_lead, username: project.external_lead_name, email: project.external_lead_email } : null, 'External lead', project);
      (project.team_members_details || []).forEach((person) => addMember(person, 'Internal', project));
      (project.external_team_details || []).forEach((person) => addMember(person, 'External', project));
      (project.senior_team_details || []).forEach((person) => addMember(person, 'Senior', project));
    });

    return Array.from(map.values()).sort((a, b) => b.projects.length - a.projects.length || a.name.localeCompare(b.name));
  }, [projects]);

  if (!members.length) {
    return <div className="rounded-lg border bg-white px-5 py-16 text-center text-sm" style={{ borderColor: 'var(--k-grey-200)', color: 'var(--k-grey-500)' }}>No team assignments are available for these projects.</div>;
  }

  const maxAssignments = Math.max(...members.map((member) => member.projects.length), 1);

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {members.map((member) => (
        <div key={member.key} className="rounded-lg border bg-white p-4" style={{ borderColor: 'var(--k-grey-200)' }}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold" style={{ color: 'var(--k-ink)' }}>{member.name}</p>
              <p className="mt-0.5 text-[10px] font-bold uppercase" style={{ color: 'var(--k-grey-500)' }}>{member.roles.join(' / ')}</p>
            </div>
            <span className="shrink-0 text-xs font-bold" style={{ color: 'var(--k-blue)' }}>{member.projects.length} project{member.projects.length === 1 ? '' : 's'}</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full" style={{ background: 'var(--k-grey-100)' }}>
            <div className="h-full rounded-full" style={{ width: `${(member.projects.length / maxAssignments) * 100}%`, background: 'var(--k-blue)' }} />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {member.projects.map((project) => {
              const pStyle = getPriorityDetails(project.priority);
              return (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => onOpenProject(project.id)}
                  className="rounded-md border px-2 py-1 text-[10px] font-semibold hover:bg-[var(--k-blue-tint)] flex items-center gap-1.5 transition-all"
                  style={{
                    borderColor: pStyle.borderColor,
                    borderLeftWidth: '3px',
                    color: 'var(--k-grey-700)',
                    background: 'var(--k-white)',
                  }}
                >
                  <span>{project.name}</span>
                  <PriorityBadge priority={project.priority} size="sm" />
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

const ProjectPortfolioViews = ({ view, projects, onOpenProject, getProjectLeadName }) => {
  if (view === 'list') return <ProjectList projects={projects} onOpenProject={onOpenProject} getProjectLeadName={getProjectLeadName} />;
  if (view === 'calendar') return <ProjectCalendar projects={projects} onOpenProject={onOpenProject} />;
  if (view === 'gantt') return <ProjectGantt projects={projects} onOpenProject={onOpenProject} />;
  if (view === 'workload') return <ProjectWorkload projects={projects} onOpenProject={onOpenProject} />;
  return null;
};

export default ProjectPortfolioViews;
