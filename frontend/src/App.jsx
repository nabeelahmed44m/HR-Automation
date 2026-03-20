import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { Briefcase, LayoutDashboard, PlusCircle } from 'lucide-react';
import JobsList from './pages/JobsList';
import CreateJob from './pages/CreateJob';
import JobDetail from './pages/JobDetail';
import EditJob from './pages/EditJob';

function App() {
  return (
    <BrowserRouter>
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
        </aside>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<JobsList />} />
            <Route path="/create" element={<CreateJob />} />
            <Route path="/job/:id" element={<JobDetail />} />
            <Route path="/job/:id/edit" element={<EditJob />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
