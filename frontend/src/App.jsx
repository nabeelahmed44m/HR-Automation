import { BrowserRouter, Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import { Briefcase, LayoutDashboard, PlusCircle, LogOut, Settings as SettingsIcon } from 'lucide-react';
import JobsList from './pages/JobsList';
import CreateJob from './pages/CreateJob';
import JobDetail from './pages/JobDetail';
import EditJob from './pages/EditJob';
import Login from './pages/Login';
import Register from './pages/Register';
import Settings from './pages/Settings';
import PublicApply from './pages/PublicApply';
import InterviewPage from './pages/InterviewPage';

function Layout({ children }) {
  const location = useLocation();
  const isPublicPage = ['/login', '/register'].includes(location.pathname) ||
    location.pathname.startsWith('/apply/') ||
    location.pathname.startsWith('/interview/');

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  if (isPublicPage) {
    return <main>{children}</main>;
  }

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="btn-icon" style={{ background: 'var(--accent-gradient)' }}>
            <Briefcase size={28} color="white" />
          </div>
          <h1 className="text-gradient" style={{ fontSize: '1.5rem' }}>Job Manager</h1>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} end>
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/create" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <PlusCircle size={20} />
            <span>Publish Job</span>
          </NavLink>
        </nav>
        <div style={{ marginTop: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <NavLink to="/settings" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <SettingsIcon size={20} />
            <span>Settings</span>
          </NavLink>
          <button onClick={handleLogout} className="sidebar-link" style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/" element={<ProtectedRoute><JobsList /></ProtectedRoute>} />
          <Route path="/create" element={<ProtectedRoute><CreateJob /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/job/:id" element={<ProtectedRoute><JobDetail /></ProtectedRoute>} />
          <Route path="/job/:id/edit" element={<ProtectedRoute><EditJob /></ProtectedRoute>} />
          <Route path="/apply/:id" element={<PublicApply />} />
          <Route path="/interview/:sessionId" element={<InterviewPage />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
