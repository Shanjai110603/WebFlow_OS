import React from 'react';
import { ScoreBreakdown } from '@shared/types';

interface ScoreGaugeProps {
  scores?: ScoreBreakdown;
  isAuditing?: boolean;
}

export const ScoreGauge: React.FC<ScoreGaugeProps> = ({ scores, isAuditing }) => {
  const overall = scores?.overall ?? 0;
  const size = 126;
  const strokeWidth = 9;
  const radius = (size - strokeWidth) / 2 - 4;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = scores ? circumference - (overall / 100) * circumference : circumference;

  // Determine status color theme & gradients
  let statusColor = 'var(--accent-red)';
  let glowColor = 'rgba(239, 68, 68, 0.45)';
  let statusLabel = 'Critical';
  let badgeBg = 'var(--accent-red-alpha)';
  let badgeColor = '#fca5a5';

  if (overall >= 80) {
    statusColor = 'var(--accent-green)';
    glowColor = 'rgba(16, 185, 129, 0.45)';
    statusLabel = 'Optimal';
    badgeBg = 'var(--accent-green-alpha)';
    badgeColor = '#6ee7b7';
  } else if (overall >= 50) {
    statusColor = 'var(--accent-amber)';
    glowColor = 'rgba(245, 158, 11, 0.45)';
    statusLabel = 'Needs Fix';
    badgeBg = 'var(--accent-amber-alpha)';
    badgeColor = '#fcd34d';
  }

  return (
    <div
      className="glass-card flex flex-col items-center justify-center gap-3"
      style={{
        padding: '16px 14px',
        marginBottom: 16,
        background: 'linear-gradient(180deg, rgba(25, 25, 42, 0.7) 0%, rgba(15, 15, 26, 0.8) 100%)',
      }}
    >
      {/* Main Radial Gauge Ring */}
      <div className="flex items-center justify-center" style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <defs>
            <linearGradient id="scoreGreenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
            <linearGradient id="scoreAmberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#f97316" />
            </linearGradient>
            <linearGradient id="scoreRedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#f43f5e" />
            </linearGradient>
          </defs>

          {/* Background Track Circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(255, 255, 255, 0.07)"
            strokeWidth={strokeWidth}
            fill="transparent"
          />

          {/* Animated Progress Stroke */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={overall >= 80 ? 'url(#scoreGreenGrad)' : overall >= 50 ? 'url(#scoreAmberGrad)' : 'url(#scoreRedGrad)'}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={isAuditing ? circumference : strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            style={{
              transition: 'stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
              filter: `drop-shadow(0 0 10px ${glowColor})`,
            }}
          />
        </svg>

        {/* Central Score Display */}
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
              fontSize: 34,
              fontWeight: 800,
              color: scores ? '#ffffff' : 'var(--text-muted)',
              lineHeight: 1,
              letterSpacing: '-1px',
              textShadow: scores ? `0 0 20px ${glowColor}` : 'none',
            }}
          >
            {isAuditing ? '...' : scores ? overall : '--'}
          </span>
          {scores && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: 0.6,
                marginTop: 4,
                padding: '2px 7px',
                borderRadius: 10,
                background: badgeBg,
                color: badgeColor,
                border: `1px solid ${statusColor}44`,
              }}
            >
              {statusLabel}
            </span>
          )}
        </div>
      </div>

      {/* Category Chips 5-Column Grid */}
      {scores && (
        <div
          className="grid grid-cols-5 gap-1"
          style={{
            width: '100%',
            paddingTop: 10,
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div
            className="flex flex-col items-center justify-center"
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: 8,
              padding: '5px 2px',
            }}
          >
            <span style={{ fontSize: 9, color: 'var(--text-secondary)', fontWeight: 600 }}>ACC</span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 800,
                color: scores.accessibility >= 80 ? 'var(--accent-green)' : scores.accessibility >= 50 ? 'var(--accent-amber)' : 'var(--accent-red)',
              }}
            >
              {scores.accessibility}
            </span>
          </div>

          <div
            className="flex flex-col items-center justify-center"
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: 8,
              padding: '5px 2px',
            }}
          >
            <span style={{ fontSize: 9, color: 'var(--text-secondary)', fontWeight: 600 }}>PRIV</span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 800,
                color: scores.privacy >= 80 ? 'var(--accent-green)' : scores.privacy >= 50 ? 'var(--accent-amber)' : 'var(--accent-red)',
              }}
            >
              {scores.privacy}
            </span>
          </div>

          <div
            className="flex flex-col items-center justify-center"
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: 8,
              padding: '5px 2px',
            }}
          >
            <span style={{ fontSize: 9, color: 'var(--text-secondary)', fontWeight: 600 }}>SEC</span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 800,
                color: scores.security >= 80 ? 'var(--accent-green)' : scores.security >= 50 ? 'var(--accent-amber)' : 'var(--accent-red)',
              }}
            >
              {scores.security}
            </span>
          </div>

          <div
            className="flex flex-col items-center justify-center"
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: 8,
              padding: '5px 2px',
            }}
          >
            <span style={{ fontSize: 9, color: 'var(--text-secondary)', fontWeight: 600 }}>SEO</span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 800,
                color: scores.seo >= 80 ? 'var(--accent-green)' : scores.seo >= 50 ? 'var(--accent-amber)' : 'var(--accent-red)',
              }}
            >
              {scores.seo}
            </span>
          </div>

          <div
            className="flex flex-col items-center justify-center"
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: 8,
              padding: '5px 2px',
            }}
          >
            <span style={{ fontSize: 9, color: 'var(--text-secondary)', fontWeight: 600 }}>UX</span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 800,
                color: scores.ux >= 80 ? 'var(--accent-green)' : scores.ux >= 50 ? 'var(--accent-amber)' : 'var(--accent-red)',
              }}
            >
              {scores.ux}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
