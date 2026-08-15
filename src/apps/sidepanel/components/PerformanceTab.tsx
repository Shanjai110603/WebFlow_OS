import React from 'react';
import { AuditSession } from '@shared/types';
import { IssueCard } from './IssueCard';

interface PerformanceTabProps {
  session: AuditSession | null;
  onHighlight: (selector: string) => void;
}

export const PerformanceTab: React.FC<PerformanceTabProps> = ({ session, onHighlight }) => {
  if (!session) {
    return (
      <div className="glass-card flex flex-col items-center justify-center gap-3" style={{ padding: 32, textAlign: 'center' }}>
        <span style={{ fontSize: 36 }}>⚡</span>
        <h3 style={{ fontSize: 15, fontWeight: 700 }}>No Performance Audit Run</h3>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          Run an audit to analyze Core Web Vitals, Cumulative Layout Shift (CLS), render-blocking scripts, and DOM budget.
        </p>
      </div>
    );
  }

  const perfIssues = session.issues.filter(
    (i) =>
      i.category === 'performance' ||
      i.ruleId === 'unsized-media-cls' ||
      i.ruleId === 'render-blocking-scripts' ||
      i.ruleId === 'excessive-dom-budget' ||
      i.ruleId === 'lazy-loading-images'
  );

  const perfScore = session.scores.performance ?? 100;
  let statusColor = 'var(--accent-green)';
  let statusLabel = 'Optimal';
  if (perfScore < 50) {
    statusColor = 'var(--accent-red)';
    statusLabel = 'Critical';
  } else if (perfScore < 80) {
    statusColor = 'var(--accent-amber)';
    statusLabel = 'Needs Improvement';
  }

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* Category Header Card */}
      <div
        className="glass-card flex items-center justify-between"
        style={{
          padding: 16,
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(6, 182, 212, 0.1) 100%)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center"
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: 'rgba(16, 185, 129, 0.2)',
              fontSize: 22,
            }}
          >
            ⚡
          </div>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: '#ffffff' }}>Performance & Core Web Vitals</h3>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              PageSpeed Lighthouse 10+ Vitals Audit
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end">
          <span style={{ fontSize: 24, fontWeight: 800, color: statusColor, lineHeight: 1 }}>
            {perfScore}/100
          </span>
          <span className="badge" style={{ fontSize: 9, marginTop: 4, background: 'rgba(255,255,255,0.1)', color: statusColor }}>
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Vitals Diagnostics Overview Grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="glass-card flex flex-col gap-1" style={{ padding: 12 }}>
          <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 600 }}>CLS (Layout Shift)</span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: session.issues.some((i) => i.ruleId === 'unsized-media-cls') ? 'var(--accent-amber)' : 'var(--accent-green)',
            }}
          >
            {session.issues.some((i) => i.ruleId === 'unsized-media-cls') ? '⚠️ Unsized Media' : '🟢 0.0 Shift'}
          </span>
        </div>

        <div className="glass-card flex flex-col gap-1" style={{ padding: 12 }}>
          <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 600 }}>FCP / LCP Blockers</span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: session.issues.some((i) => i.ruleId === 'render-blocking-scripts') ? 'var(--accent-amber)' : 'var(--accent-green)',
            }}
          >
            {session.issues.some((i) => i.ruleId === 'render-blocking-scripts') ? '⚠️ Sync Scripts' : '🟢 Non-Blocking'}
          </span>
        </div>

        <div className="glass-card flex flex-col gap-1" style={{ padding: 12 }}>
          <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 600 }}>DOM Node Budget</span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: session.issues.some((i) => i.ruleId === 'excessive-dom-budget') ? 'var(--accent-red)' : 'var(--accent-green)',
            }}
          >
            {session.issues.some((i) => i.ruleId === 'excessive-dom-budget') ? '🔴 Exceeds Budget' : '🟢 Optimal Size'}
          </span>
        </div>

        <div className="glass-card flex flex-col gap-1" style={{ padding: 12 }}>
          <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 600 }}>Offscreen Images</span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: session.issues.some((i) => i.ruleId === 'lazy-loading-images') ? 'var(--accent-amber)' : 'var(--accent-green)',
            }}
          >
            {session.issues.some((i) => i.ruleId === 'lazy-loading-images') ? '⚠️ Eager Loading' : '🟢 Lazy Loaded'}
          </span>
        </div>
      </div>

      {/* Issues List */}
      <div className="flex flex-col gap-2">
        <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
          Performance Diagnostics & Findings ({perfIssues.length})
        </h3>

        {perfIssues.length === 0 ? (
          <div className="glass-card flex flex-col items-center justify-center gap-2" style={{ padding: 24, textAlign: 'center' }}>
            <span style={{ fontSize: 24 }}>🎉</span>
            <p style={{ fontSize: 12, color: 'var(--accent-green)', fontWeight: 600 }}>
              No performance vulnerabilities or layout shift risks detected on this page!
            </p>
          </div>
        ) : (
          perfIssues.map((issue) => (
            <IssueCard key={issue.id} issue={issue} onHighlight={onHighlight} />
          ))
        )}
      </div>
    </div>
  );
};
