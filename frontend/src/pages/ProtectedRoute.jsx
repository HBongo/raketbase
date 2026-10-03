import { Navigate, Outlet } from 'react-router-dom';

function isTokenExpired(token) {
  if (!token) return true;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return true;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.exp ? Date.now() / 1000 > payload.exp : false;
  } catch {
    return true;
  }
}

export default function ProtectedRoute() {
  const token = localStorage.getItem('token');
  const refreshToken = localStorage.getItem('refreshToken');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // If token is expired and there is no refresh token to refresh it
  if (isTokenExpired(token) && !refreshToken) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return <Navigate to="/login?expired=1" replace />;
  }

  return <Outlet />;
}