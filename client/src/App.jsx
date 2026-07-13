import React, { Suspense, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';

import WebsiteAccess from './pages/WebsiteAccess';

// Eager-load the most common entry pages for instant first paint
import HomePage from './pages/Home';
import LoginPage from './pages/LoginPage';

// Lazy-load all other pages — each becomes a separate chunk
const ContactPage = React.lazy(() => import('./pages/ContactPage'));
const EmployeeProfile = React.lazy(() => import('./pages/profile/EmployeeProfile'));
const EmployeeDashboard = React.lazy(() => import('./pages/Dashboard/EmployeeDashboard'));
const RepeatableTaskPage = React.lazy(() => import('./pages/Dashboard/RepeatableTaskPage'));
const SGMProfile = React.lazy(() => import('./pages/profile/SGMProfile'));
const SeniorProfile = React.lazy(() => import('./pages/profile/SeniorProfile'));
const ClientManagement = React.lazy(() => import('./pages/ClientManagement'));
const ClientProjects = React.lazy(() => import('./pages/ClientProjects'));
const InternalTeamView = React.lazy(() => import('./pages/InternalTeamView'));
const ProjectDetails = React.lazy(() => import('./pages/ProjectDetails'));
const AdminProfile = React.lazy(() => import('./pages/profile/AdminProfile'));
const Createuser = React.lazy(() => import('./pages/createuser/Createuser'));
const ClientProfile = React.lazy(() => import('./pages/profile/ClientProfile'));
const KAYAARAProfile = React.lazy(() => import('./pages/profile/KAYAARAProfile'));
const StaffManagement = React.lazy(() => import('./pages/StaffManagement'));
const ActionPlanDashboard = React.lazy(() => import('./pages/ActionPlanDashboard'));
const WeeklyScore = React.lazy(() => import('./pages/WeeklyScore'));
const ExternalManagement = React.lazy(() => import('./pages/ExternalManagement'));
const MCTC = React.lazy(() => import('./pages/MCTC'));
const MeetingAgenda = React.lazy(() => import('./pages/MeetingAgenda'));
const MeetingAgendaList = React.lazy(() => import('./pages/MeetingAgendaList'));
const MeetingAgendaLogs = React.lazy(() => import('./pages/MeetingAgendaLogs'));
const MeetingAgendaLogDetail = React.lazy(() => import('./pages/MeetingAgendaLogDetail'));
const DDTMEBasePage = React.lazy(() => import('./pages/DDTME/DDTMEBasePage'));
const DDTMETable = React.lazy(() => import('./pages/DDTME/DDTMETable'));
const DDTMERYG = React.lazy(() => import('./pages/DDTME/DDTMERYG'));
const DDFMSBasePage = React.lazy(() => import('./pages/DDTME/DDFMSBasePage'));
const DDFMS = React.lazy(() => import('./pages/DDTME/DDFMS'));
const Achievement = React.lazy(() => import('./pages/Achievement/Achievement'));
const CompanyLevelDashboard = React.lazy(() => import('./pages/Dashboard/CompanyLevelDashboard'));
const RC7 = React.lazy(() => import('./pages/RC7'));
const RC7Preview = React.lazy(() => import('./pages/RC7Preview'));

// Minimal loading spinner for Suspense fallback
const RouteLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <div style={{
      width: 36, height: 36, borderRadius: '50%',
      border: '3px solid #e5e7eb', borderTopColor: '#0086ff',
      animation: 'spin 0.7s linear infinite',
    }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

/* Remounts the route tree with a fade-rise entrance on every navigation.
   CSS-only (.k-page in kayaara.css) so it stays light and honors
   prefers-reduced-motion. */
const PageTransition = ({ children }) => {
  const location = useLocation();
  return (
    <div key={location.pathname} className="k-page">
      {children}
    </div>
  );
};

const App = () => {
  const [hasAccess, setHasAccess] = useState(() => {
    return localStorage.getItem('website_access') === 'granted';
  });

  const handleAccessSuccess = () => {
    localStorage.setItem('website_access', 'granted');
    setHasAccess(true);
    if (window.location.pathname !== '/') {
      window.location.href = '/';
    }
  };

  if (!hasAccess) {
    return <WebsiteAccess onSuccess={handleAccessSuccess} />;
  }

  return (
      <Router>
        <PageTransition>
        <Suspense fallback={<RouteLoader />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/contact" element={<ContactPage />} />

          <Route path='/admin' element={<AdminProfile />} />
          <Route path='/admin/createuser' element={<Createuser />} />
          <Route path='/staff' element={<StaffManagement />} />

          <Route path='/employee' element={<EmployeeProfile />} />
          <Route path='/employeedashboard' element={<EmployeeDashboard />} />
          <Route path="/employeedashboard/repeatable-task" element={<RepeatableTaskPage />} />


          <Route path='/sgm' element={<SGMProfile />} />
          <Route path='/senior' element={<SeniorProfile />} />
          <Route path="/clients" element={<ClientManagement />} />
          <Route path="/clients/:clientId/" element={<ClientProjects />} />
          <Route path="/clients/:clientId/internal-team" element={<InternalTeamView />} />
          <Route path="/clients/:clientId/external-management" element={<ExternalManagement />} />
          <Route path="/clients/:clientId/actionplan" element={<ActionPlanDashboard />} />
          <Route path="/projects/:projectId" element={<ProjectDetails />} />

          <Route path="/client" element={<ClientProfile />} />
          <Route path="/kayaara" element={<KAYAARAProfile />} />
          <Route path="/mls" element={<KAYAARAProfile />} />

          <Route path="/company-dashboard" element={<CompanyLevelDashboard />} />
          <Route path="/ddtme" element={<DDTMEBasePage />} />
          <Route path="/ddtme/client/:clientId" element={<DDTMETable />} />
          <Route path="/ddtme/client/:clientId/ryg" element={<DDTMERYG />} />
          <Route path="/ddfms" element={<DDFMSBasePage />} />
          <Route path="/ddfms/client/:clientId" element={<DDFMS />} />

          <Route path='/weekly-score' element={<WeeklyScore />} />
          <Route path='/weeklyscore' element={<WeeklyScore />} />
          <Route path='/mctc' element={<MCTC />} />
          <Route path='/meetingagenda' element={<MeetingAgendaList />} />
          <Route path='/meetingagenda/:clientId' element={<MeetingAgenda />} />
          <Route path='/meetingagenda/:clientId/logs' element={<MeetingAgendaLogs />} />
          <Route path='/meetingagenda/:clientId/logs/:logId' element={<MeetingAgendaLogDetail />} />
          <Route path='/achievement' element={<Achievement />} />
          <Route path='/rc7' element={<RC7 />} />
          <Route path='/rc7/preview' element={<RC7Preview />} />

        </Routes>
        </Suspense>
        </PageTransition>
      </Router>
  );
};

export default App;

