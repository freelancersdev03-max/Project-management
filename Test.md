# ATS & Task Validation Rules

## 1. EmployeeDashboard

### Conditions:
- If completion_date <= target_date → Status = "On Time"
- If completion_date > target_date → Status = "Delayed"
- If completion_date is NULL → Status = "Pending"
- Calculate the ATS score for each task and for overdue task the ATS will be 0 for inprogress task the ATS will be NULL and for ontime task the ATS will be 100% and for delayed task we apply the formula (target_date - completion_date) / (target_date - start_date) * 100
- if the startdate and targetdate are same then the formula will be 1 /(( completion_date - start_date) + 1) * 100
- The dropdown in the task creating should have the name and not the email

---

## 2. Weekly Score Calculation

### Formula:
weekly_score = (completed_tasks / total_tasks) * 100

### Conditions:
- Only tasks with status "On Time" or "Delayed" are considered completed
- "Pending" tasks are excluded from completed_tasks

---

## 3. ATS Score Calculation

### Formula:
ATS_score = (on_time_tasks / total_tasks) * 100

### Conditions:
- Only "On Time" tasks count in numerator
- Total tasks include all tasks except NULL

---

## 4. Visit Agenda → Visit Log Flow

### Rules:
- When "Download Visit Agenda" is clicked:
  - Store the record in VisitLog
  - Include:
    - Company Name
    - Date
    - Month
    - Agenda Data

---

## 5. Visit Log Structure

Each VisitLog entry must contain:
- company_name
- visit_date
- month
- agenda_pdf
- actions_given
- actions_received

---

## 6. Action Plan Mapping

### Rules:
- Each VisitLog must be linked to ActionPlan
- Actions:
  - Given → Assigned to team
  - Received → Assigned to company

---

## 7. Data Integrity Checks

- No duplicate VisitLog for same company + date
- Task must always have:
  - assigned_to
  - project
  - client
- Status must be one of:
  - On Time
  - Delayed
  - Pending

---

## 8. Edge Cases

- If total_tasks = 0 → score = 0
- If actual_date is missing → do not calculate delay
- If deadline_date is missing → mark as "Pending"

---

## 9. Expected Outputs

| Scenario | Expected Result |
|--------|----------------|
| actual_date < deadline | On Time |
| actual_date > deadline | Delayed |
| no actual_date | Pending |
| 5/10 tasks on time | ATS = 50% |

---

## 10. Agent Instructions

- Validate all conditions before saving data
- Recalculate scores on:
  - Task update
  - Task creation
  - Task deletion
- Ensure consistency across:
  - Task
  - VisitLog
  - ActionPlan