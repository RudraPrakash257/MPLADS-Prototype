import React, { useEffect, useState } from 'react';
import { getDashboardData } from '../api/dashboard';
import { formatCurrency, formatPercent } from '../utils/formatters';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getDashboardData().then(res => {
      setData(res);
      setError(null);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      const msg = err?.code === 'ECONNABORTED'
        ? 'Dashboard request timed out. The API may still be starting — refresh in a moment.'
        : err?.response
          ? `API error ${err.response.status}: ${err.response.data?.detail || 'failed to load dashboard'}`
          : 'Cannot reach API. Start the backend with: python -m uvicorn api.server:app --reload --port 8000';
      setError(msg);
      setLoading(false);
    });
  }, []);

  if (loading) return <div>Loading dashboard...</div>;
  if (!data) return (
    <div className="card" style={{ color: 'var(--text-secondary)' }}>
      <p style={{ color: 'var(--risk-high-bg)', fontWeight: 600, marginBottom: '0.5rem' }}>Error loading dashboard</p>
      <p>{error || 'Unknown error.'}</p>
    </div>
  );

  const {
    total_works,
    flagged,
    flagged_expenditure,
    risk_level_distribution,
    total_estimated_expenditure,
    geographic_distribution
  } = data;

  const flaggedPercentage = total_works > 0 ? (flagged / total_works) : 0;
  
  // For the bar
  const critical = risk_level_distribution?.CRITICAL || 0;
  const high = risk_level_distribution?.HIGH || 0;
  const medium = risk_level_distribution?.MEDIUM || 0;
  const low = risk_level_distribution?.LOW || 0;

  const pCritical = (critical / total_works) * 100;
  const pHigh = (high / total_works) * 100;
  const pMedium = (medium / total_works) * 100;
  const pLow = (low / total_works) * 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div className="card">
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Works in view</p>
          <h2 style={{ fontSize: '2rem', margin: 0, fontWeight: 700 }}>{total_works}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.5rem' }}>
            Across {Object.keys(geographic_distribution || {}).length} state(s)
          </p>
        </div>
        <div className="card">
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Sanctioned value</p>
          <h2 style={{ fontSize: '2rem', margin: 0, fontWeight: 700 }}>{formatCurrency(total_estimated_expenditure)}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.5rem' }}>
            Total across works in view
          </p>
        </div>
        <div className="card">
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>High / Critical flags</p>
          <h2 style={{ fontSize: '2rem', margin: 0, fontWeight: 700 }}>
            {flagged} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 400 }}>/ {formatPercent(flaggedPercentage)}</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.5rem' }}>
            Requires audit attention
          </p>
        </div>
        <div className="card">
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Flagged exposure</p>
          <h2 style={{ fontSize: '2rem', margin: 0, fontWeight: 700 }}>{formatCurrency(flagged_expenditure)}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.5rem' }}>
            Expenditure on High/Critical works
          </p>
        </div>
      </div>

      {/* Risk Distribution Bar */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1rem' }}>Risk band distribution</h3>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{total_works} works in current scope</span>
        </div>
        
        <div style={{ display: 'flex', height: '12px', borderRadius: '6px', overflow: 'hidden', marginBottom: '1rem' }}>
          {pCritical > 0 && <div style={{ width: `${pCritical}%`, background: 'var(--risk-critical-bg)' }}></div>}
          {pHigh > 0 && <div style={{ width: `${pHigh}%`, background: 'var(--risk-high-bg)' }}></div>}
          {pMedium > 0 && <div style={{ width: `${pMedium}%`, background: 'var(--risk-medium-bg)' }}></div>}
          {pLow > 0 && <div style={{ width: `${pLow}%`, background: 'var(--risk-low-bg)' }}></div>}
        </div>

        <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--risk-critical-bg)' }}></span>
            <span style={{ color: 'var(--text-secondary)' }}>Critical ({critical})</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--risk-high-bg)' }}></span>
            <span style={{ color: 'var(--text-secondary)' }}>High ({high})</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--risk-medium-bg)' }}></span>
            <span style={{ color: 'var(--text-secondary)' }}>Medium ({medium})</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--risk-low-bg)' }}></span>
            <span style={{ color: 'var(--text-secondary)' }}>Low ({low})</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
