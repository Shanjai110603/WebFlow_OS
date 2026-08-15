import React, { useState } from 'react';
import { ScanProfileType } from '@shared/types';

interface HeaderProps {
  domain: string;
  url: string;
  scanProfile: ScanProfileType;
  onProfileChange: (profile: ScanProfileType) => void;
  onReAudit: () => void;
  onGenerateReport?: (format: 'md' | 'json' | 'csv') => void;
  isAuditing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  domain,
  url,
  scanProfile,
  onProfileChange,
  onReAudit,
  onGenerateReport,
  isAuditing,
}) => {
  const [showReportMenu, setShowReportMenu] = useState(false);
  const isSecure = url.startsWith('https:');

  return (
    <div
      className="glass-card flex flex-col gap-3"
      style={{
        borderRadius: 16,
        padding: '14px 16px',
        marginBottom: 16,
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      {/* Top Title Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="flex items-center justify-center"
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(6, 182, 212, 0.2))',
              border: '1px solid rgba(139, 92, 246, 0.4)',
              fontSize: 18,
            }}
          >
            👁️
          </div>
          <div>
            <h1
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 16,
                fontWeight: 800,
                letterSpacing: '-0.3px',
                lineHeight: 1.1,
                background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              WebLens OS
            </h1>
            <p
              style={{
                fontSize: 11,
                color: 'var(--text-secondary)',
                maxWidth: 160,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontWeight: 500,
              }}
            >
              {domain || 'No Active Tab'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Security Indicator Pill */}
          {isSecure ? (
            <span className="badge badge-success" style={{ fontSize: 10 }}>
              🔒 HTTPS
            </span>
          ) : (
            <span className="badge badge-critical" style={{ fontSize: 10 }}>
              ⚠️ HTTP
            </span>
          )}
        </div>
      </div>

      {/* Controls Bar: Preset, Report Generator & Audit Button */}
      <div className="flex items-center gap-2" style={{ position: 'relative' }}>
        <select
          value={scanProfile}
          onChange={(e) => onProfileChange(e.target.value as ScanProfileType)}
          className="form-control"
          style={{
            flex: 1,
            padding: '7px 8px',
            fontSize: 11,
            background: 'rgba(15, 15, 26, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 8,
          }}
        >
          <option value="full">⚡ Full Audit Profile</option>
          <option value="quick">🚀 Quick Scan Profile</option>
          <option value="accessibility">♿ Accessibility Profile</option>
          <option value="privacy">🛡️ Privacy Profile</option>
          <option value="security">🔒 Security Profile</option>
          <option value="seo">🔍 SEO & Health Profile</option>
          <option value="ux">📖 UX & Readability Profile</option>
        </select>

        {onGenerateReport && (
          <div style={{ position: 'relative' }}>
            <button
              className="btn btn-secondary"
              onClick={() => setShowReportMenu(!showReportMenu)}
              style={{
                padding: '7px 10px',
                fontSize: 11,
                borderRadius: 8,
                whiteSpace: 'nowrap',
              }}
              title="Generate Audit Report"
            >
              📄 Report ▼
            </button>

            {showReportMenu && (
              <div
                className="glass-card flex flex-col gap-1 animate-fade-in"
                style={{
                  position: 'absolute',
                  top: '110%',
                  right: 0,
                  zIndex: 100,
                  minWidth: 160,
                  padding: 6,
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
                }}
              >
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    onGenerateReport('md');
                    setShowReportMenu(false);
                  }}
                  style={{ justifyContent: 'flex-start', padding: '6px 10px', fontSize: 11 }}
                >
                  📝 Markdown (.md)
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    onGenerateReport('csv');
                    setShowReportMenu(false);
                  }}
                  style={{ justifyContent: 'flex-start', padding: '6px 10px', fontSize: 11 }}
                >
                  📊 CSV Spreadsheet
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    onGenerateReport('json');
                    setShowReportMenu(false);
                  }}
                  style={{ justifyContent: 'flex-start', padding: '6px 10px', fontSize: 11 }}
                >
                  ⚙️ Raw JSON
                </button>
              </div>
            )}
          </div>
        )}

        <button
          className="btn"
          onClick={onReAudit}
          disabled={isAuditing}
          style={{
            padding: '7px 12px',
            fontSize: 11,
            borderRadius: 8,
            whiteSpace: 'nowrap',
          }}
        >
          {isAuditing ? (
            <>
              <span className="spinner">🌀</span> Scanning...
            </>
          ) : (
            <>
              <span>🔍</span> Run Audit
            </>
          )}
        </button>
      </div>
    </div>
  );
};
