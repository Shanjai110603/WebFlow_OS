import React from 'react';
import { AuditSession, AuditIssue } from '@shared/types';
import { IssueCard } from './IssueCard';

interface DashboardTabProps {
  session: AuditSession | null;
  onHighlight: (selector: string) => void;
  onTabChange: (tab: any) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  session,
  onHighlight,
  onTabChange,
}) => {
  if (!session) {
    return (
      <div className="glass-card flex flex-col items-center justify-center gap-3" style={{ padding: 32, textAlign: 'center' }}>
        <span style={{ fontSize: 36 }}>🔍</span>
        <h3 style={{ fontSize: 15, fontWeight: 700 }}>No Audit Executed Yet</h3>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          Click "Run Audit" in the top bar to analyze this webpage for accessibility, privacy, security, SEO, and UX issues.
        </p>
      </div>
    );
  }

  const criticalCount = session.issues.filter((i) => i.severity === 'critical').length;
  const warningCount = session.issues.filter((i) => i.severity === 'warning').length;
  const topIssues: AuditIssue[] = session.issues.slice(0, 3);
  const insights = session.insights;

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* Category Score Cards Grid */}
      <div className="grid grid-cols-2 gap-2">
        <div
          className="glass-card flex flex-col gap-1"
          style={{ cursor: 'pointer', padding: 12 }}
          onClick={() => onTabChange('accessibility')}
        >
          <div className="flex items-center justify-between">
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>♿ Accessibility</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: session.scores.accessibility >= 80 ? 'var(--accent-green)' : 'var(--accent-amber)' }}>
              {session.scores.accessibility}
            </span>
          </div>
          <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            {session.issues.filter((i) => i.category === 'accessibility').length} violations found
          </p>
        </div>

        <div
          className="glass-card flex flex-col gap-1"
          style={{ cursor: 'pointer', padding: 12 }}
          onClick={() => onTabChange('privacy-security')}
        >
          <div className="flex items-center justify-between">
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>🔒 Privacy & Sec</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: session.scores.privacy >= 80 ? 'var(--accent-green)' : 'var(--accent-amber)' }}>
              {Math.round((session.scores.privacy + session.scores.security) / 2)}
            </span>
          </div>
          <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            {session.issues.filter((i) => i.category === 'privacy' || i.category === 'security').length} risk signals
          </p>
        </div>

        <div
          className="glass-card flex flex-col gap-1"
          style={{ cursor: 'pointer', padding: 12 }}
          onClick={() => onTabChange('seo')}
        >
          <div className="flex items-center justify-between">
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>🔍 SEO & Health</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: session.scores.seo >= 80 ? 'var(--accent-green)' : 'var(--accent-amber)' }}>
              {session.scores.seo}
            </span>
          </div>
          <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            {session.issues.filter((i) => i.category === 'seo').length} meta warnings
          </p>
        </div>

        <div
          className="glass-card flex flex-col gap-1"
          style={{ cursor: 'pointer', padding: 12 }}
          onClick={() => onTabChange('ux')}
        >
          <div className="flex items-center justify-between">
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>📖 Readability</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: session.scores.ux >= 80 ? 'var(--accent-green)' : 'var(--accent-amber)' }}>
              {session.scores.ux}
            </span>
          </div>
          <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            {session.issues.filter((i) => i.category === 'ux' || i.category === 'readability').length} UX observations
          </p>
        </div>
      </div>

      {/* Page Structural Stats Grid */}
      {insights && (
        <div className="glass-card flex flex-col gap-2" style={{ padding: 12 }}>
          <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: 0.5 }}>
            Structural Page Insights
          </h3>
          <div className="grid grid-cols-3 gap-2" style={{ marginTop: 4 }}>
            <div className="flex flex-col items-center" style={{ background: 'rgba(255,255,255,0.03)', padding: 8, borderRadius: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--accent-purple-hover)' }}>{insights.imagesCount.total}</span>
              <span style={{ fontSize: 9, color: 'var(--text-secondary)' }}>Images ({insights.imagesCount.missingAlt} no alt)</span>
            </div>
            <div className="flex flex-col items-center" style={{ background: 'rgba(255,255,255,0.03)', padding: 8, borderRadius: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--accent-cyan)' }}>{insights.formsCount.total}</span>
              <span style={{ fontSize: 9, color: 'var(--text-secondary)' }}>Forms ({insights.formsCount.unlabeled} unlabeled)</span>
            </div>
            <div className="flex flex-col items-center" style={{ background: 'rgba(255,255,255,0.03)', padding: 8, borderRadius: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--accent-amber)' }}>{insights.trackersSummary.total}</span>
              <span style={{ fontSize: 9, color: 'var(--text-secondary)' }}>Trackers Detected</span>
            </div>
          </div>
        </div>
      )}

      {/* Priority Quick Wins Section */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>⚡ Priority Quick Wins</h3>
          <div className="flex gap-2">
            <span className="badge badge-critical">{criticalCount} Critical</span>
            <span className="badge badge-warning">{warningCount} Warning</span>
          </div>
        </div>

        {topIssues.length === 0 ? (
          <div className="glass-card flex items-center justify-center" style={{ padding: 20, textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: 'var(--accent-green)', fontWeight: 600 }}>🎉 No critical issues detected!</p>
          </div>
        ) : (
          topIssues.map((issue) => (
            <IssueCard key={issue.id} issue={issue} onHighlight={onHighlight} />
          ))
        )}
      </div>
    </div>
  );
};
