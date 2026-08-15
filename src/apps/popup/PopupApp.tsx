import React, { useState, useEffect } from 'react';
import { FixerState, AuditSession } from '@shared/types';
import { DEFAULT_FIXER_STATE } from '@shared/constants';

export const PopupApp: React.FC = () => {
  const [tab, setTab] = useState<chrome.tabs.Tab | null>(null);
  const [settings, setSettings] = useState<FixerState>(DEFAULT_FIXER_STATE);
  const [session, setSession] = useState<AuditSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    // 1. Fetch current active tab details
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

      // 2. Fetch active visual settings from background worker
      chrome.runtime.sendMessage(
        { type: 'GET_FIXER_SETTINGS', payload: { tabId } },
        (res) => {
          if (res && res.success && res.data) {
            setSettings(res.data);
          }

          // 3. Fetch latest completed audit score
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
    });
  }, []);

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
      <div className="flex flex-col items-center justify-center animate-fade-in" style={{ width: 360, height: 210, padding: 24 }}>
        <div className="spinner" style={{ width: 28, height: 28, border: '3px solid var(--border-color)', borderTopColor: 'var(--accent-purple)', borderRadius: '50%' }}></div>
        <p style={{ marginTop: 14, color: 'var(--text-secondary)', fontWeight: 600 }}>Loading WebLens status...</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="flex flex-col items-center justify-center animate-fade-in" style={{ width: 360, height: 210, padding: 24, textAlign: 'center' }}>
        <span style={{ fontSize: 36 }}>⚠️</span>
        <p style={{ marginTop: 12, fontWeight: 700, color: 'var(--accent-red)' }}>{errorMsg}</p>
        <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>Please open a standard webpage.</p>
      </div>
    );
  }

  const hostname = tab?.url ? new URL(tab.url).hostname : 'Target Page';
  const overallScore = session?.scores?.overall;

  return (
    <div className="flex flex-col animate-fade-in" style={{ width: 360, padding: 16, gap: 14 }}>
      {/* Header Bar */}
      <div className="flex items-center justify-between" style={{ paddingBottom: 10, borderBottom: '1px solid var(--border-color)' }}>
        <div className="flex items-center gap-2">
          <div
            className="flex items-center justify-center"
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(6, 182, 212, 0.2))',
              border: '1px solid rgba(139, 92, 246, 0.4)',
              fontSize: 16,
            }}
          >
            👁️
          </div>
          <div>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 15, fontWeight: 800, letterSpacing: '-0.3px', lineHeight: 1.1 }}>WebLens OS</h1>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', maxWidth: 170, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
              {hostname}
            </p>
          </div>
        </div>

        {tab?.url?.startsWith('https:') ? (
          <span className="badge badge-success" style={{ fontSize: 9 }}>🔒 Secure</span>
        ) : (
          <span className="badge badge-critical" style={{ fontSize: 9 }}>⚠️ Insecure</span>
        )}
      </div>

      {/* Mini Score Overview Card */}
      <div className="glass-card flex items-center justify-between" style={{ padding: 12 }}>
        <div>
          <h2 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>WebLens Audit Score</h2>
          <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
            {session ? 'Based on latest audit run' : 'Run audit to evaluate'}
          </p>
        </div>
        <div
          className="flex items-center justify-center"
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'var(--bg-tertiary)',
            border: `3px solid ${
              overallScore !== undefined
                ? overallScore >= 80
                  ? 'var(--accent-green)'
                  : overallScore >= 50
                  ? 'var(--accent-amber)'
                  : 'var(--accent-red)'
                : 'var(--border-color)'
            }`,
            fontWeight: 800,
            fontSize: 15,
            color: '#fff',
            boxShadow: overallScore !== undefined ? `0 0 12px ${overallScore >= 80 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}` : 'none',
          }}
        >
          {overallScore !== undefined ? overallScore : '--'}
        </div>
      </div>

      {/* Quick Visitor Controls */}
      <div className="flex flex-col gap-2">
        <h3 style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Visitor Preferences
        </h3>

        <div className="glass-card flex items-center justify-between" style={{ padding: '8px 12px' }}>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 15 }}>🌙</span>
            <div>
              <p style={{ fontWeight: 600, fontSize: 12 }}>Dark Mode Override</p>
              <p style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Force dark theme stylesheet</p>
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
              <p style={{ fontWeight: 600, fontSize: 12 }}>Focus Mode</p>
              <p style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Dim surrounding distractions</p>
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
              <p style={{ fontWeight: 600, fontSize: 12 }}>Clean Layout</p>
              <p style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Hide overlays & sticky banners</p>
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
              <p style={{ fontWeight: 600, fontSize: 12 }}>Reader Mode</p>
              <p style={{ fontSize: 10, color: 'var(--text-secondary)' }}>Clean distraction-free reading</p>
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

      {/* CTA launcher */}
      <button className="btn" onClick={handleOpenSidePanel} style={{ width: '100%', marginTop: 2 }}>
        <span>🛠️</span>
        Open Full Workspace
      </button>
    </div>
  );
};
