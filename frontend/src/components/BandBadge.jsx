import React from 'react';
import { getBandColor } from '../utils/format';

export default function BandBadge({ band, score, size = 'md' }) {
  const colors = {
    CRITICAL: { bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '#dc2626' },
    HIGH: { bg: 'rgba(249, 115, 22, 0.15)', color: '#fb923c', border: '#ea580c' },
    MEDIUM: { bg: 'rgba(234, 179, 8, 0.15)', color: '#facc15', border: '#ca8a04' },
    LOW: { bg: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '#059669' },
  };

  const style = colors[band] || colors.LOW;

  const sizeStyles = {
    sm: { padding: '2px 6px', fontSize: '0.65rem', gap: '4px' },
    md: { padding: '3px 9px', fontSize: '0.72rem', gap: '5px' },
    lg: { padding: '4px 12px', fontSize: '0.8rem', gap: '6px' },
  };

  const s = sizeStyles[size];

  return (
    <div
      className="band-badge"
      style={{
        background: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
        ...s,
      }}
    >
      {band}
      {score !== undefined && (
        <span style={{ fontWeight: 700, color: getBandColor(band) }}>
          {score}
        </span>
      )}
    </div>
  );
}