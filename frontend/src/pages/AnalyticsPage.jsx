import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ScatterChart,
  Scatter,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  Legend,
} from 'recharts';
import { TrendingUp, Clock, Layers } from 'lucide-react';
import riskScoredWorks from '../data/risk_scored_works.json';
import { getBandColor } from '../utils/format';

function ChartTooltip({ active, payload, mode }) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return <div className="custom-chart-tooltip">
    <div className="tooltip-title"><span>{data.work_id}</span><span style={{ color: getBandColor(data.risk_band) }}>{data.risk_band} ({data.overall_score})</span></div>
    <div className="tooltip-row"><span>Agency:</span><span>{data.agency_name}</span></div>
    {mode === 'utilization' ? <>
      <div className="tooltip-row"><span>Physical Progress:</span><span>{data.x}%</span></div>
      <div className="tooltip-row"><span>Fund Utilized:</span><span>{data.y}%</span></div>
    </> : <>
      <div className="tooltip-row"><span>Days Open:</span><span>{data.x} days {data.days_overdue > 0 ? `(${data.days_overdue} overdue)` : ''}</span></div>
      <div className="tooltip-row"><span>Physical Progress:</span><span>{data.y}%</span></div>
      <div className="tooltip-row"><span>Status:</span><span>{data.completion_status}</span></div>
    </>}
    <div className="tooltip-hint">Click point to view work details</div>
  </div>;
}

export default function AnalyticsPage() {
  const navigate = useNavigate();
  const utilizationData = useMemo(() => riskScoredWorks.map((work) => ({
    work_id: work.work_id, agency_name: work.agency_name, category: work.category,
    x: work.progress_percent, y: Number((work.metrics.expenditure_to_sanctioned * 100).toFixed(1)),
    overall_score: work.overall_score, risk_band: work.risk_band,
  })), []);
  const delayData = useMemo(() => riskScoredWorks.map((work) => ({
    work_id: work.work_id, agency_name: work.agency_name, category: work.category,
    x: work.metrics.elapsed_days, y: work.progress_percent, days_overdue: work.metrics.days_overdue,
    overall_score: work.overall_score, risk_band: work.risk_band, completion_status: work.completion_status,
  })), []);
  const categoryData = useMemo(() => {
    const groups = {};
    riskScoredWorks.forEach((work) => {
      if (!groups[work.category]) groups[work.category] = { category: work.category, works: 0, progress: 0, score: 0 };
      groups[work.category].works += 1;
      groups[work.category].progress += work.progress_percent;
      groups[work.category].score += work.overall_score;
    });
    return Object.values(groups).map((group) => ({
      category: group.category, works: group.works,
      avg_progress: Number((group.progress / group.works).toFixed(1)),
      avg_score: Number((group.score / group.works).toFixed(1)),
    }));
  }, []);

  return <>
    <section className="grid-2col">
      <div className="section-card">
        <div className="section-header"><div className="section-title-group"><div className="section-title"><TrendingUp size={18} color="#3b82f6" />Physical Progress vs. Fund Utilization</div><div className="section-subtitle">X = Progress %, Y = Fund Utilized %. Points above y = x line denote expenditure outpacing physical work.</div></div></div>
        <div className="chart-wrapper"><ResponsiveContainer width="100%" height="100%"><ScatterChart margin={{ top: 15, right: 20, bottom: 20, left: 10 }}><CartesianGrid strokeDasharray="3 3" stroke="#1e293b" /><XAxis type="number" dataKey="x" domain={[0, 100]} name="Physical Progress" unit="%" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} label={{ value: 'Physical Progress (%)', position: 'insideBottom', offset: -10, fill: '#94a3b8', fontSize: 11 }} /><YAxis type="number" dataKey="y" domain={[0, 140]} name="Fund Utilization" unit="%" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} label={{ value: 'Fund Utilization (%)', angle: -90, position: 'insideLeft', offset: 5, fill: '#94a3b8', fontSize: 11 }} /><Tooltip content={<ChartTooltip mode="utilization" />} /><ReferenceLine segment={[{ x: 0, y: 0 }, { x: 100, y: 100 }]} stroke="#3b82f6" strokeDasharray="5 5" strokeWidth={2} /><Scatter data={utilizationData} cursor="pointer" onClick={(point) => point?.work_id && navigate(`/works/${point.work_id}`)}>{utilizationData.map((entry) => <Cell key={entry.work_id} fill={getBandColor(entry.risk_band)} stroke="#0f172a" strokeWidth={1.5} />)}</Scatter></ScatterChart></ResponsiveContainer></div>
        <div className="chart-legend-box"><span style={{ fontWeight: 600, color: '#fff' }}>Legend:</span>{['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((band) => <div className="legend-item" key={band}><div className="legend-dot" style={{ backgroundColor: getBandColor(band) }} />{band}</div>)}<div className="reference-line-indicator"><div className="ref-dashed-line" />Parity Line (y = x)</div></div>
      </div>
      <div className="section-card">
        <div className="section-header"><div className="section-title-group"><div className="section-title"><Clock size={18} color="#f97316" />Delay & Stalled Projects Analysis</div><div className="section-subtitle">X = Elapsed Days, Y = Progress %. Points beyond the 365-day norm line indicate delayed projects.</div></div></div>
        <div className="chart-wrapper"><ResponsiveContainer width="100%" height="100%"><ScatterChart margin={{ top: 15, right: 20, bottom: 20, left: 10 }}><CartesianGrid strokeDasharray="3 3" stroke="#1e293b" /><XAxis type="number" dataKey="x" domain={[0, 750]} name="Elapsed Days" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} label={{ value: 'Elapsed Days Since Sanction', position: 'insideBottom', offset: -10, fill: '#94a3b8', fontSize: 11 }} /><YAxis type="number" dataKey="y" domain={[0, 100]} name="Physical Progress" unit="%" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} label={{ value: 'Physical Progress (%)', angle: -90, position: 'insideLeft', offset: 5, fill: '#94a3b8', fontSize: 11 }} /><Tooltip content={<ChartTooltip mode="delay" />} /><ReferenceLine x={365} stroke="#f97316" strokeDasharray="4 4" strokeWidth={2} label={{ value: '365-Day Standard Norm', position: 'insideTopRight', fill: '#f97316', fontSize: 11 }} /><Scatter data={delayData} cursor="pointer" onClick={(point) => point?.work_id && navigate(`/works/${point.work_id}`)}>{delayData.map((entry) => <Cell key={entry.work_id} fill={getBandColor(entry.risk_band)} stroke="#0f172a" strokeWidth={1.5} />)}</Scatter></ScatterChart></ResponsiveContainer></div>
        <div className="chart-legend-box"><span style={{ fontWeight: 600, color: '#fff' }}>Indicator:</span><div className="reference-line-indicator"><div className="ref-dashed-line" style={{ borderTopColor: '#f97316' }} />365-Day Completion Threshold</div></div>
      </div>
    </section>
    <section className="section-card">
      <div className="section-header"><div className="section-title-group"><div className="section-title"><Layers size={18} color="#06b6d4" />Category Breakdown & Progress</div><div className="section-subtitle">Total works, average physical progress, and average risk score per infrastructure category.</div></div></div>
      <div className="chart-wrapper"><ResponsiveContainer width="100%" height="100%"><BarChart data={categoryData} margin={{ top: 15, right: 20, bottom: 20, left: 10 }}><CartesianGrid strokeDasharray="3 3" stroke="#1e293b" /><XAxis dataKey="category" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} /><YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} /><Tooltip contentStyle={{ background: '#0f172a', borderColor: '#334155', borderRadius: 6 }} labelStyle={{ color: '#93c5fd', fontWeight: 700 }} /><Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} /><Bar dataKey="works" name="Total Works" fill="#3b82f6" radius={[4, 4, 0, 0]} /><Bar dataKey="avg_progress" name="Avg Progress (%)" fill="#10b981" radius={[4, 4, 0, 0]} /><Bar dataKey="avg_score" name="Avg Risk Score" fill="#f97316" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
    </section>
  </>;
}
