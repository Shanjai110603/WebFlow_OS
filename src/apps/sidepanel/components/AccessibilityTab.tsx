import React, { useState } from 'react';
import { AuditSession } from '@shared/types';
import { IssueCard } from './IssueCard';

interface AccessibilityTabProps {
  session: AuditSession | null;
  onHighlight: (selector: string) => void;
}

export const AccessibilityTab: React.FC<AccessibilityTabProps> = ({ session, onHighlight }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');

  if (!session) {
    return (
      <div className="glass-card flex items-center justify-center" style={{ padding: 24, textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Run an audit to view WCAG Accessibility findings.</p>
      </div>
    );
  }

  const accessibilityIssues = session.issues.filter((i) => {
    const isCategory = i.category === 'accessibility';
    const matchesSearch = i.title.toLowerCase().includes(searchQuery.toLowerCase()) || i.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity = severityFilter === 'all' || i.severity === severityFilter;
    return isCategory && matchesSearch && matchesSeverity;
  });

  return (
    <div className="flex flex-col gap-3 animate-fade-in">
      {/* Header Info */}
      <div className="glass-card flex items-center justify-between" style={{ padding: 12 }}>
        <div>
          <h3 style={{ fontSize: 13, fontWeight: 700 }}>♿ WCAG AA Accessibility Audit</h3>
          <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
            Color contrast, labels, alt text, focus indicators & landmarks
          </p>
        </div>
        <span
          className="badge"
          style={{
            background: 'var(--accent-purple-alpha)',
            color: 'var(--accent-purple-hover)',
            fontSize: 12,
            padding: '4px 10px',
          }}
        >
          Score: {session.scores.accessibility}
        </span>
      </div>

      {/* Filter Controls Bar */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Filter accessibility issues..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="form-control"
          style={{ flex: 1, padding: '6px 10px', fontSize: 11 }}
        />
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value as any)}
          className="form-control"
          style={{ width: 95, padding: '6px 8px', fontSize: 11 }}
        >
          <option value="all">All</option>
          <option value="critical">Critical</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
        </select>
      </div>

      {/* Issues List */}
      <div className="flex flex-col gap-2">
        {accessibilityIssues.length === 0 ? (
          <div className="glass-card flex items-center justify-center" style={{ padding: 24, textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: 'var(--accent-green)', fontWeight: 600 }}>
              🎉 Zero accessibility violations found matching criteria!
            </p>
          </div>
        ) : (
          accessibilityIssues.map((issue) => (
            <IssueCard key={issue.id} issue={issue} onHighlight={onHighlight} />
          ))
        )}
      </div>
    </div>
  );
};
