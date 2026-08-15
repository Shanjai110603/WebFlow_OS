import React from 'react';
import { ScanProfileType } from '@shared/types';

interface HeaderProps {
  domain: string;
  url: string;
  scanProfile: ScanProfileType;
  onProfileChange: (profile: ScanProfileType) => void;
  onReAudit: () => void;
  isAuditing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  domain,
  url,
  scanProfile,
  onProfileChange,
  onReAudit,
  isAuditing,
}) => {
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

      {/* Controls Bar: Preset & Audit Button */}
      <div className="flex items-center gap-2">
        <select
          value={scanProfile}
          onChange={(e) => onProfileChange(e.target.value as ScanProfileType)}
          className="form-control"
          style={{
            flex: 1,
            padding: '7px 10px',
            fontSize: 12,
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

        <button
          className="btn"
          onClick={onReAudit}
          disabled={isAuditing}
          style={{
            padding: '7px 14px',
            fontSize: 12,
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
