# Employee Dashboard — Context & Calculation Reference

> **File:** `client/src/pages/Dashboard/EmployeeDashboard.jsx`  
> **Backend:** `server/tasks/views.py` → `TaskViewSet.dashboard_stats`  
> **Model:** `server/tasks/models.py` → `Task`

---

## Table of Contents

1. [Overview](#overview)
2. [Task Statuses](#task-statuses)
3. [Effective Task Status (Frontend)](#effective-task-status-frontend)
4. [ATS (Average Time Score) — When `null`, When `0`](#ats-average-time-score)
5. [OTC (On-Time Completion)](#otc-on-time-completion)
6. [Dashboard Stats Calculation (Frontend — `filteredDashboardStats`)](#dashboard-stats-calculation-frontend)
7. [Dashboard Stats Calculation (Backend — `dashboard_stats` endpoint)](#dashboard-stats-calculation-backend)
8. [Member View Stats (Viewing Another Employee)](#member-view-stats)
9. [Task Splitting — `splitTasksForUser`](#task-splitting)
10. [Date Handling & Parsing](#date-handling--parsing)
11. [Filtering Pipeline](#filtering-pipeline)
12. [Data Flow on Mount](#data-flow-on-mount)
13. [Null vs 0 — Complete Reference Table](#null-vs-0--complete-reference-table)
14. [Task Lifecycle & Status Transitions](#task-lifecycle--status-transitions)
15. [Action Plan Tasks](#action-plan-tasks)

---

## Overview

The Employee Dashboard is the main task management view for individual employees. It displays:

- **My Tasks** — Active tasks assigned TO the logged-in user (no `completion_date`)
- **Upcoming 7 Days Tasks** — Subset of active tasks with `target_date` within the next 7 days
- **Completed Tasks** — Tasks assigned TO the user that HAVE a `completion_date`
- **Delegated Tasks** — Tasks assigned BY the user to OTHER people (excluding ACTION_PLAN source tasks)

It also shows KPI cards: **Total Tasks**, **On Time**, **Delayed**, **Overdue**, **In Progress**, **OTC Score**, and **ATS Score**, plus a pie chart.

---

## Task Statuses

The backend `Task` model defines these status choices:

| Status        | Meaning                                               |
|---------------|-------------------------------------------------------|
| `In Progress` | Task is active, no completion date, not overdue yet   |
| `On Time`     | Completed on or before target date                    |
| `Delayed`     | Completed AFTER target date                           |
| `Overdue`     | Past target date and NOT completed                    |
| `Completed`   | Generic completed (treated same as On Time)           |

### Backend Auto-Derivation (in `Task.save()`)

```python
if self.completion_date:
    if self.completion_date > self.target_date:
        self.status = 'Delayed'
    else:
        self.status = 'On Time'
elif self.status not in ['Completed', 'On Time'] and date.today() > self.target_date:
    self.status = 'Overdue'
```

**Key rule:** Status is DERIVED from dates on save, not manually set. The backend overrides any frontend status value.

---

## Effective Task Status (Frontend)

The frontend uses `getEffectiveTaskStatus(task)` to compute a normalized status from raw task data for display and filtering purposes. This is independent of the backend `status` field.

```
function getEffectiveTaskStatus(task):
  1. If completion_date EXISTS:
     - If target_date exists AND completion > target → "delay_completion"
     - Else → "on_time"
  2. If NO completion_date:
     - If status contains "overdue" or status == "over_due" → "over_due"
     - If target_date < today → "over_due"
     - If status contains "delay" or "late" → "delay_completion"
     - If status contains "on time" or "completed" → "on_time"
     - Else → "in_progress"
```

### Mapping: Effective Status → Display Label

| Effective Status     | Display Label | Color    |
|----------------------|---------------|----------|
| `on_time`            | On Time       | `#22c55e` (green) |
| `in_progress`        | In Progress   | `#3b82f6` (blue)  |
| `delay_completion`   | Delayed       | `#facc15` (yellow) |
| `over_due`           | Overdue       | `#ef4444` (red)    |

---

## ATS (Average Time Score)

ATS measures how efficiently a task was completed relative to its planned timeline. It answers: *"What percentage of the planned timeline was the actual completion time?"*

### When ATS is `null`

| Scenario | ATS Value | Reason |
|----------|-----------|--------|
| Task is **In Progress** | `null` | Task hasn't been completed — no score can be calculated. It is **excluded** from ATS averages. |
| Any unknown/unrecognized status | `null` | Fallback safety. |

### When ATS is `0`

| Scenario | ATS Value | Reason |
|----------|-----------|--------|
| Task is **Overdue** | `0` (or `0.0`) | The task has failed its deadline entirely with no completion. It contributes ZERO to averages. |

### When ATS is `100`

| Scenario | ATS Value |
|----------|-----------|
| Completed on or before target date (`completion_date <= target_date`) | `100` |
| All three dates are the same (`start == target == completion`) | `100` |
| Denominator is zero (edge case: `actual_days == 0`) | `100` |

### ATS Formula for Delayed Tasks

When `completion_date > target_date` (i.e., the task was completed late):

```
planned_days = target_date - start_date    (in days)
actual_days  = completion_date - start_date (in days)
```

**Case 1: Standard** (`start_date ≠ target_date`)
```
ATS = (planned_days / actual_days) × 100
```

**Case 2: Same-day target** (`start_date == target_date`)
```
ATS = (1 / (actual_days + 1)) × 100
```

### ATS Calculation — Frontend (`calculateTaskATS`)

```javascript
function calculateTaskATS(task):
  status = getEffectiveTaskStatus(task)

  if status == "in_progress":  return null      // ← EXCLUDED
  if status == "over_due":     return 0          // ← ZERO CONTRIBUTION

  // Need all three dates
  if (!start || !target || !completion):
    return status == "on_time" ? 100 : 0         // ← Fallback

  if completion <= target:     return 100         // ← Perfect score
  if actual == 0:              return 100         // ← Same-day edge case
  if start == target:          return (1 / (actual + 1)) × 100
  else:                        return (planned / actual) × 100
```

### ATS Calculation — Backend (`Task.calculate_ats_value()`)

Mirrors the frontend logic precisely. Computed on `Task.save()` and stored in `ats_score` field:

```python
# In Progress → null (None)
# Overdue     → 0.0
# Delayed     → calculate_ats_value()  # Uses the formula above
# On Time / Completed → calculate_ats_value()  # Returns 100 if on-time
```

---

## OTC (On-Time Completion)

OTC measures the percentage of resolved tasks that were completed on time.

### Formula

```
OTC = (on_time_count / (total_tasks - in_progress_count)) × 100
```

- **Numerator:** Number of tasks with effective status `"on_time"`
- **Denominator:** Total tasks MINUS in-progress tasks (only resolved tasks count)
- **If denominator is 0:** OTC = `"0%"`

### Key Distinction from ATS

| Metric | Counts Delayed Tasks As | Counts Overdue Tasks As |
|--------|-------------------------|-------------------------|
| **OTC** | NOT on-time (reduces %) | NOT on-time (reduces %) |
| **ATS** | Partial credit (0-99%) | Zero (0%) |

---

## Dashboard Stats Calculation (Frontend)

The `filteredDashboardStats` memo computes all KPIs based on the currently filtered task lists (after client filter + date filter are applied).

```javascript
const allTasks = [...activeTasks, ...doneTasks];  // my_tasks + completed_tasks (filtered)

// Count by effective status
const onTimeCount     = allTasks.filter(t => effective(t) === "on_time").length;
const delayedCount    = allTasks.filter(t => effective(t) === "delay_completion").length;
const overdueCount    = allTasks.filter(t => effective(t) === "over_due").length;
const inProgressCount = allTasks.filter(t => effective(t) === "in_progress").length;

const totalTasks = allTasks.length;
const atsDenominator = totalTasks - inProgressCount;  // in_progress EXCLUDED

// ATS: Sum individual ATS scores for delayed tasks, on-time = 100 each
const delayedAtsSum = delayedTasks.reduce((sum, t) => sum + (calculateTaskATS(t) ?? 0), 0);
const atsScore = atsDenominator > 0
  ? Math.round(((onTimeCount × 100) + delayedAtsSum) / atsDenominator)
  : "0%";

// OTC: Simple ratio
const otcScore = atsDenominator > 0
  ? ((onTimeCount / atsDenominator) × 100).toFixed(1) + "%"
  : "0%";
```

### Chart Data (Pie Chart)

```javascript
chart_data = [
  { name: "On Time",  value: onTimeCount,  color: "#22c55e" },
  { name: "Delayed",  value: delayedCount,  color: "#facc15" },
  { name: "Overdue",  value: overdueCount,  color: "#ef4444" },
]
```

> **Note:** In-progress tasks are NOT shown in the pie chart — only resolved/overdue tasks.

---

## Dashboard Stats Calculation (Backend)

The `tasks/dashboard_stats/` endpoint is called ONLY for the current user's own dashboard (not in member-view mode).

```python
my_tasks = Task.objects.filter(assigned_to=user)

total = my_tasks.count()
in_progress = my_tasks.filter(status='In Progress').count()
on_time_completed = my_tasks.filter(status__in=['On Time', 'Completed']).count()
delayed_completed = my_tasks.filter(status='Delayed').count()
overdue = my_tasks.filter(status='Overdue').count()

denominator = total - in_progress

# OTC
otc_val = (on_time_completed / denominator) × 100   # truncated to 1 decimal

# ATS  
delayed_ats_sum = SUM(ats_score) for all Delayed tasks   # from DB field
ats_numerator = (on_time_completed × 100) + delayed_ats_sum
ats_val = round(ats_numerator / denominator, 1)
```

### Differences: Backend vs Frontend Stats

| Aspect | Backend (`dashboard_stats`) | Frontend (`filteredDashboardStats`) |
|--------|----------------------------|-------------------------------------|
| **Source** | Database `status` field | Computed `getEffectiveTaskStatus()` |
| **Filters** | No date/client filter | Applies date range + client filter |
| **ATS for delayed** | Uses stored `ats_score` DB field | Recalculates from dates via `calculateTaskATS()` |
| **When used** | Own dashboard (initial load) | Always (overrides backend on filter change) |

---

## Member View Stats

When viewing another employee's dashboard (via `?member=<userId>` URL param), the backend `dashboard_stats` endpoint is NOT called. Instead, stats are computed client-side:

```javascript
const totalTasks = my_active.length + my_completed.length;

const onTimeCount = my_completed.filter(t => {
  if (!t.target_date || !t.completion_date) return false;
  return new Date(t.completion_date) <= new Date(t.target_date);
}).length;

// ATS = % of tasks that are completed (simpler formula for member view)
const atsScore = totalTasks > 0 ? Math.round((my_completed.length / totalTasks) × 100) : 0;

// OTC = % of completed tasks that were on time
const otcScore = my_completed.length > 0 ? Math.round((onTimeCount / my_completed.length) × 100) : 0;
```

> **Important:** The member-view ATS uses a simplified formula (completion ratio), not the per-task time-based ATS formula.

---

## Task Splitting

### `splitTasksForUser(tasks, user)` — For Current User

Splits the full task list into three buckets:

| Bucket | Condition |
|--------|-----------|
| **my_active** | (`assigned_to == user` OR self-assigned) AND `completion_date` is falsy |
| **my_completed** | (`assigned_to == user` OR self-assigned) AND `completion_date` is truthy |
| **delegated** | `assigned_by == user` AND `assigned_to ≠ user` AND `source_module ≠ 'ACTION_PLAN'` |

### Matching Logic

Tasks are matched to a user by **either**:
- **ID match:** `task.assigned_to == user.id` (numeric comparison)
- **Name match:** `task.assigned_to_name` matches `user.username` or `user.full_name` (case-insensitive)

### `splitTasksForMember(tasks, member)` — For Viewing Another User

Simpler version — no delegated bucket:

| Bucket | Condition |
|--------|-----------|
| **my_active** | `assigned_to == member` AND no `completion_date` |
| **my_completed** | `assigned_to == member` AND has `completion_date` |

---

## Date Handling & Parsing

### `parseDateOnly(value)`

Parses a date string to a `Date` object, taking only the first 10 characters (YYYY-MM-DD):

```javascript
parseDateOnly("2025-12-31T15:30:00Z") → Date(2025, 11, 31)  // local midnight
parseDateOnly(null)                    → null
parseDateOnly("invalid")              → null
```

### Key Rules

- All date comparisons use **midnight-normalized** dates (`setHours(0,0,0,0)`)
- `target_date` and `completion_date` are always compared at day level, never with time components
- `today` is always calculated fresh with `new Date()` + midnight normalization

---

## Filtering Pipeline

Tasks go through a multi-stage filtering pipeline before display:

```
Raw Tasks
  → filterTasksByClient()      // Include only tasks for selected clients
  → filterTasksByDateRange()   // Include only tasks within date range
  → filterTasksByStatus()      // Apply status filter (All / In Progress / Overdue / Today's Task)
  → filterTasks()              // Apply search query (text match on title, task_id, project, client, assigned_to)
```

### Client Filter

```javascript
// If "All Tasks" is checked → all tasks pass
// Otherwise → task's client_name must be in selectedClients set
normalizeClientName(task) = task.client_name || task.client_org_name || task.client || "Unknown Client"
```

### Date Range Filter

```javascript
// If no date range set → all tasks pass
// Otherwise → task's relevant date must be within [startDate, endDate]
// Relevant date priority: target_date → completion_date → created_at → updated_at
```

### Status Filter Options

| Option | Logic |
|--------|-------|
| `All` | No filter — show everything |
| `In Progress` | `getEffectiveTaskStatus(task) === "in_progress"` |
| `Overdue` | `getEffectiveTaskStatus(task) === "over_due"` |
| `Today's Task` | `task.target_date` is today |

---

## Data Flow on Mount

```
1. Check auth token → redirect to /login if missing

2. Determine view mode:
   - URL has ?member=<id> → Member View (viewing another employee)
   - No member param     → Own Dashboard

3. Fetch user data:
   - Member view: GET admin/users/<id>/
   - Own view:    GET me/

4. Fetch assignable directory:
   - GET assignable-users/?scope=internal
   - GET assignable-users/?scope=external_client

5. Fetch projects:
   - GET projects/

6. Fetch tasks:
   - Member view: GET tasks/?assigned_to=<memberId>
   - Own view:    GET tasks/

7. Build clientProjectMap (Client → [Projects])

8. Split tasks into: my_active, my_completed, delegated

9. Fetch/compute dashboard stats:
   - Member view: Compute client-side from split tasks
   - Own view:    GET tasks/dashboard_stats/
```

---

## Null vs 0 — Complete Reference Table

| Field / Metric | When `null` / empty | When `0` | When has a value |
|---|---|---|---|
| **`ats_score` (DB field)** | Task is `In Progress` or unrecognized status | Task is `Overdue` (failed deadline) | Calculated score (0.01 – 100.0) for On Time or Delayed tasks |
| **`calculateTaskATS()` (frontend)** | Effective status is `in_progress` — task is **excluded** from ATS denominator | Effective status is `over_due` — task **contributes 0** to ATS numerator | Effective status is `on_time` → 100; `delay_completion` → formula result |
| **`completion_date`** | Task is NOT completed (still active or overdue) | N/A (date field, never 0) | Task has been completed |
| **`target_date`** | Should never be null in normal flow (required field) | N/A (date field) | The deadline for the task |
| **`start_date`** | Defaults to `date.today()` on creation — effectively never null | N/A (date field) | Date the task was created/started |
| **`project`** | Internal task (no client/project association) | N/A (FK field) | Task is associated with a specific project |
| **`client_org`** | Internal task | N/A (FK field) | Task is associated with a client organization |
| **`atsScore` (KPI card)** | N/A (always a string like "0%") | `"0%"` when no resolved tasks exist | Calculated ATS across all resolved tasks |
| **`otcScore` (KPI card)** | N/A (always a string) | `"0%"` when no resolved tasks exist or none are on-time | Percentage of on-time completions |
| **`total_tasks`** | N/A | `0` when no tasks exist at all | Count of all tasks (active + completed) |
| **`on_time_count`** | N/A | `0` when no tasks completed on time | Count of on-time completed tasks |
| **`overdue_count`** | N/A | `0` when nothing is overdue | Count of overdue tasks |
| **`delayed_count`** | N/A | `0` when nothing is delayed | Count of delayed completions |
| **`in_progress_count`** | N/A | `0` when all tasks are resolved | Count of in-progress tasks |

### Critical `null` vs `0` Decision Points in ATS

```
┌─────────────────────────────────────────────────────┐
│              Task ATS Score Decision Tree            │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Is the task In Progress?                           │
│    YES → ats_score = null                           │
│           (EXCLUDED from all ATS calculations)      │
│                                                     │
│  Is the task Overdue (past due, not completed)?     │
│    YES → ats_score = 0                              │
│           (INCLUDED in ATS, contributes ZERO)       │
│                                                     │
│  Is the task Completed on time?                     │
│    YES → ats_score = 100                            │
│           (INCLUDED in ATS, full credit)            │
│                                                     │
│  Is the task Delayed (completed late)?              │
│    YES → ats_score = formula(start, target, comp)   │
│           (INCLUDED in ATS, partial credit 0-99)    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Why `null` Instead of `0` for In-Progress?

Using `null` for in-progress tasks is **intentional and critical**:

- `null` means "not applicable" — the task hasn't reached a state where scoring is meaningful
- `0` means "failed" — the task was scored and received the worst possible score
- If in-progress tasks used `0` instead of `null`, the ATS average would be artificially lowered by unfinished work
- The ATS denominator (`total - in_progress`) **excludes** tasks with `null` scores, ensuring only resolved tasks affect the metric

---

## Task Lifecycle & Status Transitions

```
                    ┌──────────────┐
                    │  Created     │
                    │ (In Progress)│
                    │ ATS = null   │
                    └──────┬───────┘
                           │
            ┌──────────────┼──────────────┐
            │              │              │
     Target date      Completed      Completed
      passes        before/on        after
     (no completion)  target date    target date
            │              │              │
            ▼              ▼              ▼
    ┌──────────────┐ ┌──────────┐ ┌──────────────┐
    │   Overdue    │ │ On Time  │ │   Delayed    │
    │  ATS = 0     │ │ ATS = 100│ │ ATS = formula│
    └──────────────┘ └──────────┘ └──────────────┘
```

### Status Auto-Updates

The backend `Task.save()` method auto-updates status based on dates:

1. **If `completion_date` is set:**
   - `completion_date > target_date` → Status = `Delayed`
   - `completion_date <= target_date` → Status = `On Time`

2. **If `completion_date` is NOT set AND today > target_date:**
   - Status = `Overdue`

3. **ATS score is recalculated on every save** based on the new status.

---

## Action Plan Tasks

Tasks with `source_module === 'ACTION_PLAN'` are special:

- They originate from the Action Plan module (not directly created on the dashboard)
- They are **NOT deletable** from the dashboard
- They are **NOT shown** in the Delegated Tasks table
- Their completion uses a separate API endpoint: `PATCH action-tasks/<id>/`
- They appear with a purple background (`bg-[#f6eefc]`) in the task tables
- Task IDs are prefixed with `AP-` (e.g., `AP-42`)

### Completion Status for Action Plan Tasks

```javascript
function getActionPlanCompletionStatus(targetDate):
  if (!targetDate) return 'on_time'              // No target = assume on time
  if (completionDate > targetDate) return 'delay_completion'
  return 'on_time'
```

---

## Summary of KPI Card Values

| Card | Source | Formula |
|------|--------|---------|
| **Total Task** | `filteredDashboardStats.total_tasks` | `activeTasks.length + doneTasks.length` |
| **On Time Completion** | `filteredDashboardStats.on_time_count` | Count where effective status = `on_time` |
| **Overdue** | `filteredDashboardStats.overdue_count` | Count where effective status = `over_due` |
| **In Progress** | `filteredDashboardStats.in_progress_count` | Count where effective status = `in_progress` |
| **Delayed** | `filteredDashboardStats.delayed_count` | Count where effective status = `delay_completion` |
| **ATS SCORE** | `filteredDashboardStats.ats_score` | `round(((onTime × 100) + delayedAtsSum) / (total - inProgress))%` |
| **OTC (Pie Center)** | `filteredDashboardStats.otc_score` | `(onTime / (total - inProgress) × 100).toFixed(1)%` |
