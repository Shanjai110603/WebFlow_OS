import React from 'react';
import { ScoreBreakdown } from '@shared/types';

interface ScoreGaugeProps {
  scores?: ScoreBreakdown;
  isAuditing?: boolean;
}

export const ScoreGauge: React.FC<ScoreGaugeProps> = ({ scores, isAuditing }) => {
  const overall = scores?.overall ?? 0;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = scores ? circumference - (overall / 100) * circumference : circumference;

  // Determine status color theme
  let statusColor = 'var(--accent-red)';
  let glowColor = 'rgba(239, 68, 68, 0.4)';
  if (overall >= 80) {
    statusColor = 'var(--accent-green)';
    glowColor = 'rgba(16, 185, 129, 0.4)';
  } else if (overall >= 50) {
    statusColor = 'var(--accent-amber)';
    glowColor = 'rgba(245, 158, 11, 0.4)';
  }

  return (
    <div className="glass-card flex flex-col items-center justify-center gap-3" style={{ padding: 18, marginBottom: 16 }}>
      {/* Radial Gauge Container */}
      <div className="flex items-center justify-center" style={{ position: 'relative', width: 110, height: 110 }}>
        <svg width="110" height="110" style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx="55"
            cy="55"
            r={radius}
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="8"
            fill="transparent"
          />
          <circle
            cx="55"
            cy="55"
            r={radius}
            stroke={statusColor}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={isAuditing ? circumference : strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            style={{
              transition: 'stroke-dashoffset 1s ease-in-out, stroke 0.3s ease',
              filter: `drop-shadow(0 0 8px ${glowColor})`,
            }}
          />
        </svg>

        {/* Digit Display */}
        <div
          className="flex flex-col items-center justify-center"
          style={{
            position: 'absolute',
            textAlign: 'center',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 28,
              fontWeight: 800,
              color: scores ? '#ffffff' : 'var(--text-muted)',
              lineHeight: 1,
            }}
          >
            {isAuditing ? '...' : scores ? overall : '--'}
          </span>
          <span style={{ fontSize: 9, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2, fontWeight: 600 }}>
            {scores ? (overall >= 80 ? 'Optimal' : overall >= 50 ? 'Needs Fix' : 'Critical') : 'No Audit'}
          </span>
        </div>
      </div>

      {/* Category Chips Bar */}
      {scores && (
        <div className="flex items-center justify-between" style={{ width: '100%', gap: 6, paddingTop: 6, borderTop: '1px solid var(--border-color)' }}>
          <div className="flex flex-col items-center" style={{ flex: 1 }}>
            <span style={{ fontSize: 9, color: 'var(--text-secondary)' }}>ACC</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: scores.accessibility >= 80 ? 'var(--accent-green)' : 'var(--accent-amber)' }}>
              {scores.accessibility}
            </span>
          </div>
          <div className="flex flex-col items-center" style={{ flex: 1 }}>
            <span style={{ fontSize: 9, color: 'var(--text-secondary)' }}>PRIV</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: scores.privacy >= 80 ? 'var(--accent-green)' : 'var(--accent-amber)' }}>
              {scores.privacy}
            </span>
          </div>
          <div className="flex flex-col items-center" style={{ flex: 1 }}>
            <span style={{ fontSize: 9, color: 'var(--text-secondary)' }}>SEC</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: scores.security >= 80 ? 'var(--accent-green)' : 'var(--accent-amber)' }}>
              {scores.security}
            </span>
          </div>
          <div className="flex flex-col items-center" style={{ flex: 1 }}>
            <span style={{ fontSize: 9, color: 'var(--text-secondary)' }}>SEO</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: scores.seo >= 80 ? 'var(--accent-green)' : 'var(--accent-amber)' }}>
              {scores.seo}
            </span>
          </div>
          <div className="flex flex-col items-center" style={{ flex: 1 }}>
            <span style={{ fontSize: 9, color: 'var(--text-secondary)' }}>UX</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: scores.ux >= 80 ? 'var(--accent-green)' : 'var(--accent-amber)' }}>
              {scores.ux}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
