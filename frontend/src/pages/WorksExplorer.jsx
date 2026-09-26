import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getWorks } from '../api/works';
import { formatCurrency } from '../utils/formatters';
import { Search, ChevronRight } from 'lucide-react';

const CATEGORIES = ['Normal/Others', 'Repair and Renovation', 'Trust and Society'];
const STATES = [
  'Andaman And Nicobar Islands',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
];

const WorksExplorer = () => {
  const navigate = useNavigate();
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState(null);

  const [stateFilter, setStateFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');

  const fetchWorks = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = { limit: 200, sort_by_risk: true };
    if (stateFilter) params.state = stateFilter;
    if (categoryFilter) params.category = categoryFilter;
    if (riskFilter) params.risk_level = riskFilter;

    getWorks(params)
      .then(res => {
        setWorks(res.records || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('Cannot reach API. Make sure the backend is running on port 8000.');
        setLoading(false);
      });
  }, [stateFilter, categoryFilter, riskFilter]);

  useEffect(() => {
    fetchWorks();
  }, [fetchWorks]);

  const filteredWorks = search.trim()
    ? works.filter(w => {
        const q = search.trim().toLowerCase();
        return (
          String(w.work_id).includes(q) ||
          (w.category || '').toLowerCase().includes(q) ||
          (w.district || '').toLowerCase().includes(q) ||
          (w.state || '').toLowerCase().includes(q)
        );
      })
    : works;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className="card" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Search size={18} color="var(--text-secondary)" />
        <input
          type="text"
          placeholder="Search work ID, category, district, or state..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ border: 'none', outline: 'none', width: '100%', fontSize: '1rem', color: 'var(--text-primary)', background: 'transparent' }}
        />
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <select
          className="card"
          style={{ flex: 1, minWidth: '160px', padding: '0.75rem 1rem', cursor: 'pointer' }}
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">All categories</option>
          {CATEGORIES.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select
          className="card"
          style={{ flex: 1, minWidth: '160px', padding: '0.75rem 1rem', cursor: 'pointer' }}
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
        >
          <option value="">All states</option>
          {STATES.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select
          className="card"
          style={{ flex: 1, minWidth: '160px', padding: '0.75rem 1rem', cursor: 'pointer' }}
          value={riskFilter}
          onChange={(e) => setRiskFilter(e.target.value)}
        >
          <option value="">All risk bands</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading works...</div>
        ) : error ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--risk-high-bg)' }}>{error}</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>WORK ID</th>
                  <th>CATEGORY</th>
                  <th>STATE / DISTRICT</th>
                  <th>YEAR</th>
                  <th>SANCTIONED</th>
                  <th>PAYMENTS</th>
                  <th>RISK</th>
                  <th style={{ width: '40px' }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredWorks.map(w => (
                  <tr
                    key={`${w.work_id}-${w.row_id}`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/works/${w.work_id}${w.row_id != null ? `?row_id=${w.row_id}` : ''}`)}
                  >
                    <td style={{ fontWeight: 500 }}>{w.work_id}</td>
                    <td>{w.category}</td>
                    <td>
                      <div>{w.state}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{w.district}</div>
                    </td>
                    <td>{w.recommended_year || '—'}</td>
                    <td>{formatCurrency(w.estimated_cost)}</td>
                    <td>{w.hasPayments ? 'Yes' : 'No'}</td>
                    <td>
                      <span className={`badge ${w.risk_level?.toLowerCase() || 'low'}`}>
                        {w.risk_level || 'LOW'}
                      </span>
                    </td>
                    <td>
                      <ChevronRight size={18} color="var(--text-secondary)" />
                    </td>
                  </tr>
                ))}
                {filteredWorks.length === 0 && (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                      No works found matching filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorksExplorer;
