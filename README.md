# KAYAARA Innovations Pvt Ltd — Project Management System

## 1. Project Overview
- KAYAARA is a web-based project and client management system.
- It centralizes project tracking, task handling, client coordination, reporting, and internal performance monitoring.

## 2. Objective
- To provide a single platform for managing users, clients, projects, tasks, agendas, reports, and operational dashboards.

## 3. Technology Stack
- Frontend: React 19, Vite, React Router, Tailwind CSS, Axios, Framer Motion, Recharts, Lucide React, jsPDF, jspdf-autotable, xlsx, EmailJS.
- Backend: Django 5, Django REST Framework, SimpleJWT, django-cors-headers, WhiteNoise, Gunicorn, python-dotenv.
- Database and storage: PostgreSQL in production, SQLite for local development, Cloudinary for media storage.
- Tools and utilities: ESLint, Pandas, OpenPyXL.

## 4. System Architecture
- The React frontend works as a single-page application and communicates with the Django REST API through HTTP requests.
- Django handles authentication, permissions, validation, and business logic.
- Data is stored in the database, while uploaded media is stored in Cloudinary.
- The backend serves the built frontend and routes non-API requests to the React app.

## 5. Core Features
- JWT-based login and token refresh.
- Role-based access for Admin, KAYAARA, SGM, Employee, Client, and related users.
- Client, project, employee, and task management.
- Action plans, dashboards, and progress tracking.
- DDTME and DDFMS planning modules.
- Meeting agenda management with logs and details.
- PDF export, Excel upload, and report generation.
- Notifications and achievement tracking.

## 6. Modules
- Accounts: authentication, user profile, token refresh, and admin user management.
- Projects: project listing, action tasks, and action plan downloads.
- Clients: client records, external members, client projects, and client-related teams.
- Employees: employee project views and client access.
- Tasks: task operations and dashboard statistics.
- DDTME: big tasks, submissions, additional tasks, man-day entries, monthly objectives, KPIs, and KPI updates.
- DDFMS: plans, deliverables, and steps.
- Meeting Agenda: visit scheduling and log history.
- Achievement: achievement records and token sharing control.
- MCTC, RC7, and Notifications: supporting planning, tracking, and system alerts.

## 7. Functionality
1. The user logs in with credentials.
2. The system issues a JWT token and loads the correct role-based interface.
3. The user opens the required module from the dashboard or sidebar.
4. The user views, creates, updates, or downloads records depending on permission.
5. Managers and admins monitor progress through dashboards and reports.
6. The system stores changes in the backend database and updates related views.

## 8. Exception Handling
- Invalid logins and expired tokens are rejected.
- Unauthorized actions are blocked by permission checks.
- Duplicate users, emails, or members are validated before saving.
- Date and relationship rules are enforced in task and planning modules.
- File uploads are restricted to supported formats such as .xlsx where required.
- Missing records return not found responses instead of failing silently.

## 9. Security
- Uses JWT authentication for protected API access.
- Applies custom role-based permissions for user groups.
- Requires authentication for most backend endpoints by default.
- Uses CORS and CSRF configuration for approved frontend origins.
- Stores secrets in environment variables.
- Uses Cloudinary for managed media storage.

## 10. Conclusion
- KAYAARA improves coordination, reporting, and control across users, clients, and projects.
- It is useful for centralized operational management and structured performance tracking.