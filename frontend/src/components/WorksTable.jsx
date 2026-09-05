import { ArrowUpDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatINRShort, getBandColor } from '../utils/format';

export default function WorksTable({ works, sortField, sortAsc, onSort }) {
  const navigate = useNavigate();
  const handleSort = (field) => {
    if (sortField === field) {
      onSort(field, !sortAsc);
    } else {
      onSort(field, false);
    }
  };

  if (works.length === 0) {
    return (
      <div className="table-container">
        <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
          No works found matching the selected filter criteria.
        </div>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="risk-table">
        <thead>
          <tr>
            <th className="sortable" onClick={() => handleSort('work_id')}>
              Work ID <ArrowUpDown size={11} style={{ display: 'inline' }} />
            </th>
            <th className="sortable" onClick={() => handleSort('agency_name')}>
              Agency <ArrowUpDown size={11} style={{ display: 'inline' }} />
            </th>
            <th className="sortable" onClick={() => handleSort('category')}>
              Category <ArrowUpDown size={11} style={{ display: 'inline' }} />
            </th>
            <th className="sortable" onClick={() => handleSort('sanctioned_amount')}>
              Sanctioned <ArrowUpDown size={11} style={{ display: 'inline' }} />
            </th>
            <th className="sortable" onClick={() => handleSort('expenditure_amount')}>
              Expenditure <ArrowUpDown size={11} style={{ display: 'inline' }} />
            </th>
            <th className="sortable" onClick={() => handleSort('utilized_percent')}>
              % Utilized <ArrowUpDown size={11} style={{ display: 'inline' }} />
            </th>
            <th className="sortable" onClick={() => handleSort('progress_percent')}>
              % Progress <ArrowUpDown size={11} style={{ display: 'inline' }} />
            </th>
            <th className="sortable" onClick={() => handleSort('progress_gap')}>
              Progress Gap <ArrowUpDown size={11} style={{ display: 'inline' }} />
            </th>
            <th className="sortable" onClick={() => handleSort('elapsed_days')}>
              Days Open <ArrowUpDown size={11} style={{ display: 'inline' }} />
            </th>
            <th className="sortable" onClick={() => handleSort('overall_score')}>
              Risk Band & Score <ArrowUpDown size={11} style={{ display: 'inline' }} />
            </th>
            <th>Primary Reason</th>
          </tr>
        </thead>
        <tbody>
          {works.map((work) => {
            const utilPct = (work.metrics.expenditure_to_sanctioned * 100).toFixed(1);
            const bandClass = work.risk_band.toLowerCase();
            const gap = work.metrics.progress_gap_percent;

            return (
              <tr
                key={work.work_id}
                className="table-row"
                onClick={() => navigate(`/works/${work.work_id}`)}
              >
                <td>
                  <span className="work-id-badge">{work.work_id}</span>
                </td>
                <td style={{ fontWeight: 600 }}>{work.agency_name}</td>
                <td>
                  <span style={{ color: 'var(--text-secondary)' }}>{work.category}</span>
                </td>
                <td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                  {formatINRShort(work.sanctioned_amount)}
                </td>
                <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {formatINRShort(work.expenditure_amount)}
                </td>
                <td>
                  <div className="progress-cell-wrapper">
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                      <span style={{ fontWeight: 600, color: utilPct > 100 ? '#ef4444' : '#cbd5e1' }}>
                        {utilPct}%
                      </span>
                    </div>
                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${Math.min(100, utilPct)}%`,
                          backgroundColor: utilPct > 100 ? '#ef4444' : '#60a5fa',
                        }}
                      />
                    </div>
                  </div>
                </td>
                <td>
                  <div className="progress-cell-wrapper">
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                      <span style={{ fontWeight: 600, color: '#cbd5e1' }}>
                        {work.progress_percent}%
                      </span>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${work.progress_percent}%` }} />
                    </div>
                  </div>
                </td>
                <td>
                  <span
                    style={{
                      fontWeight: 700,
                      color: gap > 30 ? '#ef4444' : gap > 15 ? '#f97316' : '#94a3b8',
                    }}
                  >
                    {gap > 0 ? `+${gap.toFixed(1)}%` : `${gap.toFixed(1)}%`}
                  </span>
                </td>
                <td>
                  <span
                    style={{
                      color:
                        work.metrics.elapsed_days > 365 && work.completion_status !== 'Complete'
                          ? '#f97316'
                          : 'inherit',
                      fontWeight:
                        work.metrics.elapsed_days > 365 && work.completion_status !== 'Complete'
                          ? 700
                          : 'normal',
                    }}
                  >
                    {work.metrics.elapsed_days}d
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className={`band-badge ${bandClass}`}>{work.risk_band}</span>
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        color: getBandColor(work.risk_band),
                      }}
                    >
                      {work.overall_score}
                    </span>
                  </div>
                </td>
                <td>
                  <div className="reason-snippet" title={work.primary_reason}>
                    {work.primary_reason}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
