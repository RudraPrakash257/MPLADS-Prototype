import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import riskScoredWorks from '../data/risk_scored_works.json';
import { useActionStatus } from '../context/ActionStatusContext';
import { Zap } from 'lucide-react';
import { getBandColor } from '../utils/format';

export default function PriorityPage() {
  const navigate = useNavigate();
  const { getActionStatus, setWorkActionStatus } = useActionStatus();

  // Top 10 Priority Action Queue
  const priorityQueue = useMemo(() => {
    return [...riskScoredWorks]
      .sort((a, b) => {
        if (b.overall_score !== a.overall_score) return b.overall_score - a.overall_score;
        if (b.metrics.days_overdue !== a.metrics.days_overdue) return b.metrics.days_overdue - a.metrics.days_overdue;
        return b.metrics.utilization_gap - a.metrics.utilization_gap;
      })
      .slice(0, 10);
  }, []);

  return (
    <section className="section-card">
      <div className="section-header">
        <div className="section-title-group">
          <div className="section-title">
            <Zap size={18} color="#facc15" />
            Priority Action Queue — Top 10 Works Requiring Immediate Attention
          </div>
          <div className="section-subtitle">
            Sorted by composite risk score, days overdue, and utilization gap. Click any row to open full drill-down.
          </div>
        </div>
      </div>

      <div className="table-container">
        <table className="priority-queue-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>#</th>
              <th>Work ID</th>
              <th>Category</th>
              <th>Agency</th>
              <th>Risk Band</th>
              <th>Score</th>
              <th>% Utilized</th>
              <th>% Progress</th>
              <th>Days Overdue</th>
              <th>Primary Reason</th>
              <th>Recommended Action</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {priorityQueue.map((work, idx) => (
              <tr
                key={work.work_id}
                className="priority-row"
                onClick={() => navigate(`/works/${work.work_id}`)}
              >
                <td>
                  <div className="priority-rank-badge">{idx + 1}</div>
                </td>
                <td>
                  <span className="work-id-badge">{work.work_id}</span>
                </td>
                <td>{work.category}</td>
                <td style={{ fontWeight: 600 }}>{work.agency_name}</td>
                <td>
                  <span className={`band-badge ${work.risk_band.toLowerCase()}`}>
                    {work.risk_band}
                  </span>
                </td>
                <td>
                  <span style={{ fontWeight: 800, color: getBandColor(work.risk_band) }}>
                    {work.overall_score}
                  </span>
                </td>
                <td>{(work.metrics.expenditure_to_sanctioned * 100).toFixed(1)}%</td>
                <td>{work.progress_percent}%</td>
                <td>
                  <span
                    style={{
                      color: work.metrics.days_overdue > 0 ? '#f97316' : 'var(--text-secondary)',
                      fontWeight: work.metrics.days_overdue > 0 ? 700 : 'normal',
                    }}
                  >
                    {work.metrics.days_overdue}
                  </span>
                </td>
                <td>
                  <div className="reason-snippet" title={work.primary_reason}>
                    {work.primary_reason}
                  </div>
                </td>
                <td style={{ fontSize: '0.78rem', color: '#93c5fd' }}>
                  {work.recommended_action}
                </td>
                <td>
                  <select
                    className="status-select"
                    value={getActionStatus(work.work_id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      setWorkActionStatus(work.work_id, e.target.value);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <option value="Pending Review">Pending Review</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Reviewed">Reviewed</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
