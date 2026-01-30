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
import AdminDashboard from './pages/Dashboard/AdminDashboard';
import ClientProfile from './pages/profile/ClientProfile';
import HQEPLProfile from './pages/profile/HQEPLProfile';
import StaffManagement from './pages/StaffManagement';
import TaskManagement from './pages/TaskManagement';
import ActionPlanDashboard from './pages/ActionPlanDashboard';

const App = () => {
  return (
    <Router>
      <Routes>

        <Route path = "/" element={<HomePage />} />
        <Route path = "/login" element={<LoginPage />} />
        
        <Route path = '/admin' element={<AdminProfile />} /> 
        <Route path = '/admin/dashboard' element={<AdminDashboard />} /> 
        <Route path = '/admin/createuser' element={<Createuser />} /> 
        <Route path = '/staff' element={<StaffManagement />} />

        <Route path = '/employee' element={<EmployeeProfile />} />
        <Route path = '/employee-dashboard' element={<EmployeeDashboard />} />

        <Route path = '/sgm' element={<SGMProfile />} />
        <Route path = "/clients" element={<ClientManagement />} />
        <Route path = "/clients/:clientId/" element={<ClientProjects />} />
        <Route path = "/clients/:clientId/:projectName" element={<ProjectDetails />} />

        <Route path = "/client" element={<ClientProfile />} />

        <Route path = "/hqepl" element = {<HQEPLProfile />} />


        <Route path='/tasks' element={<TaskManagement />} />

        <Route path='/action-plans' element={<ActionPlanDashboard />} />
        

        

      </Routes>
    </Router>
  );
};

export default App;
