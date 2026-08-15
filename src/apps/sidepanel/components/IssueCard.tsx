import React, { useState } from 'react';
import { AuditIssue } from '@shared/types';

interface IssueCardProps {
  issue: AuditIssue;
  onHighlight?: (selector: string) => void;
  isHighlighted?: boolean;
}

export const IssueCard: React.FC<IssueCardProps> = ({ issue, onHighlight, isHighlighted = false }) => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const getBadgeClass = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'badge-critical';
      case 'warning':
        return 'badge-warning';
      default:
        return 'badge-info';
    }
  };

  const primarySelector = issue.locator?.primarySelector || issue.locator?.xpath || '';

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`glass-card flex flex-col gap-2 ${isHighlighted ? 'btn-active' : ''}`}
      style={{
        borderRadius: 12,
        padding: 12,
        marginBottom: 10,
        borderColor: isHighlighted ? 'var(--accent-purple)' : undefined,
      }}
    >
      {/* Header Row */}
      <div className="flex items-start justify-between gap-2" style={{ cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
        <div className="flex flex-col gap-1" style={{ flex: 1 }}>
          <div className="flex items-center gap-2">
            <span className={`badge ${getBadgeClass(issue.severity)}`}>
              {issue.severity}
            </span>
            <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 500 }}>
              {issue.subcategory}
            </span>
            {issue.confidence && (
              <span className="badge badge-info" style={{ fontSize: 8 }}>
                {issue.confidence}
              </span>
            )}
          </div>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
            {issue.title}
          </h4>
        </div>
        <span style={{ fontSize: 14, color: 'var(--text-secondary)', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'var(--transition-fast)' }}>
          ▼
        </span>
      </div>

      {/* Description Snippet */}
      <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
        {issue.description}
      </p>

      {/* Selector Line */}
      {primarySelector && (
        <div className="flex items-center justify-between gap-2" style={{ marginTop: 4 }}>
          <code className="code-block" style={{ flex: 1, fontSize: 10, padding: '4px 8px' }}>
            {primarySelector}
          </code>
          {onHighlight && (
            <button
              className={`btn ${isHighlighted ? 'btn-red' : 'btn-secondary'}`}
              onClick={(e) => {
                e.stopPropagation();
                onHighlight(primarySelector);
              }}
              style={{ padding: '4px 8px', fontSize: 10, borderRadius: 6 }}
              title="Highlight element on target page"
            >
              {isHighlighted ? '📍 Clear Spotlight' : '📍 Spotlight'}
            </button>
          )}
        </div>
      )}

      {/* Expanded Details */}
      {expanded && (
        <div className="flex flex-col gap-2 animate-fade-in" style={{ paddingTop: 8, borderTop: '1px dashed var(--border-color)', marginTop: 6 }}>
          {issue.whyItMatters && (
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent-amber)', textTransform: 'uppercase' }}>Why It Matters</p>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{issue.whyItMatters}</p>
            </div>
          )}

          {issue.remediation && (
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent-green)', textTransform: 'uppercase' }}>Suggested Remediation</p>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{issue.remediation}</p>
            </div>
          )}

          {issue.evidence && (
            <div>
              <div className="flex items-center justify-between">
                <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent-purple)', textTransform: 'uppercase' }}>HTML Evidence Snippet</p>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleCopy(issue.evidence || '')}
                  style={{ padding: '2px 6px', fontSize: 9 }}
                >
                  {copied ? '✓ Copied' : '📋 Copy'}
                </button>
              </div>
              <pre className="code-block" style={{ marginTop: 4, maxHeight: 120 }}>
                {issue.evidence}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
