import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  AlertTriangle,
  LayoutDashboard,
  FileText,
  BarChart3,
  Building2,
  Zap,
} from 'lucide-react';

export default function Header() {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Overview', icon: LayoutDashboard },
    { path: '/works', label: 'Works', icon: FileText },
    { path: '/analytics', label: 'Risk Analytics', icon: BarChart3 },
    { path: '/agencies', label: 'Agencies', icon: Building2 },
    { path: '/priority', label: 'Priority Queue', icon: Zap },
  ];

  return (
    <header className="app-header">
      <div className="header-top">
        <div className="header-title-section">
          <div className="emblem-icon">MP</div>
          <div>
            <h1 className="app-title">MPLADS Fund Utilization & Delay Risk Prototype</h1>
            <div className="district-badge">
              <span>District:</span>
              <span className="district-pill">Pune (Maharashtra)</span>
            </div>
          </div>
        </div>
        <div className="demo-watermark">
          <AlertTriangle size={14} />
          <span>SYNTHETIC DATA — FOR DEMONSTRATION</span>
        </div>
      </div>

      <nav className="nav-bar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path ||
            (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
