import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import riskScoredWorks from '../data/risk_scored_works.json';
import { useActionStatus } from '../context/ActionStatusContext';
import { formatINR, getBandColor } from '../utils/format';

export default function WorkDetailsPage() {
  const { workId } = useParams();
  const { getActionStatus, setWorkActionStatus } = useActionStatus();
  const work = useMemo(() => riskScoredWorks.find((item) => item.work_id === workId), [workId]);

  if (!work) {
    return <section className="section-card not-found-card">
      <h2>Work not found</h2>
      <p>The requested work ID does not exist in the current static risk dataset.</p>
      <Link className="back-link" to="/works"><ArrowLeft size={16} /> Back to Works</Link>
    </section>;
  }

  const status = getActionStatus(work.work_id);
  const healthClass = work.project_health.toLowerCase().replaceAll(' ', '-');

  return <section className="detail-page">
    <Link className="back-link" to="/works"><ArrowLeft size={16} /> Back to Works Register</Link>
    <div className="modal-card detail-page-card">
      <div className="modal-header">
        <div className="modal-title-row">
          <span className="work-id-badge" style={{ fontSize: '1rem' }}>{work.work_id}</span>
          <span className="modal-title">{work.category} Work Details</span>
          <span className={`band-badge ${work.risk_band.toLowerCase()}`}>{work.risk_band} RISK</span>
          <span className={`health-badge ${healthClass}`}>{work.project_health}</span>
        </div>
      </div>

      <div className="modal-body">
        <div className={`modal-score-banner ${work.risk_band.toLowerCase()}`}>
          <div>
            <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-secondary)' }}>Overall Composite Risk Score</div>
            <div style={{ fontSize: '0.85rem', marginTop: 2, color: '#f8fafc' }}>Status: <strong>{work.completion_status}</strong> • Triggered Rules: <strong>{work.triggered_rules.length ? work.triggered_rules.join(', ') : 'None (Within Normal Parameters)'}</strong></div>
          </div>
          <div style={{ textAlign: 'right' }}><div className="score-number" style={{ color: getBandColor(work.risk_band) }}>{work.overall_score}</div><div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>out of 100</div></div>
        </div>

        <div className="score-breakdown-card">
          <div className="score-formula-row">
            <div className="score-chip"><div className="score-chip-label">Base Risk Score</div><div className="score-chip-val">{work.base_score}</div></div>
            <span className="score-operator">+</span>
            <div className="score-chip"><div className="score-chip-label">Corroboration Bonus</div><div className="score-chip-val">+{work.corroboration_bonus}</div></div>
            <span className="score-operator">=</span>
            <div className="score-chip" style={{ borderColor: getBandColor(work.risk_band) }}><div className="score-chip-label">Final Risk Score</div><div className="score-chip-val" style={{ color: getBandColor(work.risk_band) }}>{work.overall_score}</div></div>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Multiple triggered rules add a corroboration bonus; final score is capped at 100.</div>
        </div>

        <div className="action-status-card">
          <span className="action-status-label">Action Status:</span>
          <select className="status-select" value={status} onChange={(event) => setWorkActionStatus(work.work_id, event.target.value)}>
            <option value="Pending Review">Pending Review</option><option value="Under Review">Under Review</option><option value="Reviewed">Reviewed</option>
          </select>
          <span className={`status-badge ${status.toLowerCase().replaceAll(' ', '-')}`}>{status}</span>
        </div>

        <div className="action-recommendation-box"><div className="action-header"><ShieldCheck size={16} /> Recommended Administrative Action</div><div className="action-text">{work.recommended_action}</div></div>

        {work.reasons.length > 0 && <div className="reasons-box"><div className="detail-section-title">Detailed Risk Reasons & Indicators</div>{work.reasons.map((reason, index) => <div key={reason} className={`reason-item rule-${work.triggered_rules[index] || 'A'}`}><div style={{ fontWeight: 700, fontSize: '0.75rem', marginBottom: 4, color: '#93c5fd' }}>RULE {work.triggered_rules[index] || 'A'} TRIGGERED:</div>{reason}</div>)}</div>}

        <div><div className="detail-section-title">Financial Breakdown</div><div className="detail-grid">
          <DetailItem label="Sanctioned Amount" value={formatINR(work.sanctioned_amount)} />
          <DetailItem label="Released Amount" value={formatINR(work.released_amount)} />
          <DetailItem label="Expenditure Amount" value={formatINR(work.expenditure_amount)} color={work.expenditure_amount > work.released_amount ? '#ef4444' : undefined} />
          <DetailItem label="Budget Remaining" value={`${formatINR(work.metrics.budget_remaining)} (${work.metrics.budget_remaining_percent.toFixed(1)}%)`} color={work.metrics.budget_remaining < 0 ? '#ef4444' : undefined} />
          <DetailItem label="% Utilized (of Sanctioned)" value={`${(work.metrics.expenditure_to_sanctioned * 100).toFixed(1)}%`} color="#f43f5e" />
          <DetailItem label="% Release Utilized" value={`${work.metrics.release_utilization_percent.toFixed(1)}%`} />
        </div></div>

        <div><div className="detail-section-title">Physical Progress & Timeline</div><div className="detail-grid">
          <DetailItem label="Implementing Agency" value={work.agency_name} />
          <DetailItem label="Physical Progress" value={`${work.progress_percent}%`} color="#38bdf8" />
          <DetailItem label="Expected Progress" value={`${work.metrics.expected_progress_percent.toFixed(1)}%`} />
          <DetailItem label="Progress Gap" value={`${work.metrics.progress_gap_percent.toFixed(1)}%`} color={work.metrics.progress_gap_percent > 30 ? '#ef4444' : undefined} />
          <DetailItem label="Elapsed Days" value={`${work.metrics.elapsed_days} days`} color={work.metrics.elapsed_days > 365 ? '#f97316' : undefined} />
          <DetailItem label="Days Overdue" value={`${work.metrics.days_overdue} days`} color={work.metrics.days_overdue > 0 ? '#f97316' : undefined} />
        </div></div>

        <div className="timeline-box"><div className="detail-section-title" style={{ marginBottom: 2 }}>Project Timeline Norm</div><div className="timeline-steps"><div className="timeline-track-line" /><TimelineStep className="done" number="1" label="Sanction Date" sub={work.sanction_date} /><TimelineStep className={work.metrics.elapsed_days > 365 ? 'warning' : 'active'} number="2" label="365-Day Norm" sub="Standard Duration" /><TimelineStep className="active" number="3" label="Current Status" sub={`${work.completion_status} (${work.metrics.elapsed_days}d)`} /></div></div>
        <div className="details-disclaimer"><AlertTriangle size={14} /> Risk indicator — requires human review, not a finding of fraud.</div>
      </div>
    </div>
  </section>;
}

function DetailItem({ label, value, color }) { return <div className="detail-item"><span className="detail-label">{label}</span><span className="detail-value" style={color ? { color } : undefined}>{value}</span></div>; }
function TimelineStep({ className, number, label, sub }) { return <div className="timeline-step"><div className={`timeline-node ${className}`}>{number}</div><div className="timeline-label">{label}</div><div className="timeline-sub">{sub}</div></div>; }
