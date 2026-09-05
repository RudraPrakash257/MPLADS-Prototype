import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import riskScoredWorks from '../data/risk_scored_works.json';
import KPICard from '../components/KPICard';
import {
  AlertTriangle,
  AlertOctagon,
  CheckCircle,
  Clock,
  Layers,
  IndianRupee,
  TrendingUp,
  Activity,
  Target,
  Zap,
  Filter,
} from 'lucide-react';
import { formatINR, formatINRShort } from '../utils/format';

export default function OverviewPage() {
  const navigate = useNavigate();
  const [activeActionGroup, setActiveActionGroup] = useState(null);
  const [activeQuickFilter, setActiveQuickFilter] = useState('All');

  // Compute 8 KPIs
  const kpiData = useMemo(() => {
    const totalWorks = riskScoredWorks.length;
    const totalSanctioned = riskScoredWorks.reduce((acc, w) => acc + w.sanctioned_amount, 0);
    const totalExpenditure = riskScoredWorks.reduce((acc, w) => acc + w.expenditure_amount, 0);
    const totalBudgetRemaining = totalSanctioned - totalExpenditure;
    const flaggedCount = riskScoredWorks.filter((w) => w.overall_score > 0).length;
    const pctFlagged = totalWorks > 0 ? ((flaggedCount / totalWorks) * 100).toFixed(1) : '0.0';
    const highCriticalCount = riskScoredWorks.filter(
      (w) => w.risk_band === 'HIGH' || w.risk_band === 'CRITICAL'
    ).length;
    const avgProgress =
      totalWorks > 0
        ? (riskScoredWorks.reduce((acc, w) => acc + w.progress_percent, 0) / totalWorks).toFixed(1)
        : '0.0';
    const delayedWorksCount = riskScoredWorks.filter(
      (w) => w.metrics.elapsed_days > 365 && w.completion_status !== 'Complete'
    ).length;

    return {
      totalWorks,
      totalSanctioned,
      totalExpenditure,
      pctFlagged,
      flaggedCount,
      highCriticalCount,
      avgProgress,
      totalBudgetRemaining,
      delayedWorksCount,
    };
  }, []);

  // Action group counts
  const actionGroupCounts = useMemo(() => {
    const critical = riskScoredWorks.filter((w) => w.overall_score >= 85).length;
    const high = riskScoredWorks.filter((w) => w.overall_score >= 65 && w.overall_score < 85).length;
    const medium = riskScoredWorks.filter((w) => w.overall_score >= 40 && w.overall_score < 65).length;
    const low = riskScoredWorks.filter((w) => w.overall_score < 40).length;
    return { critical, high, medium, low };
  }, []);

  const handleActionGroupClick = (group) => {
    setActiveActionGroup(activeActionGroup === group ? null : group);
    // Navigate to works page with appropriate filter
    if (group === 'immediate') {
      navigate('/works?priority=immediate');
    } else if (group === 'high') {
      navigate('/works?priority=high');
    } else if (group === 'medium') {
      navigate('/works?priority=medium');
    } else if (group === 'low') {
      navigate('/works?priority=low');
    }
  };

  const handleQuickFilterClick = (filter) => {
    setActiveQuickFilter(filter);
    if (filter === 'Delayed Works') {
      navigate('/works?rule=C');
    } else if (filter === 'Utilization Mismatch') {
      navigate('/works?rule=B');
    } else if (filter === 'Overspend') {
      navigate('/works?rule=A');
    } else if (filter === 'Immediate Review') {
      navigate('/works?priority=immediate');
    } else if (filter === 'High Attention') {
      navigate('/works?priority=high');
    } else {
      navigate('/works');
    }
  };

  return (
    <>
      {/* 8 KPI Cards Grid */}
      <section className="kpi-grid-8">
        <KPICard
          label="Total Works"
          value={kpiData.totalWorks}
          subtitle="Sanctioned works"
          icon={Layers}
          accent="#3b82f6"
        />
        <KPICard
          label="Total Sanctioned"
          value={formatINRShort(kpiData.totalSanctioned)}
          subtitle={formatINR(kpiData.totalSanctioned)}
          icon={IndianRupee}
          accent="#10b981"
        />
        <KPICard
          label="Total Expenditure"
          value={formatINRShort(kpiData.totalExpenditure)}
          subtitle={`${((kpiData.totalExpenditure / kpiData.totalSanctioned) * 100).toFixed(1)}% of sanctioned`}
          icon={TrendingUp}
          accent="#06b6d4"
        />
        <KPICard
          label="% Flagged"
          value={`${kpiData.pctFlagged}%`}
          subtitle={`${kpiData.flaggedCount} of ${kpiData.totalWorks} works flagged`}
          icon={Activity}
          accent="#f97316"
        />
        <KPICard
          label="High + Critical"
          value={kpiData.highCriticalCount}
          subtitle="Require priority review"
          icon={AlertOctagon}
          accent="#ef4444"
          valueColor="#f87171"
        />
        <KPICard
          label="Avg Progress"
          value={`${kpiData.avgProgress}%`}
          subtitle="Across all works"
          icon={CheckCircle}
          accent="#8b5cf6"
        />
        <KPICard
          label="Budget Remaining"
          value={formatINRShort(kpiData.totalBudgetRemaining)}
          subtitle="Unspent balance"
          icon={IndianRupee}
          accent="#14b8a6"
        />
        <KPICard
          label="Delayed Works"
          value={kpiData.delayedWorksCount}
          subtitle=">365 days & incomplete"
          icon={Clock}
          accent="#eab308"
          valueColor="#fde047"
        />
      </section>

      {/* Action Grouping Cards */}
      <section className="section-card">
        <div className="section-header">
          <div className="section-title-group">
            <div className="section-title">
              <Target size={18} color="#ef4444" />
              Administrative Action Priority Groups
            </div>
            <div className="section-subtitle">
              Filter works by priority level. Click any group to view related works.
            </div>
          </div>
        </div>

        <div className="action-groups-bar">
          <div
            className={`action-group-card critical ${activeActionGroup === 'immediate' ? 'active' : ''}`}
            onClick={() => handleActionGroupClick('immediate')}
          >
            <div>
              <div className="action-group-title">
                <AlertOctagon size={16} /> Immediate Review
              </div>
              <div className="action-group-sub">CRITICAL works (Score ≥ 85)</div>
            </div>
            <div className="action-group-badge" style={{ color: '#f87171' }}>
              {actionGroupCounts.critical}
            </div>
          </div>

          <div
            className={`action-group-card high ${activeActionGroup === 'high' ? 'active' : ''}`}
            onClick={() => handleActionGroupClick('high')}
          >
            <div>
              <div className="action-group-title">
                <AlertTriangle size={16} /> High Attention
              </div>
              <div className="action-group-sub">HIGH works (Score 65-84)</div>
            </div>
            <div className="action-group-badge" style={{ color: '#fb923c' }}>
              {actionGroupCounts.high}
            </div>
          </div>

          <div
            className={`action-group-card medium ${activeActionGroup === 'medium' ? 'active' : ''}`}
            onClick={() => handleActionGroupClick('medium')}
          >
            <div>
              <div className="action-group-title">
                <Activity size={16} /> Monitor
              </div>
              <div className="action-group-sub">MEDIUM works (Score 40-64)</div>
            </div>
            <div className="action-group-badge" style={{ color: '#facc15' }}>
              {actionGroupCounts.medium}
            </div>
          </div>

          <div
            className={`action-group-card low ${activeActionGroup === 'low' ? 'active' : ''}`}
            onClick={() => handleActionGroupClick('low')}
          >
            <div>
              <div className="action-group-title">
                <CheckCircle size={16} /> No Action Required
              </div>
              <div className="action-group-sub">LOW works (Score &lt; 40)</div>
            </div>
            <div className="action-group-badge" style={{ color: '#34d399' }}>
              {actionGroupCounts.low}
            </div>
          </div>
        </div>
      </section>

      {/* Quick Action Filters Bar */}
      <section className="quick-filters-bar">
        <span className="quick-filter-label">
          <Filter size={14} /> Quick Filters:
        </span>
        <button
          className={`quick-filter-btn ${activeQuickFilter === 'All' ? 'active' : ''}`}
          onClick={() => handleQuickFilterClick('All')}
        >
          All Works
        </button>
        <button
          className={`quick-filter-btn ${activeQuickFilter === 'Immediate Review' ? 'active' : ''}`}
          onClick={() => handleQuickFilterClick('Immediate Review')}
        >
          <AlertOctagon size={13} /> Immediate Review
        </button>
        <button
          className={`quick-filter-btn ${activeQuickFilter === 'High Attention' ? 'active' : ''}`}
          onClick={() => handleQuickFilterClick('High Attention')}
        >
          <AlertTriangle size={13} /> High Attention
        </button>
        <button
          className={`quick-filter-btn ${activeQuickFilter === 'Delayed Works' ? 'active' : ''}`}
          onClick={() => handleQuickFilterClick('Delayed Works')}
        >
          <Clock size={13} /> Delayed Works (Rule C)
        </button>
        <button
          className={`quick-filter-btn ${activeQuickFilter === 'Utilization Mismatch' ? 'active' : ''}`}
          onClick={() => handleQuickFilterClick('Utilization Mismatch')}
        >
          <TrendingUp size={13} /> Utilization Mismatch (Rule B)
        </button>
        <button
          className={`quick-filter-btn ${activeQuickFilter === 'Overspend' ? 'active' : ''}`}
          onClick={() => handleQuickFilterClick('Overspend')}
        >
          <IndianRupee size={13} /> Overspend (Rule A)
        </button>
      </section>

      {/* Quick Stats Summary */}
      <section className="section-card">
        <div className="section-header">
          <div className="section-title-group">
            <div className="section-title">
              <Zap size={18} color="#facc15" />
              Quick Summary
            </div>
            <div className="section-subtitle">
              Key metrics at a glance — click any card header to investigate further
            </div>
          </div>
        </div>
        <div className="grid-2col">
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">Critical Risk Works</span>
              <span className="detail-value" style={{ color: '#f87171' }}>
                {actionGroupCounts.critical}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">High Risk Works</span>
              <span className="detail-value" style={{ color: '#fb923c' }}>
                {actionGroupCounts.high}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Medium Risk Works</span>
              <span className="detail-value" style={{ color: '#facc15' }}>
                {actionGroupCounts.medium}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Low Risk Works</span>
              <span className="detail-value" style={{ color: '#34d399' }}>
                {actionGroupCounts.low}
              </span>
            </div>
          </div>
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">Total Flagged</span>
              <span className="detail-value">{kpiData.flaggedCount}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Flagged Percentage</span>
              <span className="detail-value">{kpiData.pctFlagged}%</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Delayed &gt;365 Days</span>
              <span className="detail-value">{kpiData.delayedWorksCount}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Average Progress</span>
              <span className="detail-value">{kpiData.avgProgress}%</span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
