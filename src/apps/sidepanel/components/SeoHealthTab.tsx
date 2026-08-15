import React from 'react';
import { AuditSession } from '@shared/types';
import { IssueCard } from './IssueCard';

interface SeoHealthTabProps {
  session: AuditSession | null;
  onHighlight: (selector: string) => void;
}

export const SeoHealthTab: React.FC<SeoHealthTabProps> = ({ session, onHighlight }) => {
  if (!session) {
    return (
      <div className="glass-card flex items-center justify-center" style={{ padding: 24, textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Run an audit to view Technical SEO & Health data.</p>
      </div>
    );
  }

  const seoMetadata = session.insights?.seoMetadata;
  const headingsCount = session.insights?.headingsCount;
  const seoIssues = session.issues.filter((i) => i.category === 'seo');

  return (
    <div className="flex flex-col gap-3 animate-fade-in">
      {/* Technical Meta Tags Overview Table */}
      {seoMetadata && (
        <div className="glass-card flex flex-col gap-2" style={{ padding: 12 }}>
          <h4 style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-blue)', textTransform: 'uppercase' }}>
            Technical Page Metadata
          </h4>

          <div className="flex flex-col gap-2" style={{ fontSize: 11, marginTop: 4 }}>
            {/* Title */}
            <div className="flex flex-col gap-1" style={{ background: 'rgba(255,255,255,0.02)', padding: 8, borderRadius: 6 }}>
              <div className="flex items-center justify-between">
                <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Page Title:</span>
                <span className={`badge ${seoMetadata.titleLength >= 30 && seoMetadata.titleLength <= 60 ? 'badge-success' : 'badge-warning'}`}>
                  {seoMetadata.titleLength} chars
                </span>
              </div>
              <p style={{ color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                {seoMetadata.title || '⚠️ Missing <title> tag'}
              </p>
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1" style={{ background: 'rgba(255,255,255,0.02)', padding: 8, borderRadius: 6 }}>
              <div className="flex items-center justify-between">
                <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Meta Description:</span>
                <span className={`badge ${seoMetadata.descriptionLength >= 70 && seoMetadata.descriptionLength <= 160 ? 'badge-success' : 'badge-warning'}`}>
                  {seoMetadata.descriptionLength} chars
                </span>
              </div>
              <p style={{ color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                {seoMetadata.description || '⚠️ Missing meta description'}
              </p>
            </div>

            {/* Canonical & Viewport */}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1" style={{ background: 'rgba(255,255,255,0.02)', padding: 6, borderRadius: 6 }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: 10 }}>Canonical Tag:</span>
                <span style={{ fontWeight: 600, color: seoMetadata.canonical ? 'var(--accent-green)' : 'var(--accent-amber)' }}>
                  {seoMetadata.canonical ? '✓ Configured' : '❌ Absent'}
                </span>
              </div>

              <div className="flex flex-col gap-1" style={{ background: 'rgba(255,255,255,0.02)', padding: 6, borderRadius: 6 }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: 10 }}>Mobile Viewport:</span>
                <span style={{ fontWeight: 600, color: seoMetadata.hasViewport ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                  {seoMetadata.hasViewport ? '✓ Present' : '❌ Missing'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Headings Hierarchy Outline Card */}
      {headingsCount && (
        <div className="glass-card flex flex-col gap-2" style={{ padding: 12 }}>
          <h4 style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
            Headings Structure Outline
          </h4>
          <div className="grid grid-cols-6 gap-1" style={{ textAlign: 'center', fontSize: 11, marginTop: 2 }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: 6, borderRadius: 6 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 9 }}>H1</span>
              <p style={{ fontWeight: 700, color: headingsCount.h1 === 1 ? 'var(--accent-green)' : 'var(--accent-amber)' }}>{headingsCount.h1}</p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: 6, borderRadius: 6 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 9 }}>H2</span>
              <p style={{ fontWeight: 700 }}>{headingsCount.h2}</p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: 6, borderRadius: 6 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 9 }}>H3</span>
              <p style={{ fontWeight: 700 }}>{headingsCount.h3}</p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: 6, borderRadius: 6 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 9 }}>H4</span>
              <p style={{ fontWeight: 700 }}>{headingsCount.h4}</p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: 6, borderRadius: 6 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 9 }}>H5</span>
              <p style={{ fontWeight: 700 }}>{headingsCount.h5}</p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: 6, borderRadius: 6 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 9 }}>H6</span>
              <p style={{ fontWeight: 700 }}>{headingsCount.h6}</p>
            </div>
          </div>
        </div>
      )}

      {/* SEO Findings List */}
      <div className="flex flex-col gap-2">
        <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
          SEO Audit Violations ({seoIssues.length})
        </h4>
        {seoIssues.length === 0 ? (
          <div className="glass-card flex items-center justify-center" style={{ padding: 20, textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: 'var(--accent-green)', fontWeight: 600 }}>
              🎉 Technical SEO metadata checks passed cleanly!
            </p>
          </div>
        ) : (
          seoIssues.map((issue) => (
            <IssueCard key={issue.id} issue={issue} onHighlight={onHighlight} />
          ))
        )}
      </div>
    </div>
  );
};
