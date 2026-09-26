import React, { useEffect, useState } from 'react';
import { getDetectors } from '../api/detectors';

const Detectors = () => {
  const [detectors, setDetectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getDetectors().then(res => {
      const arr = Array.isArray(res?.detectors)
        ? res.detectors
        : Array.isArray(res)
          ? res
          : [];
      setDetectors(arr);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setError('Cannot reach API. Make sure the backend is running on port 8000.');
      setLoading(false);
    });
  }, []);

  return (
    <div className="card">
      <h2 style={{ marginBottom: '1rem' }}>Anomaly Detection Methodology</h2>
      <p style={{ marginBottom: '2rem' }}>The system uses several transparent rule-based and statistical detectors.</p>

      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div style={{ color: 'var(--risk-high-bg)' }}>{error}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {detectors.map((d, i) => (
            <div key={d.name || i} style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
              <h3 style={{ textTransform: 'capitalize' }}>{(d.name || 'Detector').replace(/_/g, ' ')}</h3>
              <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                {d.method || d.description || 'No description available.'}
              </p>
              <div style={{ marginTop: '0.75rem', display: 'flex', gap: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                {d.category && <span>Category: {d.category}</span>}
                {d.threshold && <span>Threshold: {d.threshold}</span>}
              </div>
            </div>
          ))}
          {detectors.length === 0 && (
            <p style={{ color: 'var(--text-secondary)' }}>No detectors available.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default Detectors;
