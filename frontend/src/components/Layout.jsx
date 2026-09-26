import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShieldAlert, LayoutDashboard, Search } from 'lucide-react';

const Layout = ({ children }) => {
  const location = useLocation();

  const isActive = (path) => {
    if (path === '/' && location.pathname !== '/') return false;
    return location.pathname.startsWith(path);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header style={{ backgroundColor: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)', padding: '1rem 0' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem' }}>
            <h1 className="brand-font" style={{ fontSize: '1.75rem', margin: 0, color: 'var(--text-primary)' }}>
              MPLAD Sentinel
            </h1>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              AI FLAGS &rarr; HUMAN DECIDES
            </span>
          </div>
          
          <nav style={{ display: 'flex', gap: '2rem' }}>
            <Link to="/" style={{ color: isActive('/') ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: isActive('/') ? 600 : 400, display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
              <LayoutDashboard size={18} /> Dashboard
            </Link>
            <Link to="/works" style={{ color: isActive('/works') ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: isActive('/works') ? 600 : 400, display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
              <Search size={18} /> Explorer
            </Link>
            <Link to="/detectors" style={{ color: isActive('/detectors') ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: isActive('/detectors') ? 600 : 400, display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
              <ShieldAlert size={18} /> Methodology
            </Link>
          </nav>
        </div>
      </header>
      
      <main style={{ flex: 1, padding: '2rem 0', backgroundColor: 'var(--bg-secondary)' }}>
        <div className="container">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
