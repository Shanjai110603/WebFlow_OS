import React from 'react';
import { ScoreBreakdown } from '@shared/types';

interface ScoreGaugeProps {
  scores?: ScoreBreakdown;
  isAuditing?: boolean;
}

export const ScoreGauge: React.FC<ScoreGaugeProps> = ({ scores, isAuditing }) => {
  const overall = scores?.overall ?? 0;
  const size = 130;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2 - 2;
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
      className="glass-card flex flex-col items-center justify-center gap-4"
      style={{
        width: '100%',
        padding: '18px 14px 14px 14px',
        marginBottom: 16,
        background: 'linear-gradient(180deg, rgba(22, 22, 38, 0.8) 0%, rgba(14, 14, 24, 0.9) 100%)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 16,
      }}
    >
      {/* Radial Gauge Container (Exact Geometric Centering) */}
      <div
        style={{
          position: 'relative',
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto',
        }}
      >
        <svg
          width={size}
          height={size}
          style={{
            transform: 'rotate(-90deg)',
            display: 'block',
          }}
        >
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

          {/* Inner Fill Backdrop Circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="rgba(255, 255, 255, 0.02)"
          />

          {/* Background Track Circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(255, 255, 255, 0.08)"
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

        {/* Central Score Digit & Status Overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: size,
            height: size,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            pointerEvents: 'none',
            margin: 0,
            padding: 0,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 36,
              fontWeight: 800,
              color: scores ? '#ffffff' : 'var(--text-muted)',
              lineHeight: 0.9,
              letterSpacing: '-1px',
              textShadow: scores ? `0 0 20px ${glowColor}` : 'none',
              marginTop: 2,
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
                letterSpacing: 0.5,
                marginTop: 6,
                padding: '2px 8px',
                borderRadius: 10,
                background: badgeBg,
                color: badgeColor,
                border: `1px solid ${statusColor}44`,
                lineHeight: 1.2,
              }}
            >
              {statusLabel}
            </span>
          )}
        </div>
      </div>

      {/* Category Chips 6-Column Grid */}
      {scores && (
        <div
          className="grid grid-cols-6 gap-1"
          style={{
            width: '100%',
            paddingTop: 12,
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div
            className="flex flex-col items-center justify-center"
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 8,
              padding: '6px 1px',
            }}
          >
            <span style={{ fontSize: 9, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.2px' }}>ACC</span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: scores.accessibility >= 80 ? 'var(--accent-green)' : scores.accessibility >= 50 ? 'var(--accent-amber)' : 'var(--accent-red)',
                marginTop: 2,
              }}
            >
              {scores.accessibility}
            </span>
          </div>

          <div
            className="flex flex-col items-center justify-center"
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 8,
              padding: '6px 1px',
            }}
          >
            <span style={{ fontSize: 9, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.2px' }}>PRIV</span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: scores.privacy >= 80 ? 'var(--accent-green)' : scores.privacy >= 50 ? 'var(--accent-amber)' : 'var(--accent-red)',
                marginTop: 2,
              }}
            >
              {scores.privacy}
            </span>
          </div>

          <div
            className="flex flex-col items-center justify-center"
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 8,
              padding: '6px 1px',
            }}
          >
            <span style={{ fontSize: 9, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.2px' }}>SEC</span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: scores.security >= 80 ? 'var(--accent-green)' : scores.security >= 50 ? 'var(--accent-amber)' : 'var(--accent-red)',
                marginTop: 2,
              }}
            >
              {scores.security}
            </span>
          </div>

          <div
            className="flex flex-col items-center justify-center"
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 8,
              padding: '6px 1px',
            }}
          >
            <span style={{ fontSize: 9, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.2px' }}>SEO</span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: scores.seo >= 80 ? 'var(--accent-green)' : scores.seo >= 50 ? 'var(--accent-amber)' : 'var(--accent-red)',
                marginTop: 2,
              }}
            >
              {scores.seo}
            </span>
          </div>

          <div
            className="flex flex-col items-center justify-center"
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 8,
              padding: '6px 1px',
            }}
          >
            <span style={{ fontSize: 9, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.2px' }}>PERF</span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: (scores.performance ?? 100) >= 80 ? 'var(--accent-green)' : (scores.performance ?? 100) >= 50 ? 'var(--accent-amber)' : 'var(--accent-red)',
                marginTop: 2,
              }}
            >
              {scores.performance ?? 100}
            </span>
          </div>

          <div
            className="flex flex-col items-center justify-center"
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 8,
              padding: '6px 1px',
            }}
          >
            <span style={{ fontSize: 9, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.2px' }}>UX</span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: scores.ux >= 80 ? 'var(--accent-green)' : scores.ux >= 50 ? 'var(--accent-amber)' : 'var(--accent-red)',
                marginTop: 2,
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
