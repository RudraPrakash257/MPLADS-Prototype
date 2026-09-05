import React from 'react';
export default function KPICard({ label, value, subtitle, icon: Icon, accent, valueColor }) {
  return (
    <div className="kpi-card" style={{ '--card-accent': accent || '#3b82f6' }}>
      <div className="kpi-header">
        <span className="kpi-label">{label}</span>
        {Icon && (
          <div className="kpi-icon">
            <Icon size={16} />
          </div>
        )}
      </div>
      <div className="kpi-value" style={valueColor ? { color: valueColor } : {}}>
        {value}
      </div>
      {subtitle && <div className="kpi-subtitle">{subtitle}</div>}
    </div>
  );
}
