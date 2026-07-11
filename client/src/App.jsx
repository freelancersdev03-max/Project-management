import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';

import HomePage from './pages/Home';
import LoginPage from './pages/LoginPage';
import ContactPage from './pages/ContactPage';
import EmployeeProfile from './pages/profile/EmployeeProfile';
import EmployeeDashboard from './pages/Dashboard/EmployeeDashboard';
import RepeatableTaskPage from "./pages/Dashboard/RepeatableTaskPage";
import SGMProfile from './pages/profile/SGMProfile';
import SeniorProfile from './pages/profile/SeniorProfile';
import ClientManagement from './pages/ClientManagement';
import ClientProjects from './pages/ClientProjects';
import InternalTeamView from './pages/InternalTeamView';
import ProjectDetails from './pages/ProjectDetails';
import AdminProfile from './pages/profile/AdminProfile';
import Createuser from './pages/createuser/Createuser';
import ClientProfile from './pages/profile/ClientProfile';
import KAYAARAProfile from './pages/profile/KAYAARAProfile';
import StaffManagement from './pages/StaffManagement';
import WeeklyScore from './pages/WeeklyScore';
import ExternalManagement from './pages/ExternalManagement';
import MCTC from './pages/MCTC';
import MeetingAgenda from './pages/MeetingAgenda';
import MeetingAgendaList from './pages/MeetingAgendaList';
import MeetingAgendaLogs from './pages/MeetingAgendaLogs';
import MeetingAgendaLogDetail from './pages/MeetingAgendaLogDetail';
import DDTMEBasePage from './pages/DDTME/DDTMEBasePage';
import DDTMETable from './pages/DDTME/DDTMETable';
import DDTMERYG from './pages/DDTME/DDTMERYG';
import DDFMSBasePage from './pages/DDTME/DDFMSBasePage';
import DDFMS from './pages/DDTME/DDFMS';
import Achievement from './pages/Achievement/Achievement';
import CompanyLevelDashboard from './pages/Dashboard/CompanyLevelDashboard';
import RC7 from './pages/RC7';
import RC7Preview from './pages/RC7Preview';
import AuditLog from './pages/AuditLog';
import { SidebarProvider } from './context/SidebarContext';

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
  return (
    <SidebarProvider>
      <Router>
        <PageTransition>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/contact" element={<ContactPage />} />

          <Route path='/admin' element={<AdminProfile />} />
          <Route path='/admin/audit-log' element={<AuditLog />} />
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
        </PageTransition>
      </Router>
    </SidebarProvider>
  );
};

export default App;
