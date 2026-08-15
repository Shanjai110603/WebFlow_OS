import React, { useState } from 'react';
import { AuditSession } from '@shared/types';
import { IssueCard } from './IssueCard';

interface PrivacySecurityTabProps {
  session: AuditSession | null;
  onHighlight: (selector: string) => void;
}

export const PrivacySecurityTab: React.FC<PrivacySecurityTabProps> = ({ session, onHighlight }) => {
  const [subTab, setSubTab] = useState<'privacy' | 'security'>('privacy');
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');

  if (!session) {
    return (
      <div className="glass-card flex items-center justify-center" style={{ padding: 24, textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Run an audit to view Privacy & Security findings.</p>
      </div>
    );
  }

  const issues = session.issues.filter((i) => {
    const matchesCategory = subTab === 'privacy' ? i.category === 'privacy' : i.category === 'security';
    const matchesSearch = i.title.toLowerCase().includes(searchQuery.toLowerCase()) || i.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity = severityFilter === 'all' || i.severity === severityFilter;
    return matchesCategory && matchesSearch && matchesSeverity;
  });

  const trackerSummary = session.insights?.trackersSummary;

  return (
    <div className="flex flex-col gap-3 animate-fade-in">
      {/* Sub-tab Pill Switch */}
      <div className="flex items-center gap-1" style={{ background: 'rgba(255,255,255,0.03)', padding: 3, borderRadius: 10, border: '1px solid var(--border-color)' }}>
        <button
          onClick={() => setSubTab('privacy')}
          style={{
            flex: 1,
            padding: '6px 12px',
            fontSize: 11,
            fontWeight: 700,
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
            background: subTab === 'privacy' ? 'var(--accent-indigo)' : 'transparent',
            color: '#fff',
            transition: 'var(--transition-fast)',
          }}
        >
          🛡️ Privacy ({session.issues.filter((i) => i.category === 'privacy').length})
        </button>
        <button
          onClick={() => setSubTab('security')}
          style={{
            flex: 1,
            padding: '6px 12px',
            fontSize: 11,
            fontWeight: 700,
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
            background: subTab === 'security' ? 'var(--accent-purple)' : 'transparent',
            color: '#fff',
            transition: 'var(--transition-fast)',
          }}
        >
          🔒 Security ({session.issues.filter((i) => i.category === 'security').length})
        </button>
      </div>

      {/* Tracker Summary Bar (Privacy Sub-tab) */}
      {subTab === 'privacy' && trackerSummary && (
        <div className="glass-card flex flex-col gap-2" style={{ padding: 12 }}>
          <h4 style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
            Detected Trackers ({trackerSummary.total})
          </h4>
          <div className="grid grid-cols-2 gap-2" style={{ fontSize: 11 }}>
            <div className="flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.02)', padding: 6, borderRadius: 6 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Analytics:</span>
              <span style={{ fontWeight: 700, color: '#38bdf8' }}>{trackerSummary.analytics}</span>
            </div>
            <div className="flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.02)', padding: 6, borderRadius: 6 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Advertising:</span>
              <span style={{ fontWeight: 700, color: '#f43f5e' }}>{trackerSummary.advertising}</span>
            </div>
            <div className="flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.02)', padding: 6, borderRadius: 6 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Social:</span>
              <span style={{ fontWeight: 700, color: '#a855f7' }}>{trackerSummary.social}</span>
            </div>
            <div className="flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.02)', padding: 6, borderRadius: 6 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Utility:</span>
              <span style={{ fontWeight: 700, color: '#10b981' }}>{trackerSummary.utility}</span>
            </div>
          </div>
        </div>
      )}

      {/* Search & Severity Filters */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder={`Search ${subTab} findings...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="form-control"
          style={{ flex: 1, padding: '6px 10px', fontSize: 11 }}
        />
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value as any)}
          className="form-control"
          style={{ width: 90, padding: '6px 8px', fontSize: 11 }}
        >
          <option value="all">All</option>
          <option value="critical">Critical</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
        </select>
      </div>

      {/* Issues List */}
      <div className="flex flex-col gap-2">
        {issues.length === 0 ? (
          <div className="glass-card flex items-center justify-center" style={{ padding: 20, textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: 'var(--accent-green)', fontWeight: 600 }}>
              ✓ No {subTab} issues matching active filters.
            </p>
          </div>
        ) : (
          issues.map((issue) => (
            <IssueCard key={issue.id} issue={issue} onHighlight={onHighlight} />
          ))
        )}
      </div>
    </div>
  );
};
