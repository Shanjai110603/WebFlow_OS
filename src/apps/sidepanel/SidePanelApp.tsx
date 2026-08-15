import React, { useState, useEffect } from 'react';
import { FixerState, AuditSession, ComparisonReport, ScanProfileType } from '@shared/types';
import { DEFAULT_FIXER_STATE } from '@shared/constants';

import { Header } from './components/Header';
import { ScoreGauge } from './components/ScoreGauge';
import { TabNavigation, TabType } from './components/TabNavigation';
import { DashboardTab } from './components/DashboardTab';
import { PrivacySecurityTab } from './components/PrivacySecurityTab';
import { SeoHealthTab } from './components/SeoHealthTab';
import { AccessibilityTab } from './components/AccessibilityTab';
import { ReadabilityTab } from './components/ReadabilityTab';
import { FixerTab } from './components/FixerTab';
import { HistoryCompareTab } from './components/HistoryCompareTab';

export const SidePanelApp: React.FC = () => {
  const [tabId, setTabId] = useState<number | null>(null);
  const [tabUrl, setTabUrl] = useState<string>('');
  const [tabDomain, setTabDomain] = useState<string>('');

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [session, setSession] = useState<AuditSession | null>(null);
  const [settings, setSettings] = useState<FixerState>(DEFAULT_FIXER_STATE);
  const [history, setHistory] = useState<AuditSession[]>([]);
  const [compareReport, setCompareReport] = useState<ComparisonReport | null>(null);

  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<ScanProfileType>('full');
  const [activeHighlightSelector, setActiveHighlightSelector] = useState<string | null>(null);

  useEffect(() => {
    // 1. Fetch active browser tab details
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError || !tabs || tabs.length === 0) {
        setErrorMsg('Browser active tab context missing.');
        setLoading(false);
        return;
      }

      const activeTabObj = tabs[0];
      if (!activeTabObj.id || !activeTabObj.url || activeTabObj.url.startsWith('chrome://')) {
        setErrorMsg('WebLens cannot audit browser internal pages.');
        setLoading(false);
        return;
      }

      const tId = activeTabObj.id;
      setTabId(tId);
      setTabUrl(activeTabObj.url);
      setTabDomain(new URL(activeTabObj.url).hostname);

      // 2. Refresh initial state from extension background service worker
      refreshState(tId);
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

            chrome.runtime.sendMessage({ type: 'LOAD_HISTORY', payload: {} }, (historyRes) => {
              if (historyRes && historyRes.success && historyRes.data) {
                setHistory(historyRes.data);
              }
              setLoading(false);
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

  const handleToggleSetting = (key: keyof Omit<FixerState, 'version' | 'typography' | 'lastUpdatedAt'>, val: any) => {
    if (!tabId) return;
    const nextState = {
      ...settings,
      enabled: true,
      [key]: val,
    };
    setSettings(nextState);
    applySettings(nextState);
  };

  const handleTypographyChange = (key: string, val: any) => {
    if (!tabId) return;
    const nextState = {
      ...settings,
      enabled: true,
      typography: {
        ...settings.typography,
        [key]: val,
      },
    };
    setSettings(nextState);
    applySettings(nextState);
  };

  const handleResetSettings = () => {
    if (!tabId) return;
    setSettings(DEFAULT_FIXER_STATE);
    applySettings(DEFAULT_FIXER_STATE);
  };

  const applySettings = (state: FixerState) => {
    if (!tabId) return;
    chrome.runtime.sendMessage({
      type: 'APPLY_FIXER_SETTINGS',
      payload: { tabId, settings: state },
    });
  };

  const handleHighlight = (selector: string) => {
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
          }
        }
      );
    }
  };

  const handleExport = (format: 'md' | 'json' | 'csv') => {
    if (!session) return;
    chrome.runtime.sendMessage(
      { type: 'EXPORT_REPORT', payload: { id: session.id, format } },
      (res) => {
        if (res && res.success && res.data) {
          const mimeTypes = {
            json: 'application/json',
            csv: 'text/csv',
            md: 'text/markdown',
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

  const handleDeleteHistory = (id: string) => {
    chrome.runtime.sendMessage({ type: 'DELETE_HISTORY', payload: { id } }, () => {
      if (tabId) refreshState(tabId);
    });
  };

  const handleSaveNotes = (id: string, notes: string) => {
    chrome.runtime.sendMessage(
      { type: 'SAVE_ANNOTATION', payload: { id, notes } },
      (res) => {
        if (res && res.success && tabId) {
          refreshState(tabId);
        }
      }
    );
  };

  const handleCompare = (idA: string, idB: string) => {
    chrome.runtime.sendMessage(
      { type: 'COMPARE_AUDITS', payload: { idA, idB } },
      (res) => {
        if (res && res.success) {
          setCompareReport(res.data);
        }
      }
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center animate-fade-in" style={{ height: '80vh', padding: 24 }}>
        <div className="spinner" style={{ width: 36, height: 36, border: '4px solid var(--border-color)', borderTopColor: 'var(--accent-purple)', borderRadius: '50%' }}></div>
        <p style={{ marginTop: 16, color: 'var(--text-secondary)', fontWeight: 600 }}>Mounting WebLens Workspace...</p>
      </div>
    );
  }

  if (errorMsg && !scanning) {
    return (
      <div className="flex flex-col items-center justify-center animate-fade-in" style={{ height: '80vh', padding: 24, textAlign: 'center' }}>
        <span style={{ fontSize: 44 }}>⚠️</span>
        <h2 style={{ marginTop: 12, fontWeight: 700, color: 'var(--accent-red)' }}>Connection Warning</h2>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6, maxWidth: 280 }}>
          {errorMsg}
        </p>
        <button className="btn" style={{ marginTop: 20 }} onClick={handleRunScan}>
          Run Audit Scrape
        </button>
      </div>
    );
  }

  const issueCounts = {
    privacySecurity: session ? session.issues.filter((i) => i.category === 'privacy' || i.category === 'security').length : 0,
    seo: session ? session.issues.filter((i) => i.category === 'seo').length : 0,
    accessibility: session ? session.issues.filter((i) => i.category === 'accessibility').length : 0,
    ux: session ? session.issues.filter((i) => i.category === 'ux' || i.category === 'readability').length : 0,
  };

  return (
    <div className="flex flex-col animate-fade-in" style={{ padding: 14, minHeight: '100vh', maxWidth: 460, margin: '0 auto' }}>
      {/* Workspace Header */}
      <Header
        domain={tabDomain}
        url={tabUrl}
        scanProfile={selectedProfile}
        onProfileChange={setSelectedProfile}
        onReAudit={handleRunScan}
        onGenerateReport={handleExport}
        isAuditing={scanning}
      />

      {/* Score Gauge Dial */}
      <ScoreGauge scores={session?.scores} isAuditing={scanning} />

      {/* Segmented Pill Navigation */}
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} issueCounts={issueCounts} />

      {/* Tab View Container */}
      <main className="flex-1">
        {activeTab === 'overview' && (
          <DashboardTab
            session={session}
            onHighlight={handleHighlight}
            onTabChange={setActiveTab}
            onGenerateReport={handleExport}
          />
        )}

        {activeTab === 'privacy-security' && (
          <PrivacySecurityTab session={session} onHighlight={handleHighlight} />
        )}

        {activeTab === 'seo' && (
          <SeoHealthTab session={session} onHighlight={handleHighlight} />
        )}

        {activeTab === 'accessibility' && (
          <AccessibilityTab session={session} onHighlight={handleHighlight} />
        )}

        {activeTab === 'ux' && (
          <ReadabilityTab session={session} onHighlight={handleHighlight} />
        )}

        {activeTab === 'fixer' && (
          <FixerTab
            settings={settings}
            onSettingChange={handleToggleSetting}
            onTypographyChange={handleTypographyChange}
            onResetSettings={handleResetSettings}
          />
        )}

        {activeTab === 'history' && (
          <HistoryCompareTab
            currentSession={session}
            history={history}
            comparisonReport={compareReport}
            onExport={handleExport}
            onDeleteHistory={handleDeleteHistory}
            onSaveAnnotation={handleSaveNotes}
            onCompare={handleCompare}
          />
        )}
      </main>
    </div>
  );
};
