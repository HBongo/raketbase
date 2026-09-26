import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
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
import TopUsers from './pages/TopUsers';
import MyProposals from './pages/MyProposals';
import Layout from './components/Layout';
import Toaster from './components/Toaster';

function App() {
  return (
    <>
      <Toaster />
      <Routes>
      <Route
        path="/"
        element={
          localStorage.getItem('token') ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
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
          <Route path="/contracts/:id/dispute" element={<DisputeTicket />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/messages/:id" element={<Messages />} />
          <Route path="/top-users" element={<TopUsers />} />
          <Route path="/my-proposals" element={<MyProposals />} />
          <Route path="/profile/:id" element={<Profile />} />
          {/* If they just hit /profile, redirect to dashboard or read user from localstorage */}
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Route>

      {/* Admin-only routes */}
      <Route element={<AdminRoute />}>
        <Route path="/admin" element={<AdminDashboard />} />
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