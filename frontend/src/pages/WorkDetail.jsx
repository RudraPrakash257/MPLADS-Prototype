import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { getWorkById } from '../api/works';
import { formatCurrency } from '../utils/formatters';

const WorkDetail = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const rowId = searchParams.get('row_id');
  const [work, setWork] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getWorkById(id, rowId).then(res => {
      setWork(res);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [id, rowId]);

  if (loading) return <div>Loading...</div>;
  if (!work) return <div>Work not found. Is the API running on port 8000?</div>;

  const workId = work.work_id ?? work.workId;
  const detectors = Array.isArray(work.triggered_detectors)
    ? work.triggered_detectors
    : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <Link to="/works">&larr; Back to Explorer</Link>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: 0 }}>Work {workId}</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              {work.work_description || 'No description available.'}
            </p>
          </div>
          <span className={`badge ${work.risk_level?.toLowerCase() || 'low'}`}>
            {work.risk_level || 'UNKNOWN'}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginTop: '1.5rem' }}>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>State</p>
            <p>{work.state || '—'}</p>
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>District</p>
            <p>{work.district || '—'}</p>
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Category</p>
            <p>{work.category || '—'}</p>
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Estimated cost</p>
            <p>{formatCurrency(work.estimated_cost)}</p>
          </div>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Risk score</p>
            <p>{work.risk_score != null ? Number(work.risk_score).toFixed(3) : '—'}</p>
          </div>
        </div>

        {work.recommendation && (
          <p style={{ marginTop: '1.25rem' }}><strong>Recommendation:</strong> {work.recommendation}</p>
        )}
        {work.explanation && (
          <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)' }}>{work.explanation}</p>
        )}
      </div>

      {detectors.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>Triggered detectors</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {detectors.map((d, i) => (
              <div key={d.detector || i} style={{ padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                <div style={{ fontWeight: 600 }}>{(d.detector || 'detector').replace(/_/g, ' ')}</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  {d.evidence || 'No evidence text.'}
                </div>
                {d.score != null && (
                  <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>Score: {Number(d.score).toFixed(3)}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkDetail;
