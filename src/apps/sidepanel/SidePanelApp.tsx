import React, { useState, useEffect } from 'react';
import { FixerState, AuditSession, ComparisonReport, AuditIssue } from '@shared/types';
import { DEFAULT_FIXER_STATE } from '@shared/constants';

type TabType = 'dashboard' | 'fixer' | 'accessibility' | 'privacy' | 'history';

export const SidePanelApp: React.FC = () => {
  const [tabId, setTabId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [session, setSession] = useState<AuditSession | null>(null);
  const [settings, setSettings] = useState<FixerState>(DEFAULT_FIXER_STATE);
  const [history, setHistory] = useState<AuditSession[]>([]);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  
  // Scans & audits
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Compare sessions state
  const [compareIdA, setCompareIdA] = useState<string>('');
  const [compareIdB, setCompareIdB] = useState<string>('');
  const [compareReport, setCompareReport] = useState<ComparisonReport | null>(null);

  // Active highlighted selector path
  const [activeHighlightSelector, setActiveHighlightSelector] = useState<string | null>(null);

  // Accessibility severity filter state
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');

  useEffect(() => {
    // 1. Get active tab id
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError || !tabs || tabs.length === 0) {
        setErrorMsg('Browser active tab context missing.');
        setLoading(false);
        return;
      }

      const activeTab = tabs[0];
      if (!activeTab.id || !activeTab.url || activeTab.url.startsWith('chrome://')) {
        setErrorMsg('WebLens cannot audit browser internal pages.');
        setLoading(false);
        return;
      }

      setTabId(activeTab.id);
      const activeTabId = activeTab.id;

      // 2. Fetch session and settings
      refreshState(activeTabId);
    });
  }, []);

  const refreshState = (tId: number) => {
    chrome.runtime.sendMessage(
      { type: 'GET_AUDIT', payload: { tabId: tId } },
      (auditRes) => {
        if (auditRes && auditRes.success && auditRes.data) {
          setSession(auditRes.data);
        } else {
          setSession(null);
        }

        chrome.runtime.sendMessage(
          { type: 'GET_FIXER_SETTINGS', payload: { tabId: tId } },
          (fixerRes) => {
            if (fixerRes && fixerRes.success && fixerRes.data) {
              setSettings(fixerRes.data);
            }

            // 4. Fetch local database history logs
            chrome.runtime.sendMessage({ type: 'LOAD_HISTORY', payload: {} }, (historyRes) => {
              if (historyRes && historyRes.success && historyRes.data) {
                setHistory(historyRes.data);
                
                // Get pinned list from dump
                chrome.storage.local.get('pinned', (res) => {
                  setPinnedIds(Array.isArray(res.pinned) ? res.pinned : []);
                  setLoading(false);
                });
              } else {
                setLoading(false);
              }
            });
          }
        );
      }
    );
  };

  const handleRunScan = () => {
    if (!tabId) return;
    setScanning(true);
    setErrorMsg(null);

    chrome.runtime.sendMessage(
      { type: 'RUN_AUDIT', payload: { tabId } },
      (res) => {
        setScanning(false);
        if (res && res.success) {
          setSession(res.data);
          refreshState(tabId);
        } else {
          setErrorMsg(res?.error?.message || 'Auditing failed.');
        }
      }
    );
  };

  // --- Visual Settings Controls handlers ---
  const handleToggleSetting = (key: keyof Omit<FixerState, 'version' | 'typography' | 'lastUpdatedAt'>) => {
    if (!tabId) return;

    const nextState = {
      ...settings,
      enabled: true,
      [key]: !settings[key]
    };

    if (!nextState.darkMode && !nextState.focusMode && !nextState.hideSticky) {
      nextState.enabled = false;
    }

    setSettings(nextState);
    applySettings(nextState);
  };

  const handleTypographySlider = (key: keyof TypographyConfig, val: number) => {
    if (!tabId) return;
    const nextState = {
      ...settings,
      enabled: true,
      typography: {
        ...settings.typography,
        [key]: val
      }
    };
    setSettings(nextState);
    applySettings(nextState);
  };

  const handleFontFamily = (family: 'default' | 'sans-serif' | 'serif' | 'dyslexic') => {
    if (!tabId) return;
    const nextState = {
      ...settings,
      enabled: true,
      typography: {
        ...settings.typography,
        fontFamily: family
      }
    };
    setSettings(nextState);
    applySettings(nextState);
  };

  const applySettings = (state: FixerState) => {
    if (!tabId) return;
    chrome.runtime.sendMessage({
      type: 'APPLY_FIXER_SETTINGS',
      payload: { tabId, settings: state }
    });
  };

  const handleResetSettings = () => {
    if (!tabId) return;
    setSettings(DEFAULT_FIXER_STATE);
    chrome.runtime.sendMessage({
      type: 'APPLY_FIXER_SETTINGS',
      payload: { tabId, settings: DEFAULT_FIXER_STATE }
    }, () => {
      refreshState(tabId);
    });
  };

  // --- Locating highlighting overlays handlers ---
  const handleLocateElement = (selector?: string) => {
    if (!tabId || !selector) return;

    if (activeHighlightSelector === selector) {
      // Toggle off if clicking the locator button again
      chrome.runtime.sendMessage({ type: 'CLEAR_HIGHLIGHT', payload: { tabId } });
      setActiveHighlightSelector(null);
    } else {
      chrome.runtime.sendMessage(
        { type: 'HIGHLIGHT_ISSUE', payload: { tabId, selector } },
        (res) => {
          if (res && res.success) {
            setActiveHighlightSelector(selector);
          } else {
            alert(res?.error?.message || 'Failed to locate element.');
          }
        }
      );
    }
  };

  // --- Export download compilation handlers ---
  const handleExport = (format: 'md' | 'json') => {
    if (!session) return;
    chrome.runtime.sendMessage(
      { type: 'EXPORT_REPORT', payload: { id: session.id, format } },
      (res) => {
        if (res && res.success && res.data) {
          const blob = new Blob([res.data], { type: format === 'json' ? 'application/json' : 'text/markdown' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `weblens-report-${session.page.domain}.${format}`;
          a.click();
        } else {
          alert('Export compiling failed.');
        }
      }
    );
  };

  // --- Deletion, Pinning & Comparison Handlers ---
  const handleDeleteHistory = (id: string) => {
    chrome.runtime.sendMessage({ type: 'DELETE_HISTORY', payload: { id } }, () => {
      if (tabId) refreshState(tabId);
    });
  };

  const handlePinToggle = (id: string, isPinned: boolean) => {
    chrome.runtime.sendMessage({ type: 'PIN_HISTORY', payload: { id, pinned: !isPinned } }, () => {
      if (tabId) refreshState(tabId);
    });
  };

  const handleRunCompare = () => {
    if (!compareIdA || !compareIdB) return;
    chrome.runtime.sendMessage(
      { type: 'COMPARE_AUDITS', payload: { idA: compareIdA, idB: compareIdB } },
      (res) => {
        if (res && res.success) {
          setCompareReport(res.data);
        } else {
          alert(res?.error?.message || 'Audits comparison failed.');
        }
      }
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center" style={{ height: '80vh', padding: 24 }}>
        <div className="spinner" style={{ width: 36, height: 36, border: '4px solid var(--border-color)', borderTopColor: 'var(--accent-purple)', borderRadius: '50%' }}></div>
        <p style={{ marginTop: 16, color: 'var(--text-secondary)' }}>Mounting WebLens Workspace...</p>
      </div>
    );
  }

  if (errorMsg && !scanning) {
    return (
      <div className="flex flex-col items-center justify-center" style={{ height: '80vh', padding: 24, textAlign: 'center' }}>
        <span style={{ fontSize: 48 }}>⚠️</span>
        <h2 style={{ marginTop: 16, fontWeight: 700, color: 'var(--accent-red)' }}>Connection Error</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8, maxWidth: 280 }}>
          {errorMsg}
        </p>
        <button className="btn" style={{ marginTop: 24 }} onClick={handleRunScan}>
          Retry Connection Scrape
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Workspace Menu Tabs */}
      <div className="flex" style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)', padding: '0 8px', overflowX: 'auto', position: 'sticky', top: 0, zIndex: 100 }}>
        {(['dashboard', 'fixer', 'accessibility', 'privacy', 'history'] as TabType[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid var(--accent-purple)' : '2px solid transparent',
              color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-secondary)',
              padding: '12px 14px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 12,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              transition: 'var(--transition-fast)'
            }}
          >
            {tab === 'fixer' ? 'Fix Page' : tab}
          </button>
        ))}
      </div>

      {/* Workspace Body */}
      <div className="flex flex-col" style={{ padding: 16, flex: 1, gap: 16 }}>
        {scanning && (
          <div className="card flex items-center justify-center gap-4" style={{ animation: 'pulse 1.5s infinite ease-in-out' }}>
            <div className="spinner" style={{ width: 18, height: 18, border: '2px solid var(--border-color)', borderTopColor: 'var(--accent-purple)', borderRadius: '50%' }}></div>
            <p style={{ fontSize: 13, fontWeight: 600 }}>Analyzing active tab DOM & resource graphs...</p>
          </div>
        )}

        {/* TAB 1: DASHBOARD */}
        {activeTab === 'dashboard' && !scanning && (
          <div className="flex flex-col gap-4 animate-fade-in">
            {/* Run Scans CTA */}
            <div className="card flex flex-col items-center justify-center" style={{ padding: '24px 16px', textAlign: 'center', gap: 12 }}>
              <span style={{ fontSize: 40 }}>👁️</span>
              <div>
                <h2 style={{ fontWeight: 700 }}>Analyze Target Webpage</h2>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                  Audits DOM hierarchies, labels contrast, and sniffs tracker resource networks.
                </p>
              </div>
              <button className="btn" onClick={handleRunScan} style={{ width: '100%' }}>
                <span>⚡</span> Run Audit Scan
              </button>
            </div>

            {/* Score dials */}
            {session ? (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <button className="card flex flex-col items-center gap-2" onClick={() => setActiveTab('accessibility')} style={{ cursor: 'pointer', textAlign: 'center', padding: '12px 8px' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Accessibility</span>
                    <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent-purple-hover)' }}>{session.scores.accessibility}</span>
                  </button>
                  <button className="card flex flex-col items-center gap-2" onClick={() => setActiveTab('privacy')} style={{ cursor: 'pointer', textAlign: 'center', padding: '12px 8px' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Privacy</span>
                    <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent-green)' }}>{session.scores.privacy}</span>
                  </button>
                  <button className="card flex flex-col items-center gap-2" style={{ textAlign: 'center', padding: '12px 8px' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>UX</span>
                    <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent-amber)' }}>{session.scores.ux}</span>
                  </button>
                </div>

                <div className="card flex items-center justify-between">
                  <div>
                    <h3 style={{ fontSize: 14, fontWeight: 700 }}>Overall Score</h3>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                      Average evaluation weight
                    </p>
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: session.scores.overall >= 80 ? 'var(--accent-green)' : session.scores.overall >= 50 ? 'var(--accent-amber)' : 'var(--accent-red)' }}>
                    {session.scores.overall}/100
                  </div>
                </div>

                {/* Top findings list */}
                <div className="flex flex-col gap-2">
                  <h3 style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                    Top Violations ({session.issues.length})
                  </h3>
                  {session.issues.length === 0 ? (
                    <div className="card flex items-center justify-center" style={{ padding: '24px 16px', color: 'var(--text-secondary)' }}>
                      0 issues detected! Page satisfies standard check models.
                    </div>
                  ) : (
                    session.issues.slice(0, 3).map(issue => (
                      <div key={issue.id} className="card flex flex-col gap-2" style={{ borderLeft: `4px solid var(--accent-${issue.severity === 'critical' ? 'red' : issue.severity === 'warning' ? 'amber' : 'purple'})` }}>
                        <div className="flex items-center justify-between">
                          <span className={`badge badge-${issue.severity}`}>{issue.severity}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{issue.subcategory}</span>
                        </div>
                        <h4 style={{ fontWeight: 700, fontSize: 13 }}>{issue.title}</h4>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{issue.description}</p>
                        {issue.locator?.primarySelector && (
                          <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 11, alignSelf: 'flex-start', marginTop: 4 }} onClick={() => handleLocateElement(issue.locator?.primarySelector)}>
                            🔍 {activeHighlightSelector === issue.locator.primarySelector ? 'Clear Overlay' : 'Highlight Element'}
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Local compiler downloads */}
                <div className="grid grid-cols-2 gap-2" style={{ marginTop: 8 }}>
                  <button className="btn btn-secondary" onClick={() => handleExport('md')}>
                    📄 Export Markdown
                  </button>
                  <button className="btn btn-secondary" onClick={() => handleExport('json')}>
                    ⚙️ Export JSON
                  </button>
                </div>
              </>
            ) : (
              <div className="card flex flex-col items-center justify-center" style={{ padding: '40px 16px', color: 'var(--text-secondary)', textAlign: 'center', gap: 8 }}>
                <span style={{ fontSize: 32 }}>🔍</span>
                <p style={{ fontWeight: 600 }}>Unscanned URL Domain</p>
                <p style={{ fontSize: 12 }}>Run a scan to compile score gauges and audit lists.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PAGE FIXER */}
        {activeTab === 'fixer' && (
          <div className="flex flex-col gap-4 animate-fade-in">
            <div className="card flex flex-col gap-4">
              <h3 style={{ fontSize: 14, fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
                Visitor Layout Adjustments
              </h3>

              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p style={{ fontWeight: 600 }}>Force Dark Mode</p>
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Apply dark theme stylesheet overrides</p>
                  </div>
                  <label className="switch">
                    <input type="checkbox" checked={settings.enabled && settings.darkMode} onChange={() => handleToggleSetting('darkMode')} />
                    <span className="slider"></span>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p style={{ fontWeight: 600 }}>Focus View</p>
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Dim surroundings to isolate main reading content</p>
                  </div>
                  <label className="switch">
                    <input type="checkbox" checked={settings.enabled && settings.focusMode} onChange={() => handleToggleSetting('focusMode')} />
                    <span className="slider"></span>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p style={{ fontWeight: 600 }}>Clean overlays & sticky ads</p>
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Hide large floating cookie banners and panels safely</p>
                  </div>
                  <label className="switch">
                    <input type="checkbox" checked={settings.enabled && settings.hideSticky} onChange={() => handleToggleSetting('hideSticky')} />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>
            </div>

            {/* Typography adjustments */}
            <div className="card flex flex-col gap-4">
              <h3 style={{ fontSize: 14, fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
                Typography spacing panel
              </h3>

              <div className="form-group">
                <div className="flex justify-between" style={{ marginBottom: 6 }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Font Size Offset</label>
                  <span style={{ fontSize: 11, fontWeight: 700 }}>{settings.typography.fontSize}%</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="200"
                  step="5"
                  value={settings.typography.fontSize}
                  onChange={(e) => handleTypographySlider('fontSize', parseInt(e.target.value))}
                />
              </div>

              <div className="form-group">
                <div className="flex justify-between" style={{ marginBottom: 6 }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Line Height spacing</label>
                  <span style={{ fontSize: 11, fontWeight: 700 }}>{settings.typography.lineHeight}</span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="2.5"
                  step="0.1"
                  value={settings.typography.lineHeight}
                  onChange={(e) => handleTypographySlider('lineHeight', parseFloat(e.target.value))}
                />
              </div>

              <div className="form-group">
                <div className="flex justify-between" style={{ marginBottom: 6 }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Letter Spacing adjustment</label>
                  <span style={{ fontSize: 11, fontWeight: 700 }}>{settings.typography.letterSpacing}em</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.2"
                  step="0.01"
                  value={settings.typography.letterSpacing}
                  onChange={(e) => handleTypographySlider('letterSpacing', parseFloat(e.target.value))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Font Family Overrides</label>
                <select
                  className="form-control"
                  value={settings.typography.fontFamily}
                  onChange={(e) => handleFontFamily(e.target.value as any)}
                >
                  <option value="default">System Default</option>
                  <option value="sans-serif">Modern Sans-serif</option>
                  <option value="serif">Classic Serif</option>
                  <option value="dyslexic">OpenDyslexic (Dyslexia Friendly)</option>
                </select>
              </div>

              <button className="btn btn-secondary" onClick={handleResetSettings} style={{ width: '100%', marginTop: 8 }}>
                🔄 Reset typography & styles
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: ACCESSIBILITY */}
        {activeTab === 'accessibility' && (
          <div className="flex flex-col gap-4 animate-fade-in">
            {/* Filter tags */}
            <div className="flex gap-2" style={{ overflowX: 'auto', paddingBottom: 4 }}>
              {(['all', 'critical', 'warning', 'info'] as const).map(sev => (
                <button
                  key={sev}
                  onClick={() => setSeverityFilter(sev)}
                  className="badge"
                  style={{
                    background: severityFilter === sev ? 'var(--accent-purple)' : 'var(--bg-secondary)',
                    color: severityFilter === sev ? '#fff' : 'var(--text-secondary)',
                    border: '1px solid var(--border-color)',
                    cursor: 'pointer',
                    padding: '6px 12px',
                    borderRadius: '16px'
                  }}
                >
                  {sev}
                </button>
              ))}
            </div>

            {session ? (
              <div className="flex flex-col gap-3">
                {(() => {
                  const filtered = session.issues.filter(i => {
                    if (i.category !== 'accessibility') return false;
                    return severityFilter === 'all' || i.severity === severityFilter;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="card flex flex-col items-center justify-center" style={{ padding: 40, textAlign: 'center', gap: 8, color: 'var(--text-secondary)' }}>
                        <span style={{ fontSize: 36 }}>🎉</span>
                        <p style={{ fontWeight: 600 }}>No issues found</p>
                        <p style={{ fontSize: 12 }}>Page satisfies accessibility constraints.</p>
                      </div>
                    );
                  }

                  return filtered.map(issue => (
                    <div key={issue.id} className="card flex flex-col gap-2" style={{ borderLeft: `4px solid var(--accent-${issue.severity === 'critical' ? 'red' : issue.severity === 'warning' ? 'amber' : 'purple'})` }}>
                      <div className="flex items-center justify-between">
                        <span className={`badge badge-${issue.severity}`}>{issue.severity}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{issue.subcategory}</span>
                      </div>
                      <h4 style={{ fontWeight: 700 }}>{issue.title}</h4>
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{issue.description}</p>
                      
                      <div className="flex flex-col gap-1" style={{ padding: '8px 10px', background: 'var(--bg-tertiary)', borderRadius: 6, fontSize: 11, marginTop: 4 }}>
                        <p style={{ color: 'var(--text-secondary)' }}><strong>Why it matters:</strong> {issue.whyItMatters}</p>
                        <p style={{ color: 'var(--accent-purple-hover)', marginTop: 4 }}><strong>Remediation:</strong> {issue.remediation}</p>
                      </div>

                      {issue.locator?.primarySelector && (
                        <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 11, alignSelf: 'flex-start', marginTop: 4 }} onClick={() => handleLocateElement(issue.locator?.primarySelector)}>
                          🔍 {activeHighlightSelector === issue.locator.primarySelector ? 'Clear Overlay' : 'Highlight on Page'}
                        </button>
                      )}
                    </div>
                  ));
                })()}
              </div>
            ) : (
              <div className="card flex items-center justify-center" style={{ padding: 40, color: 'var(--text-secondary)', textAlign: 'center' }}>
                Unscanned URL domain. Please run an audit scan first.
              </div>
            )}
          </div>
        )}

        {/* TAB 4: PRIVACY */}
        {activeTab === 'privacy' && (
          <div className="flex flex-col gap-4 animate-fade-in">
            {session ? (
              <>
                {/* Connection SSL alert */}
                {session.page.url.startsWith('https:') ? (
                  <div className="card flex items-center gap-2" style={{ background: 'var(--accent-green-alpha)', borderColor: 'var(--accent-green)' }}>
                    <span style={{ fontSize: 18 }}>🔒</span>
                    <div>
                      <p style={{ fontWeight: 700, color: 'var(--accent-green)' }}>Encrypted SSL Connection</p>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Hostname verifies SSL cert structures.</p>
                    </div>
                  </div>
                ) : (
                  <div className="card flex items-center gap-2" style={{ background: 'var(--accent-red-alpha)', borderColor: 'var(--accent-red)' }}>
                    <span style={{ fontSize: 18 }}>⚠️</span>
                    <div>
                      <p style={{ fontWeight: 700, color: 'var(--accent-red)' }}>Insecure Connection (HTTP)</p>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Data sent is unencrypted and vulnerable to sniffing.</p>
                    </div>
                  </div>
                )}

                {/* Sniffed resource summaries */}
                <div className="card flex flex-col gap-3">
                  <h3 style={{ fontSize: 13, fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: 6 }}>
                    Resource requests summary
                  </h3>
                  <div className="grid grid-cols-2 gap-2" style={{ textAlign: 'center' }}>
                    <div className="card" style={{ padding: 10 }}>
                      <p style={{ fontSize: 18, fontWeight: 800 }}>{session.resources.length}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Total Assets Loaded</p>
                    </div>
                    <div className="card" style={{ padding: 10 }}>
                      <p style={{ fontSize: 18, fontWeight: 800 }}>
                        {session.resources.filter(r => r.thirdParty).length}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Third Party Calls</p>
                    </div>
                  </div>
                </div>

                {/* Trackers list */}
                <div className="card flex flex-col gap-3">
                  <h3 style={{ fontSize: 13, fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: 6 }}>
                    Sniffed Third-Party Trackers ({session.resources.filter(r => r.tracker).length})
                  </h3>
                  {session.resources.filter(r => r.tracker).length === 0 ? (
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '8px 0' }}>
                      No analytical or marketing tracking domains detected.
                    </p>
                  ) : (
                    <div style={{ maxHeight: 150, overflowY: 'auto', fontSize: 11, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {session.resources.filter(r => r.tracker).map((res, index) => (
                        <div key={index} className="flex justify-between" style={{ padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <span style={{ wordBreak: 'break-all', maxWidth: 160 }}>{res.domain}</span>
                          <span className="badge badge-warning" style={{ fontSize: 9 }}>{res.trackerCategory}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Dark Pattern overlays */}
                <div className="flex flex-col gap-2">
                  <h3 style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                    Dark Patterns & Cookie Warnings
                  </h3>
                  {session.issues.filter(i => i.ruleId === 'overlay-dark-pattern').length === 0 ? (
                    <div className="card text-secondary" style={{ padding: 12, fontSize: 12 }}>
                      No full-screen blocking cookie overlays detected.
                    </div>
                  ) : (
                    session.issues.filter(i => i.ruleId === 'overlay-dark-pattern').map(issue => (
                      <div key={issue.id} className="card flex flex-col gap-1" style={{ borderLeft: '4px solid var(--accent-red)' }}>
                        <h4 style={{ fontWeight: 700, fontSize: 13 }}>Overlay Blocker flag</h4>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{issue.description}</p>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              <div className="card flex items-center justify-center" style={{ padding: 40, color: 'var(--text-secondary)', textAlign: 'center' }}>
                Unscanned URL domain. Please run an audit scan first.
              </div>
            )}
          </div>
        )}

        {/* TAB 5: HISTORY & COMPARE */}
        {activeTab === 'history' && (
          <div className="flex flex-col gap-4 animate-fade-in">
            {/* Compare section */}
            <div className="card flex flex-col gap-3">
              <h3 style={{ fontSize: 13, fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: 6 }}>
                Audit comparison picker
              </h3>
              
              <div className="form-group" style={{ marginBottom: 8 }}>
                <label className="form-label">Base Report (A)</label>
                <select className="form-control" value={compareIdA} onChange={(e) => setCompareIdA(e.target.value)}>
                  <option value="">Select Audit Session...</option>
                  {history.map(h => (
                    <option key={h.id} value={h.id}>
                      {new Date(h.page.timestamp).toLocaleDateString()} - {h.page.domain} (Score: {h.scores.overall})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label">Comparison Report (B)</label>
                <select className="form-control" value={compareIdB} onChange={(e) => setCompareIdB(e.target.value)}>
                  <option value="">Select Audit Session...</option>
                  {history.map(h => (
                    <option key={h.id} value={h.id}>
                      {new Date(h.page.timestamp).toLocaleDateString()} - {h.page.domain} (Score: {h.scores.overall})
                    </option>
                  ))}
                </select>
              </div>

              <button className="btn" onClick={handleRunCompare} disabled={!compareIdA || !compareIdB}>
                ⚖️ Compare Reports
              </button>

              {/* Compare report overlay render */}
              {compareReport && (
                <div className="card flex flex-col gap-3" style={{ background: 'var(--bg-tertiary)', marginTop: 12 }}>
                  <h4 style={{ fontWeight: 700 }}>Comparison Results: {compareReport.domain}</h4>
                  
                  <div className="grid grid-cols-2 gap-2" style={{ textAlign: 'center', fontSize: 12 }}>
                    <div className="card">
                      <p style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Score changes</p>
                      <p style={{ fontSize: 18, fontWeight: 800, marginTop: 4, color: compareReport.scoreDeltas.overall.difference >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                        {compareReport.scoreDeltas.overall.difference >= 0 ? '+' : ''}{compareReport.scoreDeltas.overall.difference}
                      </p>
                      <p style={{ fontSize: 10, color: 'var(--text-secondary)' }}>({compareReport.scoreDeltas.overall.before} ➔ {compareReport.scoreDeltas.overall.after})</p>
                    </div>
                    <div className="card">
                      <p style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Changes list</p>
                      <p style={{ fontSize: 12, marginTop: 4 }}>
                        Resolved: <strong style={{ color: 'var(--accent-green)' }}>{compareReport.resolvedIssues.length}</strong><br />
                        New: <strong style={{ color: 'var(--accent-red)' }}>{compareReport.newIssues.length}</strong>
                      </p>
                    </div>
                  </div>

                  <button className="btn btn-secondary" onClick={() => setCompareReport(null)} style={{ fontSize: 11, padding: 6 }}>
                    Clear Comparison
                  </button>
                </div>
              )}
            </div>

            {/* History logs directory */}
            <div className="flex flex-col gap-2">
              <h3 style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                Saved local reports ({history.length})
              </h3>
              {history.length === 0 ? (
                <div className="card flex items-center justify-center" style={{ padding: 30, color: 'var(--text-secondary)' }}>
                  No saved audits yet. Run a scan to build history.
                </div>
              ) : (
                history.map(item => {
                  const isPinned = pinnedIds.includes(item.id);
                  return (
                    <div key={item.id} className="card flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                          {new Date(item.completedAt).toLocaleString()}
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handlePinToggle(item.id, isPinned)}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 12 }}
                            title={isPinned ? 'Unpin report' : 'Pin report to prevent deletions'}
                          >
                            📌 {isPinned ? 'Pinned' : 'Pin'}
                          </button>
                          <button
                            onClick={() => handleDeleteHistory(item.id)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: 12 }}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 style={{ fontWeight: 700, fontSize: 13, wordBreak: 'break-all' }}>{item.page.domain}</h4>
                          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{item.page.title}</p>
                        </div>
                        <div className="flex items-center justify-center" style={{
                          width: 38,
                          height: 38,
                          borderRadius: '50%',
                          border: `2px solid ${item.scores.overall >= 80 ? 'var(--accent-green)' : item.scores.overall >= 50 ? 'var(--accent-amber)' : 'var(--accent-red)'}`,
                          fontWeight: 700,
                          fontSize: 12
                        }}>
                          {item.scores.overall}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
