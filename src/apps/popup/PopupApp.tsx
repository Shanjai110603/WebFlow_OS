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

      // 2. Fetch active visual settings from storage
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
      enabled: true, // Auto enable if toggle clicked
      [key]: !settings[key]
    };

    // If all toggles are disabled, disable the overall fixer flag
    if (!nextState.darkMode && !nextState.focusMode && !nextState.hideSticky) {
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

    // Call chrome open panel API
    chrome.sidePanel.open({ tabId }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error opening side panel:', chrome.runtime.lastError.message);
      } else {
        // Close popup window once side panel is launched
        window.close();
      }
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center animate-fade-in" style={{ width: 360, height: 200, padding: 24 }}>
        <div className="spinner" style={{ width: 24, height: 24, border: '3px solid var(--border-color)', borderTopColor: 'var(--accent-purple)', borderRadius: '50%' }}></div>
        <p style={{ marginTop: 12, color: 'var(--text-secondary)' }}>Loading WebLens status...</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="flex flex-col items-center justify-center animate-fade-in" style={{ width: 360, height: 200, padding: 24, textAlign: 'center' }}>
        <span style={{ fontSize: 32 }}>⚠️</span>
        <p style={{ marginTop: 12, fontWeight: 600, color: 'var(--accent-red)' }}>{errorMsg}</p>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>Please open a standard webpage.</p>
      </div>
    );
  }

  const hostname = tab?.url ? new URL(tab.url).hostname : 'Target Page';

  return (
    <div className="flex flex-col animate-fade-in" style={{ width: 360, padding: 16, gap: 16 }}>
      {/* Header */}
      <div className="flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 12 }}>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 20 }}>👁️</span>
          <div>
            <h1 style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.3px', lineHeight: 1.1 }}>WebLens OS</h1>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {hostname}
            </p>
          </div>
        </div>
        
        {/* Secure connection status */}
        {tab?.url?.startsWith('https:') ? (
          <span className="badge badge-success" style={{ fontSize: 9 }}>🔒 Secure</span>
        ) : (
          <span className="badge badge-critical" style={{ fontSize: 9 }}>⚠️ Insecure</span>
        )}
      </div>

      {/* Score overview dial */}
      <div className="card flex items-center justify-between" style={{ padding: 12 }}>
        <div>
          <h2 style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>WebLens Score</h2>
          <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
            {session ? 'Based on latest audit run' : 'Audit required to evaluate'}
          </p>
        </div>
        <div className="flex items-center justify-center" style={{
          width: 54,
          height: 54,
          borderRadius: '50%',
          background: session ? 'var(--bg-tertiary)' : 'transparent',
          border: `3px solid ${session ? (session.scores.overall >= 80 ? 'var(--accent-green)' : session.scores.overall >= 50 ? 'var(--accent-amber)' : 'var(--accent-red)') : 'var(--border-color)'}`,
          fontWeight: 700,
          fontSize: 16,
          color: session ? '#fff' : 'var(--text-secondary)'
        }}>
          {session ? `${session.scores.overall}` : '--'}
        </div>
      </div>

      {/* Pocket Visual Toggles */}
      <div className="flex flex-col gap-2">
        <h3 style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Visitor Preferences
        </h3>
        
        <div className="card flex items-center justify-between" style={{ padding: 10 }}>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 16 }}>🌙</span>
            <div>
              <p style={{ fontWeight: 600, fontSize: 13 }}>Dark Mode Override</p>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Force dark theme stylesheet</p>
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

        <div className="card flex items-center justify-between" style={{ padding: 10 }}>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 16 }}>🎯</span>
            <div>
              <p style={{ fontWeight: 600, fontSize: 13 }}>Focus Mode</p>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Dim surrounding distractions</p>
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

        <div className="card flex items-center justify-between" style={{ padding: 10 }}>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 16 }}>🧹</span>
            <div>
              <p style={{ fontWeight: 600, fontSize: 13 }}>Clean Layout</p>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Hide overlays and sticky ads</p>
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
      </div>

      {/* CTA launcher */}
      <button className="btn" onClick={handleOpenSidePanel}>
        <span>🛠️</span>
        Open Full Workspace
      </button>
    </div>
  );
};
