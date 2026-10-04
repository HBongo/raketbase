import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Explore from './pages/Explore';
import CreateJob from './pages/CreateJob';
import JobDetail from './pages/JobDetail';
import Profile from './pages/Profile';
import ClientJobView from './pages/ClientJobView';
import DisputeTicket from './pages/DisputeTicket';
import ProtectedRoute from './pages/ProtectedRoute';
import AdminRoute from './pages/AdminRoute';
import AdminDashboard from './pages/AdminDashboard';
import Messages from './pages/Messages';
import BrowseUsers from './pages/BrowseUsers';
import MyProposals from './pages/MyProposals';
import LegalPage from './pages/LegalPage';
import HelpSupport from './pages/HelpSupport';
import LandingPage from './pages/landing/LandingPage';
import Layout from './components/Layout';
import Toaster from './components/Toaster';

import { useState, useEffect } from 'react';

function GlobalLoader() {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleStart = () => setLoading(true);
    const handleEnd = () => setLoading(false);
    
    window.addEventListener('global_load_start', handleStart);
    window.addEventListener('global_load_end', handleEnd);
    
    return () => {
      window.removeEventListener('global_load_start', handleStart);
      window.removeEventListener('global_load_end', handleEnd);
    };
  }, []);

  if (!loading) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(255, 255, 255, 0.6)',
      backdropFilter: 'blur(2px)',
      zIndex: 99999,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      cursor: 'wait'
    }}>
      <div className="spinner-border" style={{ width: '3rem', height: '3rem', color: '#FF5A1E', borderWidth: '4px' }} role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
    </div>
  );
}

function App() {
  return (
    <>
      <Toaster />
      <GlobalLoader />
      <Routes>
      <Route
        path="/"
        element={
          localStorage.getItem('token') ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <LandingPage />
          )
        }
      />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/terms" element={<LegalPage defaultDoc="terms" />} />
      <Route path="/privacy" element={<LegalPage defaultDoc="privacy" />} />
      <Route path="/terms-of-service" element={<Navigate to="/terms" replace />} />
      <Route path="/privacy-policy" element={<Navigate to="/privacy" replace />} />
      <Route path="/jobs" element={<Navigate to="/explore" replace />} />
      
      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/jobs/create" element={<CreateJob />} />
          <Route path="/jobs/:id" element={<JobDetail />} />
          <Route path="/my-jobs" element={<ClientJobView />} />
          <Route path="/my-jobs/:id" element={<ClientJobView />} />
          <Route path="/my-jobs/:id/edit" element={<CreateJob />} />
          <Route path="/contracts/:id/dispute" element={<DisputeTicket />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/messages/:id" element={<Messages />} />
          <Route path="/browse" element={<BrowseUsers />} />
          {/* Top Users now lives inside Browse Users as its "Top users" view */}
          <Route path="/top-users" element={<Navigate to="/browse?view=top" replace />} />
          <Route path="/my-proposals" element={<MyProposals />} /
          >
          <Route path="/profile/:id" element={<Profile />} />
          {/* If they just hit /profile, redirect to dashboard or read user from localstorage */}
          <Route path="/profile" element={<Profile />} />
          <Route path="/contact" element={<HelpSupport />} />

          {/* Admin-only routes */}
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>
        </Route>
      </Route>

      <Route
        path="*"
        element={
          localStorage.getItem('token') ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
    </>
  );
}

export default App;
