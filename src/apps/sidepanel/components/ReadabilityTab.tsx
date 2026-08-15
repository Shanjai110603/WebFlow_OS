import React from 'react';
import { AuditSession } from '@shared/types';
import { IssueCard } from './IssueCard';

interface ReadabilityTabProps {
  session: AuditSession | null;
  onHighlight: (selector: string) => void;
}

export const ReadabilityTab: React.FC<ReadabilityTabProps> = ({ session, onHighlight }) => {
  if (!session) {
    return (
      <div className="glass-card flex items-center justify-center" style={{ padding: 24, textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Run an audit to view UX & Readability findings.</p>
      </div>
    );
  }

  const uxIssues = session.issues.filter((i) => i.category === 'ux' || i.category === 'readability');

  return (
    <div className="flex flex-col gap-3 animate-fade-in">
      {/* UX Score Header */}
      <div className="glass-card flex items-center justify-between" style={{ padding: 12 }}>
        <div>
          <h3 style={{ fontSize: 13, fontWeight: 700 }}>📖 UX & Readability Diagnostics</h3>
          <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
            Layout clutter, font sizing, line lengths & touch targets
          </p>
        </div>
        <span
          className="badge"
          style={{
            background: 'var(--accent-amber-alpha)',
            color: 'var(--accent-amber)',
            fontSize: 12,
            padding: '4px 10px',
          }}
        >
          Score: {session.scores.ux}
        </span>
      </div>

      {/* UX Issues List */}
      <div className="flex flex-col gap-2">
        {uxIssues.length === 0 ? (
          <div className="glass-card flex items-center justify-center" style={{ padding: 24, textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: 'var(--accent-green)', fontWeight: 600 }}>
              🎉 Page satisfies all UX typography & layout clutter rules!
            </p>
          </div>
        ) : (
          uxIssues.map((issue) => (
            <IssueCard key={issue.id} issue={issue} onHighlight={onHighlight} />
          ))
        )}
      </div>
    </div>
  );
};
