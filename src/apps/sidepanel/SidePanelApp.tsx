import React, { useState, useEffect } from 'react';
import { FixerState, AuditSession, ComparisonReport, TypographyConfig, ScanProfileType } from '@shared/types';
import { DEFAULT_FIXER_STATE } from '@shared/constants';

type TabType = 'dashboard' | 'insights' | 'fixer' | 'accessibility' | 'privacy' | 'compare' | 'history';

interface CircularGaugeProps {
  score: number;
  label: string;
  colorVar: string;
  onClick?: () => void;
}

const CircularGauge: React.FC<CircularGaugeProps> = ({ score, label, colorVar, onClick }) => {
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <button
      className="card flex flex-col items-center gap-3"
      onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        textAlign: 'center',
        padding: '12px 8px',
        width: '100%',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        transition: 'var(--transition-fast)',
        outline: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}
    >
      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </span>
      <div style={{ position: 'relative', width: 50, height: 50 }}>
        <svg width="50" height="50" style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx="25"
            cy="25"
            r={radius}
            fill="transparent"
            stroke="var(--border-color)"
            strokeWidth="4"
          />
          <circle
            cx="25"
            cy="25"
            r={radius}
            fill="transparent"
            stroke={colorVar}
            strokeWidth="4"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
          />
        </svg>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: 12,
          color: 'var(--text-primary)'
        }}>
          {score}
        </div>
      </div>
    </button>
  );
};

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

  // Upgraded v1.3.0 features states:
  const [selectedProfile, setSelectedProfile] = useState<ScanProfileType>('full');
  const [expandedIssueIds, setExpandedIssueIds] = useState<Record<string, boolean>>({});
  const [historySearch, setHistorySearch] = useState('');
  const [groupByDomain, setGroupByDomain] = useState(false);
  const [historySort, setHistorySort] = useState<'date-desc' | 'date-asc' | 'score-desc'>('date-desc');
  const [notesText, setNotesText] = useState<Record<string, string>>({});
  const [showDeveloperDetails, setShowDeveloperDetails] = useState(false);

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
      { type: 'RUN_AUDIT', payload: { tabId, scanProfile: selectedProfile } },
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

    if (
      !nextState.darkMode &&
      !nextState.focusMode &&
      !nextState.hideSticky &&
      !nextState.readerMode &&
      !nextState.imageDimming &&
      !nextState.highlightLinks &&
      !nextState.readingRuler
    ) {
      nextState.enabled = false;
    }

    setSettings(nextState);
    applySettings(nextState);
  };

  const handleNumericSetting = (key: 'paragraphSpacing', val: number) => {
    if (!tabId) return;
    const nextState = {
      ...settings,
      enabled: true,
      [key]: val
    };
    setSettings(nextState);
    applySettings(nextState);
  };

  const handleWidthSetting = (val: 'narrow' | 'medium' | 'wide' | 'full') => {
    if (!tabId) return;
    const nextState = {
      ...settings,
      enabled: true,
      readingWidth: val
    };
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
  const handleExport = (format: 'md' | 'json' | 'csv') => {
    if (!session) return;
    chrome.runtime.sendMessage(
      { type: 'EXPORT_REPORT', payload: { id: session.id, format } },
      (res) => {
        if (res && res.success && res.data) {
          const mimeTypes = {
            json: 'application/json',
            csv: 'text/csv',
            md: 'text/markdown'
          };
          const blob = new Blob([res.data], { type: mimeTypes[format] });
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

  const handleSaveNotes = (id: string, text: string) => {
    chrome.runtime.sendMessage(
      { type: 'SAVE_ANNOTATION', payload: { id, notes: text } },
      (res) => {
        if (res && res.success) {
          alert('Notes saved successfully.');
          if (tabId) refreshState(tabId);
        } else {
          alert('Failed to save notes.');
        }
      }
    );
  };

  const toggleIssueExpand = (id: string) => {
    setExpandedIssueIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Calculate quick wins
  const quickWins = session ? session.issues.filter(issue => {
    const isCriticalOrWarning = issue.severity === 'critical' || issue.severity === 'warning';
    const isA11yOrPrivacy = issue.category === 'accessibility' || issue.category === 'privacy';
    const hasPreview = !!(issue.quickFixPreviewSelector || issue.locator?.primarySelector);
    return isCriticalOrWarning && isA11yOrPrivacy && hasPreview;
  }).slice(0, 3) : [];

  // Plain warnings generator for insights
  const getPlainWarnings = (insights: any) => {
    const warnings = [];
    if (!insights) return [];
    if (insights.trackersSummary.total > 5) {
      warnings.push({ title: 'Tracker-Heavy Page', desc: 'Loads a high density of third-party domains and marketing libraries.', severity: 'warning' });
    }
    if (insights.interstitialsDetected > 0) {
      warnings.push({ title: 'Intrusive Overlays Detected', desc: 'Large blocking overlays/cookie layouts were identified.', severity: 'warning' });
    }
    if (insights.formsCount.unlabeled > 0) {
      warnings.push({ title: 'Unlabeled Form Controls', desc: `${insights.formsCount.unlabeled} input elements lack explicit label elements.`, severity: 'critical' });
    }
    if (insights.imagesCount.missingAlt > 0) {
      warnings.push({ title: 'Descriptions Missing on Images', desc: `${insights.imagesCount.missingAlt} graphic tags lack descriptive alt text.`, severity: 'warning' });
    }
    if (insights.iframeCount > 5) {
      warnings.push({ title: 'High Density of Embeds', desc: `${insights.iframeCount} iframe sub-views may consume client resources.`, severity: 'info' });
    }
    if (!insights.mainContentFound) {
      warnings.push({ title: 'Lack of Layout Landmarks', desc: 'Screen readers could fail to locate the main content segment easily.', severity: 'warning' });
    }
    return warnings;
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

  // History filtering & sorting logic
  const filteredHistory = history.filter(item => {
    const term = historySearch.toLowerCase();
    return item.page.domain.toLowerCase().includes(term) || item.page.title.toLowerCase().includes(term);
  });

  const sortedHistory = [...filteredHistory].sort((a, b) => {
    if (historySort === 'date-desc') return b.completedAt - a.completedAt;
    if (historySort === 'date-asc') return a.completedAt - b.completedAt;
    if (historySort === 'score-desc') return b.scores.overall - a.scores.overall;
    return 0;
  });

  // Group history by domain helper
  const groupHistoryByDomain = (list: AuditSession[]) => {
    const groups: Record<string, AuditSession[]> = {};
    list.forEach(item => {
      const d = item.page.domain;
      if (!groups[d]) groups[d] = [];
      groups[d].push(item);
    });
    return groups;
  };

  return (
    <div className="flex flex-col" style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Workspace Menu Tabs */}
      <div className="flex" style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)', padding: '0 8px', overflowX: 'auto', position: 'sticky', top: 0, zIndex: 100 }}>
        {(['dashboard', 'insights', 'fixer', 'accessibility', 'privacy', 'compare', 'history'] as TabType[]).map(tab => (
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
              transition: 'var(--transition-fast)',
              whiteSpace: 'nowrap'
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
            {/* Scan presets selection */}
            <div className="card flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 24 }}>⚙️</span>
                <h3 style={{ fontWeight: 700 }}>Scan Configuration</h3>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Audit Scope Preset Profile</label>
                <select
                  className="form-control"
                  value={selectedProfile}
                  onChange={(e) => setSelectedProfile(e.target.value as ScanProfileType)}
                >
                  <option value="full">Full Audit preset (All rules)</option>
                  <option value="quick">Quick preset (High-priority failures)</option>
                  <option value="accessibility">Accessibility focused scan</option>
                  <option value="privacy">Privacy & tracker audit focus</option>
                  <option value="ux">UX / Readability heuristics</option>
                  <option value="developer">Developer verbose scan</option>
                  <option value="summary">Summary check (Page Metadata)</option>
                </select>
              </div>
            </div>

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
                  <CircularGauge
                    score={session.scores.accessibility}
                    label="Accessibility"
                    colorVar="var(--accent-purple)"
                    onClick={() => setActiveTab('accessibility')}
                  />
                  <CircularGauge
                    score={session.scores.privacy}
                    label="Privacy"
                    colorVar="var(--accent-green)"
                    onClick={() => setActiveTab('privacy')}
                  />
                  <CircularGauge
                    score={session.scores.ux}
                    label="UX"
                    colorVar="var(--accent-amber)"
                  />
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

                {/* Quick Wins Panel */}
                <div className="flex flex-col gap-2">
                  <h3 style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    ⚡ Recommended Quick Wins
                  </h3>
                  {quickWins.length === 0 ? (
                    <div className="card text-secondary" style={{ fontSize: 12, padding: 12 }}>
                      No quick accessibility or privacy fixes recommended for this page.
                    </div>
                  ) : (
                    quickWins.map(issue => (
                      <div key={issue.id} className="card flex flex-col gap-2" style={{ borderLeft: '4px solid var(--accent-green)' }}>
                        <div className="flex justify-between items-center">
                          <span className={`badge badge-${issue.severity}`}>{issue.severity}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{issue.subcategory}</span>
                        </div>
                        <h4 style={{ fontWeight: 700, fontSize: 13 }}>{issue.title}</h4>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{issue.description}</p>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '6px 12px', fontSize: 11, alignSelf: 'flex-start', marginTop: 4 }}
                          onClick={() => {
                            setActiveTab(issue.category === 'accessibility' ? 'accessibility' : 'privacy');
                            toggleIssueExpand(issue.id);
                            setTimeout(() => handleLocateElement(issue.locator?.primarySelector), 100);
                          }}
                        >
                          🔍 View Remediation details
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Local compiler downloads */}
                <div className="flex flex-col gap-2">
                  <h3 style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    📥 Export Reports
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    <button className="btn btn-secondary" onClick={() => handleExport('md')} style={{ padding: '8px 4px', fontSize: 11 }}>
                      📄 MD Report
                    </button>
                    <button className="btn btn-secondary" onClick={() => handleExport('json')} style={{ padding: '8px 4px', fontSize: 11 }}>
                      ⚙️ JSON Dump
                    </button>
                    <button className="btn btn-secondary" onClick={() => handleExport('csv')} style={{ padding: '8px 4px', fontSize: 11 }}>
                      📊 CSV Table
                    </button>
                  </div>
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

        {/* TAB 2: INSIGHTS */}
        {activeTab === 'insights' && (
          <div className="flex flex-col gap-4 animate-fade-in">
            {session && session.insights ? (
              <>
                {/* Structural Overview */}
                <div className="card flex flex-col gap-3">
                  <h3 style={{ fontSize: 14, fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: 6 }}>
                    DOM Structure & Metrics
                  </h3>
                  <div className="grid grid-cols-2 gap-2" style={{ fontSize: 12 }}>
                    <div style={{ padding: 6, background: 'var(--bg-tertiary)', borderRadius: 6 }}>
                      <p style={{ color: 'var(--text-secondary)' }}>Page Language</p>
                      <p style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{session.insights.pageLanguage || 'Not specified'}</p>
                    </div>
                    <div style={{ padding: 6, background: 'var(--bg-tertiary)', borderRadius: 6 }}>
                      <p style={{ color: 'var(--text-secondary)' }}>Main Content Landmark</p>
                      <p style={{ fontSize: 14, fontWeight: 700, marginTop: 2, color: session.insights.mainContentFound ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                        {session.insights.mainContentFound ? 'Detected' : 'Missing'}
                      </p>
                    </div>
                    <div style={{ padding: 6, background: 'var(--bg-tertiary)', borderRadius: 6 }}>
                      <p style={{ color: 'var(--text-secondary)' }}>iFrames Count</p>
                      <p style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{session.insights.iframeCount}</p>
                    </div>
                    <div style={{ padding: 6, background: 'var(--bg-tertiary)', borderRadius: 6 }}>
                      <p style={{ color: 'var(--text-secondary)' }}>Interstitials Blockers</p>
                      <p style={{ fontSize: 14, fontWeight: 700, marginTop: 2, color: session.insights.interstitialsDetected > 0 ? 'var(--accent-amber)' : 'var(--text-primary)' }}>
                        {session.insights.interstitialsDetected}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Plain English warnings */}
                <div className="flex flex-col gap-2">
                  <h3 style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    📢 Structural Warnings
                  </h3>
                  {getPlainWarnings(session.insights).length === 0 ? (
                    <div className="card text-secondary" style={{ fontSize: 12 }}>
                      No plain warnings identified. Structure is clean.
                    </div>
                  ) : (
                    getPlainWarnings(session.insights).map((warn, index) => (
                      <div key={index} className="card flex flex-col gap-1" style={{ borderLeft: `4px solid var(--accent-${warn.severity})`, padding: 10 }}>
                        <div className="flex justify-between items-center">
                          <h4 style={{ fontWeight: 700, fontSize: 13 }}>{warn.title}</h4>
                          <span className={`badge badge-${warn.severity}`} style={{ fontSize: 8 }}>{warn.severity}</span>
                        </div>
                        <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{warn.desc}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Tag ratios & specific element counts */}
                <div className="card flex flex-col gap-3">
                  <h3 style={{ fontSize: 14, fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: 6 }}>
                    Tag Counts & Distributions
                  </h3>
                  <div className="flex flex-col gap-2" style={{ fontSize: 12 }}>
                    <div>
                      <p style={{ fontWeight: 600 }}>Headings distribution:</p>
                      <p style={{ color: 'var(--text-secondary)', marginTop: 2 }}>
                        H1: {session.insights.headingsCount.h1} | H2: {session.insights.headingsCount.h2} | H3: {session.insights.headingsCount.h3} | H4: {session.insights.headingsCount.h4} | H5: {session.insights.headingsCount.h5} | H6: {session.insights.headingsCount.h6}
                      </p>
                    </div>
                    <div style={{ height: 1, background: 'var(--border-color)', margin: '4px 0' }} />
                    <div className="flex justify-between">
                      <span>Total Images:</span>
                      <strong>{session.insights.imagesCount.total} <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>(Missing Alt: {session.insights.imagesCount.missingAlt})</span></strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Forms:</span>
                      <strong>{session.insights.formsCount.total} <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>(Unlabeled: {session.insights.formsCount.unlabeled}, Placeholder-only: {session.insights.formsCount.placeholderOnly})</span></strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Anchor Links:</span>
                      <strong>{session.insights.linksCount.total} <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>(Empty: {session.insights.linksCount.empty}, Suspicious: {session.insights.linksCount.suspiciousPurpose})</span></strong>
                    </div>
                  </div>
                </div>

                {/* Resource counts and trackers details */}
                <div className="card flex flex-col gap-3">
                  <h3 style={{ fontSize: 14, fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: 6 }}>
                    Trackers & Requests
                  </h3>
                  <div className="flex flex-col gap-2" style={{ fontSize: 12 }}>
                    <div className="flex justify-between">
                      <span>First Party Assets:</span>
                      <strong>{session.insights.resourceSummary.firstParty}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Third Party Assets:</span>
                      <strong>{session.insights.resourceSummary.thirdParty}</strong>
                    </div>
                    <div style={{ height: 1, background: 'var(--border-color)', margin: '4px 0' }} />
                    <div>
                      <p style={{ fontWeight: 600, color: 'var(--accent-amber)' }}>Trackers breakdown (Total: {session.insights.trackersSummary.total}):</p>
                      <p style={{ color: 'var(--text-secondary)', marginTop: 2 }}>
                        Analytics: {session.insights.trackersSummary.analytics} | Advertising: {session.insights.trackersSummary.advertising} | Social: {session.insights.trackersSummary.social} | Utility: {session.insights.trackersSummary.utility}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="card flex items-center justify-center" style={{ padding: 40, color: 'var(--text-secondary)', textAlign: 'center' }}>
                Unscanned URL domain. Please run an audit scan first.
              </div>
            )}
          </div>
        )}

        {/* TAB 3: COMFORT (PAGE FIXER) */}
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
                    <p style={{ fontWeight: 600 }}>Clean Overlays & Sticky Ads</p>
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Hide large floating cookie banners and panels safely</p>
                  </div>
                  <label className="switch">
                    <input type="checkbox" checked={settings.enabled && settings.hideSticky} onChange={() => handleToggleSetting('hideSticky')} />
                    <span className="slider"></span>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p style={{ fontWeight: 600, color: 'var(--accent-purple-hover)' }}>Shadow Reader Mode</p>
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Extract main content inside isolated shadow root layout</p>
                  </div>
                  <label className="switch">
                    <input type="checkbox" checked={settings.enabled && !!settings.readerMode} onChange={() => handleToggleSetting('readerMode')} />
                    <span className="slider"></span>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p style={{ fontWeight: 600 }}>Highlight Anchor Links</p>
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Outline all hyperlinks on page with high-contrast box</p>
                  </div>
                  <label className="switch">
                    <input type="checkbox" checked={settings.enabled && !!settings.highlightLinks} onChange={() => handleToggleSetting('highlightLinks')} />
                    <span className="slider"></span>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p style={{ fontWeight: 600 }}>Dim Imagery & Canvas</p>
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Dim visual density of graphic image assets</p>
                  </div>
                  <label className="switch">
                    <input type="checkbox" checked={settings.enabled && !!settings.imageDimming} onChange={() => handleToggleSetting('imageDimming')} />
                    <span className="slider"></span>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p style={{ fontWeight: 600 }}>Reading Ruler Overlay</p>
                    <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Attach high-contrast target focus reader ruler to cursor</p>
                  </div>
                  <label className="switch">
                    <input type="checkbox" checked={settings.enabled && !!settings.readingRuler} onChange={() => handleToggleSetting('readingRuler')} />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>
            </div>

            {/* Typography adjustments */}
            <div className="card flex flex-col gap-4">
              <h3 style={{ fontSize: 14, fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
                Typography Spacing Panel
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
                  <label className="form-label" style={{ marginBottom: 0 }}>Line Height Spacing</label>
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
                  <label className="form-label" style={{ marginBottom: 0 }}>Letter Spacing</label>
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
                <div className="flex justify-between" style={{ marginBottom: 6 }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Paragraph Spacing</label>
                  <span style={{ fontSize: 11, fontWeight: 700 }}>{settings.paragraphSpacing || 1.0}x</span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="3.0"
                  step="0.1"
                  value={settings.paragraphSpacing || 1.0}
                  onChange={(e) => handleNumericSetting('paragraphSpacing', parseFloat(e.target.value))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Reading Column Width</label>
                <select
                  className="form-control"
                  value={settings.readingWidth || 'medium'}
                  onChange={(e) => handleWidthSetting(e.target.value as any)}
                >
                  <option value="narrow">Narrow Width (Readable)</option>
                  <option value="medium">Medium Width</option>
                  <option value="wide">Wide Width</option>
                  <option value="full">Full layout width</option>
                </select>
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
                🔄 Reset Typography & Styles
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: ACCESSIBILITY */}
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

                  return filtered.map(issue => {
                    const isExpanded = !!expandedIssueIds[issue.id];
                    return (
                      <div key={issue.id} className="card flex flex-col gap-2" style={{ borderLeft: `4px solid var(--accent-${issue.severity === 'critical' ? 'red' : issue.severity === 'warning' ? 'amber' : 'purple'})` }}>
                        <div className="flex items-center justify-between" style={{ cursor: 'pointer' }} onClick={() => toggleIssueExpand(issue.id)}>
                          <div className="flex items-center gap-2">
                            <span className={`badge badge-${issue.severity}`}>{issue.severity}</span>
                            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{issue.subcategory}</span>
                          </div>
                          <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{isExpanded ? '▼' : '▶'}</span>
                        </div>
                        <h4 style={{ fontWeight: 700 }} onClick={() => toggleIssueExpand(issue.id)}>{issue.title}</h4>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)' }} onClick={() => toggleIssueExpand(issue.id)}>{issue.description}</p>
                        
                        {isExpanded && (
                          <div className="flex flex-col gap-2 animate-fade-in" style={{ padding: '8px 10px', background: 'var(--bg-tertiary)', borderRadius: 6, fontSize: 11, marginTop: 4 }}>
                            <p style={{ color: 'var(--text-secondary)' }}><strong>Why it matters:</strong> {issue.whyItMatters}</p>
                            <p style={{ color: 'var(--accent-purple-hover)', marginTop: 4 }}><strong>Suggested Remedy:</strong> {issue.remediation}</p>
                            {issue.confidence && (
                              <p style={{ color: 'var(--text-secondary)', marginTop: 2 }}><strong>Heuristic Confidence:</strong> {issue.confidence}</p>
                            )}
                            {issue.suggestedFix && (
                              <p style={{ color: 'var(--accent-green)', marginTop: 4 }}><strong>Suggested Fix:</strong> <code>{issue.suggestedFix}</code></p>
                            )}
                            
                            {/* Advanced specs disclosure */}
                            {showDeveloperDetails && (
                              <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: 4, fontFamily: 'monospace', fontSize: 10, color: 'var(--text-secondary)' }}>
                                {issue.locator?.primarySelector && <p><strong>CSS:</strong> {issue.locator.primarySelector}</p>}
                                {issue.locator?.xpath && <p><strong>XPath:</strong> {issue.locator.xpath}</p>}
                                {issue.locator?.domPath && <p><strong>DOM Path:</strong> {issue.locator.domPath.join(' > ')}</p>}
                                {issue.evidence && <p style={{ overflowX: 'auto', background: 'rgba(0,0,0,0.3)', padding: 4 }}><strong>Evidence:</strong> {issue.evidence}</p>}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex gap-2" style={{ marginTop: 4 }}>
                          {issue.locator?.primarySelector && (
                            <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 11 }} onClick={() => handleLocateElement(issue.locator?.primarySelector)}>
                              🔍 {activeHighlightSelector === issue.locator.primarySelector ? 'Clear Overlay' : 'Highlight'}
                            </button>
                          )}
                          {issue.quickFixPreviewSelector && (
                            <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 11 }} onClick={() => handleLocateElement(issue.quickFixPreviewSelector)}>
                              ⚡ Preview Local Fix
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            ) : (
              <div className="card flex items-center justify-center" style={{ padding: 40, color: 'var(--text-secondary)', textAlign: 'center' }}>
                Unscanned URL domain. Please run an audit scan first.
              </div>
            )}
          </div>
        )}

        {/* TAB 5: PRIVACY */}
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
                    Resource Requests Summary
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

                {/* Privacy specific issues */}
                <div className="flex flex-col gap-2">
                  <h3 style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                    Privacy & Trust Violations
                  </h3>
                  {session.issues.filter(i => i.category === 'privacy').length === 0 ? (
                    <div className="card text-secondary" style={{ padding: 12, fontSize: 12 }}>
                      No privacy violations or dark patterns detected.
                    </div>
                  ) : (
                    session.issues.filter(i => i.category === 'privacy').map(issue => {
                      const isExpanded = !!expandedIssueIds[issue.id];
                      return (
                        <div key={issue.id} className="card flex flex-col gap-2" style={{ borderLeft: '4px solid var(--accent-red)' }}>
                          <div className="flex items-center justify-between" style={{ cursor: 'pointer' }} onClick={() => toggleIssueExpand(issue.id)}>
                            <span className={`badge badge-${issue.severity}`}>{issue.severity}</span>
                            <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{isExpanded ? '▼' : '▶'}</span>
                          </div>
                          <h4 style={{ fontWeight: 700 }} onClick={() => toggleIssueExpand(issue.id)}>{issue.title}</h4>
                          <p style={{ fontSize: 12, color: 'var(--text-secondary)' }} onClick={() => toggleIssueExpand(issue.id)}>{issue.description}</p>
                          
                          {isExpanded && (
                            <div className="flex flex-col gap-2 animate-fade-in" style={{ padding: '8px 10px', background: 'var(--bg-tertiary)', borderRadius: 6, fontSize: 11, marginTop: 4 }}>
                              <p style={{ color: 'var(--text-secondary)' }}><strong>Why it matters:</strong> {issue.whyItMatters}</p>
                              <p style={{ color: 'var(--accent-purple-hover)', marginTop: 4 }}><strong>Suggested Remedy:</strong> {issue.remediation}</p>
                              {issue.confidence && (
                                <p style={{ color: 'var(--text-secondary)', marginTop: 2 }}><strong>Heuristic Confidence:</strong> {issue.confidence}</p>
                              )}
                              {issue.suggestedFix && (
                                <p style={{ color: 'var(--accent-green)', marginTop: 4 }}><strong>Suggested Fix:</strong> <code>{issue.suggestedFix}</code></p>
                              )}

                              {/* Advanced specs disclosure */}
                              {showDeveloperDetails && (
                                <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: 4, fontFamily: 'monospace', fontSize: 10, color: 'var(--text-secondary)' }}>
                                  {issue.locator?.primarySelector && <p><strong>CSS:</strong> {issue.locator.primarySelector}</p>}
                                  {issue.locator?.xpath && <p><strong>XPath:</strong> {issue.locator.xpath}</p>}
                                  {issue.locator?.domPath && <p><strong>DOM Path:</strong> {issue.locator.domPath.join(' > ')}</p>}
                                  {issue.evidence && <p style={{ overflowX: 'auto', background: 'rgba(0,0,0,0.3)', padding: 4 }}><strong>Evidence:</strong> {issue.evidence}</p>}
                                </div>
                              )}
                            </div>
                          )}

                          <div className="flex gap-2" style={{ marginTop: 4 }}>
                            {issue.locator?.primarySelector && (
                              <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 11 }} onClick={() => handleLocateElement(issue.locator?.primarySelector)}>
                                🔍 {activeHighlightSelector === issue.locator.primarySelector ? 'Clear Overlay' : 'Highlight'}
                              </button>
                            )}
                            {issue.quickFixPreviewSelector && (
                              <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 11 }} onClick={() => handleLocateElement(issue.quickFixPreviewSelector)}>
                                ⚡ Preview Local Fix
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
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

        {/* TAB 6: COMPARE */}
        {activeTab === 'compare' && (
          <div className="flex flex-col gap-4 animate-fade-in">
            <div className="card flex flex-col gap-3">
              <h3 style={{ fontSize: 13, fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: 6 }}>
                Audit Comparison Picker
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
                <div className="card flex flex-col gap-3" style={{ background: 'var(--bg-tertiary)', marginTop: 12, textAlign: 'left' }}>
                  <h4 style={{ fontWeight: 700, fontSize: 14 }}>Comparison Results: {compareReport.domain}</h4>
                  
                  <div className="grid grid-cols-2 gap-2" style={{ textAlign: 'center', fontSize: 12 }}>
                    <div className="card" style={{ padding: 10 }}>
                      <p style={{ fontWeight: 700, color: 'var(--text-secondary)', fontSize: 11 }}>Score Delta</p>
                      <p style={{ fontSize: 18, fontWeight: 800, marginTop: 4, color: compareReport.scoreDeltas.overall.difference >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                        {compareReport.scoreDeltas.overall.difference >= 0 ? '+' : ''}{compareReport.scoreDeltas.overall.difference}
                      </p>
                      <p style={{ fontSize: 10, color: 'var(--text-secondary)' }}>({compareReport.scoreDeltas.overall.before} ➔ {compareReport.scoreDeltas.overall.after})</p>
                    </div>
                    <div className="card" style={{ padding: 10 }}>
                      <p style={{ fontWeight: 700, color: 'var(--text-secondary)', fontSize: 11 }}>Issues Count</p>
                      <p style={{ fontSize: 12, marginTop: 4 }}>
                        Resolved: <strong style={{ color: 'var(--accent-green)' }}>{compareReport.resolvedIssues.length}</strong><br />
                        New: <strong style={{ color: 'var(--accent-red)' }}>{compareReport.newIssues.length}</strong>
                      </p>
                    </div>
                  </div>

                  {/* List of Resolved Issues */}
                  {compareReport.resolvedIssues.length > 0 && (
                    <div className="flex flex-col gap-1" style={{ marginTop: 4 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-green)' }}>Resolved Issues ({compareReport.resolvedIssues.length})</p>
                      <div style={{ maxHeight: 100, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {compareReport.resolvedIssues.map(issue => (
                          <div key={issue.id} style={{ fontSize: 11, padding: '6px 8px', background: 'var(--bg-secondary)', borderRadius: 6, borderLeft: '3px solid var(--accent-green)', color: 'var(--text-primary)' }}>
                            <div style={{ fontWeight: 600 }}>{issue.title}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>{issue.description}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* List of New Issues */}
                  {compareReport.newIssues.length > 0 && (
                    <div className="flex flex-col gap-1" style={{ marginTop: 4 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-red)' }}>New Issues ({compareReport.newIssues.length})</p>
                      <div style={{ maxHeight: 100, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {compareReport.newIssues.map(issue => (
                          <div key={issue.id} style={{ fontSize: 11, padding: '6px 8px', background: 'var(--bg-secondary)', borderRadius: 6, borderLeft: '3px solid var(--accent-red)', color: 'var(--text-primary)' }}>
                            <div style={{ fontWeight: 600 }}>{issue.title}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>{issue.description}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button className="btn btn-secondary" onClick={() => setCompareReport(null)} style={{ fontSize: 11, padding: 6 }}>
                    Clear Comparison
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 7: HISTORY */}
        {activeTab === 'history' && (
          <div className="flex flex-col gap-4 animate-fade-in">
            {/* Search, Sort, and Filtering widgets */}
            <div className="card flex flex-col gap-3">
              <h3 style={{ fontSize: 13, fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: 6 }}>
                History Filters & Settings
              </h3>
              <div className="form-group" style={{ marginBottom: 8 }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by domain or page title..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-2" style={{ marginBottom: 4 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 10 }}>Sort By</label>
                  <select
                    className="form-control"
                    value={historySort}
                    onChange={(e) => setHistorySort(e.target.value as any)}
                    style={{ padding: 6, fontSize: 12 }}
                  >
                    <option value="date-desc">Newest First</option>
                    <option value="date-asc">Oldest First</option>
                    <option value="score-desc">Highest Score</option>
                  </select>
                </div>
                <div className="flex items-center gap-2" style={{ marginTop: 14 }}>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={groupByDomain}
                      onChange={() => setGroupByDomain(!groupByDomain)}
                    />
                    <span className="slider"></span>
                  </label>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Group Domain</span>
                </div>
              </div>
            </div>

            {/* History logs directory */}
            <div className="flex flex-col gap-2">
              <h3 style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                Saved Local Reports ({sortedHistory.length})
              </h3>
              {sortedHistory.length === 0 ? (
                <div className="card flex items-center justify-center" style={{ padding: 30, color: 'var(--text-secondary)' }}>
                  No matching saved audits found.
                </div>
              ) : groupByDomain ? (
                // Grouped Rendering
                Object.entries(groupHistoryByDomain(sortedHistory)).map(([dom, sessions]) => (
                  <div key={dom} className="flex flex-col gap-2" style={{ borderLeft: '2px solid var(--border-color)', paddingLeft: 8, marginBottom: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-purple-hover)', padding: '4px 0' }}>
                      🌐 {dom} ({sessions.length})
                    </div>
                    {sessions.map(item => {
                      const isPinned = pinnedIds.includes(item.id);
                      const currentNotes = notesText[item.id] !== undefined ? notesText[item.id] : (item.userNotes || '');
                      return (
                        <div key={item.id} className="card flex flex-col gap-2" style={{ background: 'rgba(255,255,255,0.01)' }}>
                          <div className="flex items-center justify-between">
                            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                              {new Date(item.completedAt).toLocaleString()}
                            </span>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handlePinToggle(item.id, isPinned)}
                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 11, color: isPinned ? 'var(--accent-amber)' : 'var(--text-secondary)' }}
                                title={isPinned ? 'Unpin report' : 'Pin report to prevent deletions'}
                              >
                                📌 {isPinned ? 'Pinned' : 'Pin'}
                              </button>
                              <button
                                onClick={() => handleDeleteHistory(item.id)}
                                style={{ background: 'transparent', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: 11 }}
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                              <p style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.page.title}</p>
                            </div>
                            <div className="flex items-center justify-center" style={{
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              border: `2px solid ${item.scores.overall >= 80 ? 'var(--accent-green)' : item.scores.overall >= 50 ? 'var(--accent-amber)' : 'var(--accent-red)'}`,
                              fontWeight: 700,
                              fontSize: 11,
                              flexShrink: 0
                            }}>
                              {item.scores.overall}
                            </div>
                          </div>

                          {/* Notes Annotations box */}
                          <div className="flex flex-col gap-2" style={{ marginTop: 4, background: 'rgba(0,0,0,0.2)', padding: 8, borderRadius: 6 }}>
                            <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)' }}>Audit Annotations & Notes</label>
                            <textarea
                              className="form-control"
                              rows={2}
                              value={currentNotes}
                              onChange={(e) => setNotesText({ ...notesText, [item.id]: e.target.value })}
                              style={{ fontSize: 11, padding: 6, background: 'var(--bg-secondary)', resize: 'vertical' }}
                              placeholder="Write notes (e.g. issues fixed, checklist updates)..."
                            />
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '4px 8px', fontSize: 10, alignSelf: 'flex-end' }}
                              onClick={() => handleSaveNotes(item.id, currentNotes)}
                            >
                              Save Notes
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))
              ) : (
                // Linear sorted rendering
                sortedHistory.map(item => {
                  const isPinned = pinnedIds.includes(item.id);
                  const currentNotes = notesText[item.id] !== undefined ? notesText[item.id] : (item.userNotes || '');
                  return (
                    <div key={item.id} className="card flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                          {new Date(item.completedAt).toLocaleString()}
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handlePinToggle(item.id, isPinned)}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 11, color: isPinned ? 'var(--accent-amber)' : 'var(--text-secondary)' }}
                            title={isPinned ? 'Unpin report' : 'Pin report to prevent deletions'}
                          >
                            📌 {isPinned ? 'Pinned' : 'Pin'}
                          </button>
                          <button
                            onClick={() => handleDeleteHistory(item.id)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: 11 }}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                          <h4 style={{ fontWeight: 700, fontSize: 13, wordBreak: 'break-all' }}>{item.page.domain}</h4>
                          <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.page.title}</p>
                        </div>
                        <div className="flex items-center justify-center" style={{
                          width: 38,
                          height: 38,
                          borderRadius: '50%',
                          border: `2px solid ${item.scores.overall >= 80 ? 'var(--accent-green)' : item.scores.overall >= 50 ? 'var(--accent-amber)' : 'var(--accent-red)'}`,
                          fontWeight: 700,
                          fontSize: 12,
                          flexShrink: 0
                        }}>
                          {item.scores.overall}
                        </div>
                      </div>

                      {/* Notes Annotations box */}
                      <div className="flex flex-col gap-2" style={{ marginTop: 4, background: 'rgba(0,0,0,0.2)', padding: 8, borderRadius: 6 }}>
                        <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)' }}>Audit Annotations & Notes</label>
                        <textarea
                          className="form-control"
                          rows={2}
                          value={currentNotes}
                          onChange={(e) => setNotesText({ ...notesText, [item.id]: e.target.value })}
                          style={{ fontSize: 11, padding: 6, background: 'var(--bg-secondary)', resize: 'vertical' }}
                          placeholder="Write notes (e.g. issues fixed, checklist updates)..."
                        />
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '4px 8px', fontSize: 10, alignSelf: 'flex-end' }}
                          onClick={() => handleSaveNotes(item.id, currentNotes)}
                        >
                          Save Notes
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Global Developer Details disclosure switch in Footer */}
        <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>WebLens OS workspace v1.3.0</span>
          <div className="flex items-center gap-2">
            <label className="switch" style={{ width: 34, height: 18 }}>
              <input
                type="checkbox"
                checked={showDeveloperDetails}
                onChange={() => setShowDeveloperDetails(!showDeveloperDetails)}
              />
              <span className="slider" style={{ borderRadius: 18 }} />
            </label>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Developer Details</span>
          </div>
        </div>
      </div>
    </div>
  );
};
