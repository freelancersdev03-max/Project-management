import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import HomePage from './pages/Home';
import LoginPage from './pages/LoginPage';
import EmployeeProfile from './pages/profile/EmployeeProfile';
import EmployeeDashboard from './pages/Dashboard/EmployeeDashboard';
import SGMProfile from './pages/profile/SGMProfile';
import ClientManagement from './pages/ClientManagement';
import ClientProjects from './pages/ClientProjects';
import ProjectDetails from './pages/ProjectDetails';
import AdminProfile from './pages/profile/AdminProfile';
import Createuser from './pages/createuser/Createuser';
import ClientProfile from './pages/profile/ClientProfile';
import HQEPLProfile from './pages/profile/HQEPLProfile';
import StaffManagement from './pages/StaffManagement';
import ActionPlanDashboard from './pages/ActionPlanDashboard';
import WeeklyScore from './pages/WeeklyScore';
import ExternalManagement from './pages/ExternalManagement';
import MCTC from './pages/MCTC';
import VisitAgenda from './pages/VisitAgenda';
import DDTMEBasePage from './pages/DDTME/DDTMEBasePage';
import DDTMETable from './pages/DDTME/DDTMETable';
import DDTMERYG from './pages/DDTME/DDTMERYG';
const App = () => {
  return (
    <Router>
      <Routes>

        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />

        <Route path='/admin' element={<AdminProfile />} />
        <Route path='/admin/createuser' element={<Createuser />} />
        <Route path='/staff' element={<StaffManagement />} />

        <Route path='/employee' element={<EmployeeProfile />} />
        <Route path='/employeedashboard' element={<EmployeeDashboard />} />

        <Route path='/sgm' element={<SGMProfile />} />
        <Route path="/clients" element={<ClientManagement />} />
        <Route path="/clients/:clientId/" element={<ClientProjects />} />
        <Route path="/clients/:clientId/external-management" element={<ExternalManagement />} />
        <Route path="/projects/:projectId" element={<ProjectDetails />} />

        <Route path="/client" element={<ClientProfile />} />
        <Route path="/hqepl" element={<HQEPLProfile />} />
        <Route path="/ddtme" element={<DDTMEBasePage />} />
        <Route path="/ddtme/client/:clientId" element={<DDTMETable />} />
        <Route path="/ddtme/client/:clientId/ryg" element={<DDTMERYG />} />
    


        <Route path='/action-plans' element={<ActionPlanDashboard />} />
        <Route path='/weeklyscore' element={<WeeklyScore />} />
        <Route path = '/mctc' element = {<MCTC />} />
        <Route path = '/visitagenda' element = {<VisitAgenda />} />

      </Routes>
    </Router>
  );
};

export default App;
