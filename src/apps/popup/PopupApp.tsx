import React, { useState, useEffect } from 'react';
import { FixerState, AuditSession } from '@shared/types';
import { DEFAULT_FIXER_STATE } from '@shared/constants';
import { ReportEngine } from '@domain/report-engine';

export const PopupApp: React.FC = () => {
  const [tab, setTab] = useState<chrome.tabs.Tab | null>(null);
  const [settings, setSettings] = useState<FixerState>(DEFAULT_FIXER_STATE);
  const [session, setSession] = useState<AuditSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [auditing, setAuditing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // 1. Fetch active browser tab details
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError || !tabs || tabs.length === 0) {
        setErrorMsg('Could not detect active browser tab.');
        setLoading(false);
        return;
      }

      const activeTab = tabs[0];
      setTab(activeTab);

      if (!activeTab.id || !activeTab.url || activeTab.url.startsWith('chrome://')) {
        setErrorMsg('WebLens cannot run on browser system pages.');
        setLoading(false);
        return;
      }

      const tabId = activeTab.id;

      // 2. Fetch fixer settings & existing audit session
      refreshData(tabId);
    });
  }, []);

  const refreshData = (tabId: number) => {
    chrome.runtime.sendMessage(
      { type: 'GET_FIXER_SETTINGS', payload: { tabId } },
      (res) => {
        if (res && res.success && res.data) {
          setSettings(res.data);
        }

        chrome.runtime.sendMessage(
          { type: 'GET_AUDIT', payload: { tabId } },
          (auditRes) => {
            if (auditRes && auditRes.success && auditRes.data) {
              setSession(auditRes.data);
            }
            setLoading(false);
          }
        );
      }
    );
  };

  const handleRunAudit = () => {
    if (!tab || !tab.id) return;
    setAuditing(true);

    chrome.runtime.sendMessage(
      { type: 'RUN_AUDIT', payload: { tabId: tab.id, scanProfile: 'full' } },
      (res) => {
        setAuditing(false);
        if (res && res.success && res.data) {
          setSession(res.data);
        }
      }
    );
  };

  const handleToggle = (key: keyof Omit<FixerState, 'version' | 'typography' | 'lastUpdatedAt'>) => {
    if (!tab || !tab.id) return;
    const tabId = tab.id;

    const nextState = {
      ...settings,
      enabled: true,
      [key]: !settings[key],
    };

    if (!nextState.darkMode && !nextState.focusMode && !nextState.hideSticky && !nextState.readerMode) {
      nextState.enabled = false;
    }

    setSettings(nextState);

    chrome.runtime.sendMessage(
      { type: 'APPLY_FIXER_SETTINGS', payload: { tabId, settings: nextState } },
      (res) => {
        if (!res || !res.success) {
          console.error('Failed to apply settings:', res?.error?.message);
        }
      }
    );
  };

  const handleOpenSidePanel = () => {
    if (!tab || !tab.id) return;
    const tabId = tab.id;

    chrome.sidePanel.open({ tabId }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error opening side panel:', chrome.runtime.lastError.message);
      } else {
        window.close();
      }
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center animate-fade-in" style={{ width: 360, height: 240, padding: 24 }}>
        <div className="spinner" style={{ width: 32, height: 32, border: '3px solid var(--border-color)', borderTopColor: 'var(--accent-purple)', borderRadius: '50%' }}></div>
        <p style={{ marginTop: 14, color: 'var(--text-secondary)', fontWeight: 600, fontSize: 12 }}>Mounting WebLens Pocket View...</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="flex flex-col items-center justify-center animate-fade-in" style={{ width: 360, padding: 24, textAlign: 'center' }}>
        <span style={{ fontSize: 38 }}>⚠️</span>
        <p style={{ marginTop: 12, fontWeight: 700, color: 'var(--accent-red)', fontSize: 13 }}>{errorMsg}</p>
        <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>Please open a standard HTTP or HTTPS webpage.</p>
      </div>
    );
  }

  const hostname = tab?.url ? new URL(tab.url).hostname : 'Target Webpage';
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
  const overallScore = session?.scores?.overall;

  // Mini gauge calculations
  const gaugeSize = 64;
  const strokeWidth = 5;
  const radius = (gaugeSize - strokeWidth) / 2 - 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = overallScore !== undefined ? circumference - (overallScore / 100) * circumference : circumference;

  let statusColor = 'var(--accent-amber)';
  let glowColor = 'rgba(245, 158, 11, 0.4)';
  if (overallScore !== undefined) {
    if (overallScore >= 80) {
      statusColor = 'var(--accent-green)';
      glowColor = 'rgba(16, 185, 129, 0.4)';
    } else if (overallScore < 50) {
      statusColor = 'var(--accent-red)';
      glowColor = 'rgba(239, 68, 68, 0.4)';
    }
  }

  const handleGenerateReport = () => {
    if (!session) {
      alert('Please run a page audit first.');
      return;
    }

    const openPdfReport = (htmlContent: string) => {
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    };

    chrome.runtime.sendMessage(
      { type: 'EXPORT_REPORT', payload: { id: session.id, tabId: tab?.id, session, format: 'pdf' } },
      (res) => {
        if (res && res.success && res.data) {
          openPdfReport(res.data);
        } else {
          try {
            const htmlContent = ReportEngine.compilePDF(session);
            openPdfReport(htmlContent);
          } catch (err) {
            alert('Failed to generate PDF report.');
          }
        }
      }
    );
  };

  return (
    <div
      className="flex flex-col animate-fade-in"
      style={{
        width: 360,
        padding: 16,
        gap: 14,
        background: 'linear-gradient(180deg, rgba(16, 16, 28, 0.98) 0%, rgba(10, 10, 18, 0.98) 100%)',
        color: '#f8fafc',
      }}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between" style={{ paddingBottom: 10, borderBottom: '1px solid var(--border-color)' }}>
        <div className="flex items-center gap-2" style={{ overflow: 'hidden' }}>
          <img
            src={faviconUrl}
            alt=""
            style={{ width: 18, height: 18, borderRadius: 4 }}
            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
          />
          <div style={{ overflow: 'hidden' }}>
            <div className="flex items-center gap-1">
              <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 14, fontWeight: 800, letterSpacing: '-0.3px', lineHeight: 1.1 }}>
                WebLens OS
              </h1>
              <span className="badge badge-info" style={{ fontSize: 8, padding: '1px 4px' }}>v1.5</span>
            </div>
            <p style={{ fontSize: 10, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
              {hostname}
            </p>
          </div>
        </div>

        {tab?.url?.startsWith('https:') ? (
          <span className="badge badge-success" style={{ fontSize: 9 }}>🔒 HTTPS</span>
        ) : (
          <span className="badge badge-critical" style={{ fontSize: 9 }}>⚠️ HTTP</span>
        )}
      </div>

      {/* Mini Score Hero Card */}
      <div
        className="glass-card flex flex-col gap-3"
        style={{
          padding: 12,
          background: 'linear-gradient(135deg, rgba(25, 25, 45, 0.8) 0%, rgba(18, 18, 32, 0.8) 100%)',
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Page Health Score
            </span>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: '#ffffff', marginTop: 2 }}>
              {auditing ? 'Scanning Webpage...' : session ? `${session.issues.length} Findings Identified` : 'No Audit Run Yet'}
            </h2>
          </div>

          {/* SVG Mini Dial */}
          <div style={{ position: 'relative', width: gaugeSize, height: gaugeSize }}>
            <svg width={gaugeSize} height={gaugeSize} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
              <circle cx={gaugeSize / 2} cy={gaugeSize / 2} r={radius} stroke="rgba(255, 255, 255, 0.08)" strokeWidth={strokeWidth} fill="transparent" />
              <circle
                cx={gaugeSize / 2}
                cy={gaugeSize / 2}
                r={radius}
                stroke={statusColor}
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={auditing ? circumference : strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                style={{
                  transition: 'stroke-dashoffset 1s ease',
                  filter: `drop-shadow(0 0 6px ${glowColor})`,
                }}
              />
            </svg>

            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: gaugeSize,
                height: gaugeSize,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: 16,
                fontFamily: 'var(--font-heading)',
                color: '#ffffff',
              }}
            >
              {auditing ? '...' : overallScore !== undefined ? overallScore : '--'}
            </div>
          </div>
        </div>

        {/* Quick Category Chips Preview */}
        {session?.scores && (
          <div className="grid grid-cols-5 gap-1" style={{ paddingTop: 8, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div className="flex flex-col items-center justify-center" style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: 6, padding: '3px 1px' }}>
              <span style={{ fontSize: 8, color: 'var(--text-secondary)' }}>ACC</span>
              <span style={{ fontSize: 10, fontWeight: 800, color: session.scores.accessibility >= 80 ? 'var(--accent-green)' : 'var(--accent-amber)' }}>
                {session.scores.accessibility}
              </span>
            </div>

            <div className="flex flex-col items-center justify-center" style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: 6, padding: '3px 1px' }}>
              <span style={{ fontSize: 8, color: 'var(--text-secondary)' }}>PRIV</span>
              <span style={{ fontSize: 10, fontWeight: 800, color: session.scores.privacy >= 80 ? 'var(--accent-green)' : 'var(--accent-amber)' }}>
                {session.scores.privacy}
              </span>
            </div>

            <div className="flex flex-col items-center justify-center" style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: 6, padding: '3px 1px' }}>
              <span style={{ fontSize: 8, color: 'var(--text-secondary)' }}>SEC</span>
              <span style={{ fontSize: 10, fontWeight: 800, color: session.scores.security >= 80 ? 'var(--accent-green)' : 'var(--accent-amber)' }}>
                {session.scores.security}
              </span>
            </div>

            <div className="flex flex-col items-center justify-center" style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: 6, padding: '3px 1px' }}>
              <span style={{ fontSize: 8, color: 'var(--text-secondary)' }}>SEO</span>
              <span style={{ fontSize: 10, fontWeight: 800, color: session.scores.seo >= 80 ? 'var(--accent-green)' : 'var(--accent-amber)' }}>
                {session.scores.seo}
              </span>
            </div>

            <div className="flex flex-col items-center justify-center" style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: 6, padding: '3px 1px' }}>
              <span style={{ fontSize: 8, color: 'var(--text-secondary)' }}>UX</span>
              <span style={{ fontSize: 10, fontWeight: 800, color: session.scores.ux >= 80 ? 'var(--accent-green)' : 'var(--accent-amber)' }}>
                {session.scores.ux}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Visitor Overrides */}
      <div className="flex flex-col gap-2">
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Visitor Preferences
        </span>

        <div className="glass-card flex items-center justify-between" style={{ padding: '8px 12px' }}>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 15 }}>🌙</span>
            <div>
              <p style={{ fontWeight: 600, fontSize: 11 }}>Dark Mode Override</p>
              <p style={{ fontSize: 9, color: 'var(--text-secondary)' }}>Contrast-preserving dark theme</p>
            </div>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={settings.enabled && settings.darkMode}
              onChange={() => handleToggle('darkMode')}
            />
            <span className="slider"></span>
          </label>
        </div>

        <div className="glass-card flex items-center justify-between" style={{ padding: '8px 12px' }}>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 15 }}>🎯</span>
            <div>
              <p style={{ fontWeight: 600, fontSize: 11 }}>Focus Mode</p>
              <p style={{ fontSize: 9, color: 'var(--text-secondary)' }}>Dim non-essential sidebars</p>
            </div>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={settings.enabled && settings.focusMode}
              onChange={() => handleToggle('focusMode')}
            />
            <span className="slider"></span>
          </label>
        </div>

        <div className="glass-card flex items-center justify-between" style={{ padding: '8px 12px' }}>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 15 }}>🧹</span>
            <div>
              <p style={{ fontWeight: 600, fontSize: 11 }}>Clean Layout</p>
              <p style={{ fontSize: 9, color: 'var(--text-secondary)' }}>Hide sticky banners & ads</p>
            </div>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={settings.enabled && settings.hideSticky}
              onChange={() => handleToggle('hideSticky')}
            />
            <span className="slider"></span>
          </label>
        </div>

        <div className="glass-card flex items-center justify-between" style={{ padding: '8px 12px' }}>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 15 }}>📖</span>
            <div>
              <p style={{ fontWeight: 600, fontSize: 11 }}>Reader Mode</p>
              <p style={{ fontSize: 9, color: 'var(--text-secondary)' }}>Distraction-free article view</p>
            </div>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={settings.enabled && !!settings.readerMode}
              onChange={() => handleToggle('readerMode')}
            />
            <span className="slider"></span>
          </label>
        </div>
      </div>

      {/* Action Buttons Bar */}
      <div className="flex gap-2" style={{ marginTop: 2 }}>
        <button
          className="btn btn-secondary"
          onClick={handleGenerateReport}
          disabled={!session}
          style={{ flex: 1, padding: '9px 8px', fontSize: 10 }}
        >
          📄 Report
        </button>

        <button
          className="btn btn-secondary"
          onClick={handleRunAudit}
          disabled={auditing}
          style={{ flex: 1, padding: '9px 8px', fontSize: 10 }}
        >
          {auditing ? '⚡ Scan...' : '⚡ Audit'}
        </button>

        <button
          className="btn"
          onClick={handleOpenSidePanel}
          style={{ flex: 1.2, padding: '9px 8px', fontSize: 10 }}
        >
          <span>🛠️</span> Workspace
        </button>
      </div>
    </div>
  );
};
