import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import Register from './Register';
import AdminDashboard from './Admin/AdminDashboard';
import UserManagement from './Admin/UserManagement';
import NoiseReports from './Admin/NoiseReports';
import CustomDrawer from './Admin/CustomDrawer';
import Analytics from './Admin/Analytics';
import Profile from './Admin/Profile';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<UserManagement />} />
          <Route path="/admin/reports" element={<NoiseReports />} />
          <Route path="/admin/drawer" element={<CustomDrawer />} />
          <Route path="/admin/analytics" element={<Analytics />} />
          <Route path="/admin/profile" element={<Profile />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;