import React, { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import riskScoredWorks from '../data/risk_scored_works.json';
import Filters from '../components/Filters';
import WorksTable from '../components/WorksTable';
import { FileText } from 'lucide-react';

export default function WorksPage() {
  const [searchParams] = useSearchParams();
  const [selectedBands, setSelectedBands] = useState(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [sortField, setSortField] = useState('overall_score');
  const [sortAsc, setSortAsc] = useState(false);

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = new Set(riskScoredWorks.map((w) => w.category));
    return ['ALL', ...Array.from(cats)];
  }, []);

  // Handle query params on mount
  useEffect(() => {
    const priority = searchParams.get('priority');
    const rule = searchParams.get('rule');
    const agency = searchParams.get('agency');

    if (priority === 'immediate') {
      setSelectedBands(['CRITICAL']);
    } else if (priority === 'high') {
      setSelectedBands(['HIGH']);
    } else if (priority === 'medium') {
      setSelectedBands(['MEDIUM']);
    } else if (priority === 'low') {
      setSelectedBands(['LOW']);
    }

    if (rule === 'A') {
      // Overspend - filter to works triggering rule A
      // This will be handled in filteredWorks
    }

    if (agency) {
      setSearchQuery(agency);
    }
  }, [searchParams]);

  // Filter works based on all active filters
  const filteredWorks = useMemo(() => {
    let result = [...riskScoredWorks];

    const rule = searchParams.get('rule');

    // Quick Filter from query params
    if (rule === 'A') {
      result = result.filter((w) => w.triggered_rules.includes('A'));
    } else if (rule === 'B') {
      result = result.filter((w) => w.triggered_rules.includes('B'));
    } else if (rule === 'C') {
      result = result.filter((w) => w.triggered_rules.includes('C'));
    }

    // Risk Band filter
    if (selectedBands.length > 0 && selectedBands.length < 4) {
      result = result.filter((w) => selectedBands.includes(w.risk_band));
    }

    // Category filter
    if (selectedCategory !== 'ALL') {
      result = result.filter((w) => w.category === selectedCategory);
    }

    // Completion Status filter
    if (selectedStatus !== 'ALL') {
      result = result.filter((w) => w.completion_status === selectedStatus);
    }

    // Search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((w) =>
        w.work_id.toLowerCase().includes(query) ||
        w.agency_name.toLowerCase().includes(query) ||
        w.category.toLowerCase().includes(query) ||
        (w.primary_reason || '').toLowerCase().includes(query)
      );
    }

    return result;
  }, [selectedBands, selectedCategory, selectedStatus, searchQuery, searchParams]);

  // Sorted works for table
  const sortedWorks = useMemo(() => {
    return [...filteredWorks].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (sortField === 'utilized_percent') {
        valA = a.metrics.expenditure_to_sanctioned * 100;
        valB = b.metrics.expenditure_to_sanctioned * 100;
      } else if (sortField === 'progress_gap') {
        valA = a.metrics.progress_gap_percent;
        valB = b.metrics.progress_gap_percent;
      } else if (sortField === 'elapsed_days') {
        valA = a.metrics.elapsed_days;
        valB = b.metrics.elapsed_days;
      }

      if (typeof valA === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? valA - valB : valB - valA;
    });
  }, [filteredWorks, sortField, sortAsc]);

  const clearAllFilters = () => {
    setSelectedBands(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']);
    setSelectedCategory('ALL');
    setSelectedStatus('ALL');
    setSearchQuery('');
  };

  const handleSort = (field, ascending) => {
    setSortField(field);
    setSortAsc(ascending);
  };

  return (
    <section className="section-card">
      <div className="section-header">
        <div className="section-title-group">
          <div className="section-title">
            <FileText size={18} color="#3b82f6" />
            Comprehensive Work Risk Assessment Table
          </div>
          <div className="section-subtitle">
            Sorted by composite risk score descending by default. Click any row to inspect complete work details.
          </div>
        </div>
      </div>

      <Filters
        bands={selectedBands}
        setBands={setSelectedBands}
        category={selectedCategory}
        setCategory={setSelectedCategory}
        status={selectedStatus}
        setStatus={setSelectedStatus}
        search={searchQuery}
        setSearch={setSearchQuery}
        categories={categories}
        onClear={clearAllFilters}
      />

      <WorksTable
        works={sortedWorks}
        sortField={sortField}
        sortAsc={sortAsc}
        onSort={handleSort}
      />
    </section>
  );
}
