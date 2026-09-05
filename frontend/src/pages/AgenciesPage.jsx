import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import riskScoredWorks from '../data/risk_scored_works.json';

export default function AgenciesPage() {
  const navigate = useNavigate();

  // Agency Analysis
  const agencyAnalysis = useMemo(() => {
    const map = {};
    riskScoredWorks.forEach((w) => {
      if (!map[w.agency_name]) {
        map[w.agency_name] = {
          agency_name: w.agency_name,
          works_count: 0,
          total_progress: 0,
          total_sanctioned: 0,
          total_expenditure: 0,
          high_critical_count: 0,
        };
      }
      map[w.agency_name].works_count += 1;
      map[w.agency_name].total_progress += w.progress_percent;
      map[w.agency_name].total_sanctioned += w.sanctioned_amount;
      map[w.agency_name].total_expenditure += w.expenditure_amount;
      if (w.risk_band === 'HIGH' || w.risk_band === 'CRITICAL') {
        map[w.agency_name].high_critical_count += 1;
      }
    });

    return Object.values(map)
      .map((item) => ({
        agency_name: item.agency_name,
        works: item.works_count,
        avg_progress: (item.total_progress / item.works_count).toFixed(1),
        avg_utilization: ((item.total_expenditure / item.total_sanctioned) * 100).toFixed(1),
        high_critical_count: item.high_critical_count,
      }))
      .sort((a, b) => b.high_critical_count - a.high_critical_count);
  }, []);

  return (
    <section className="section-card">
      <div className="section-header">
        <div className="section-title-group">
          <div className="section-title">
            <Building2 size={18} color="#8b5cf6" />
            Implementing Agency Risk Profile
          </div>
          <div className="section-subtitle">
            Aggregate execution metrics sorted by High/Critical risk works count. Click any agency to view their works.
          </div>
        </div>
      </div>

      <div className="table-container">
        <table className="risk-table">
          <thead>
            <tr>
              <th>Agency Name</th>
              <th>Works</th>
              <th>Avg Progress</th>
              <th>Avg Utilization</th>
              <th>High/Critical</th>
            </tr>
          </thead>
          <tbody>
            {agencyAnalysis.map((agency, idx) => (
              <tr
                key={idx}
                className="table-row"
                onClick={() => navigate(`/works?agency=${encodeURIComponent(agency.agency_name)}`)}
              >
                <td style={{ fontWeight: 600 }}>{agency.agency_name}</td>
                <td>{agency.works}</td>
                <td>{agency.avg_progress}%</td>
                <td>{agency.avg_utilization}%</td>
                <td>
                  <span
                    className={`band-badge ${
                      agency.high_critical_count > 0 ? 'critical' : 'low'
                    }`}
                  >
                    {agency.high_critical_count}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
