import { createDefaultRegistry, IssueNormalizer } from '@domain/audit-core';
import { ScoringEngine } from '@domain/scoring-engine';
import { HistoryEngine } from '@domain/history-engine';
import { ReportEngine } from '@domain/report-engine';
import { StorageClient } from '@platform/chrome-storage';
import { CommandMap, CommandResponse, AuditSession, ResourceSummary, RawIssue, AuditIssue } from '@shared/types';
import { TRACKER_RULES } from '@shared/constants';
import { PayloadValidators } from '@shared/schemas';

const ruleRegistry = createDefaultRegistry();

// Keep message routing open
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  routeCommand(message, sender)
    .then(sendResponse)
    .catch((err) => {
      console.error('Background Command Route Error:', err);
      sendResponse({
        success: false,
        error: {
          code: 'SCAN_FAILED',
          message: err.message || 'An internal background exception occurred.'
        }
      });
    });
  return true;
});

async function routeCommand(message: any, sender: chrome.runtime.MessageSender): Promise<CommandResponse<any>> {
  const type = message.type as keyof CommandMap;
  const rawPayload = message.payload;

  const validator = PayloadValidators[type];
  if (!validator) {
    return {
      success: false,
      error: {
        code: 'UNKNOWN_COMMAND',
        message: `Command type ${type} is not registered.`
      }
    };
  }

  const parseResult = validator.safeParse(rawPayload);
  if (!parseResult.success) {
    return {
      success: false,
      error: {
        code: 'INVALID_PAYLOAD',
        message: 'Payload verification checks failed.',
        context: { errors: parseResult.error.format() as any }
      }
    };
  }

  const payload = parseResult.data as any;

  switch (type) {
    case 'RUN_AUDIT': {
      const tabId = payload.tabId;
      
      // 1. Programmatically inject content script if not loaded
      await ensureContentScriptInjected(tabId);

      // 2. Instruct content script to scrape webpage metrics
      const scrapeRes = await sendToTabWithTimeout(tabId, { type: 'EXECUTE_SCRAPE' }, 4000);
      if (!scrapeRes.success) {
        return scrapeRes;
      }

      const { url, title, domain, resources, htmlContext, viewport } = scrapeRes.data;

      // 3. Process resource tracking logs
      const { processedResources, trackerDomains, totalTrackers, isMixedContent } = processPageResources(url, domain, resources);

      // 4. Run rules engines
      const scanContext = {
        document: new DOMParser().parseFromString(htmlContext, 'text/html'),
        window: {
          location: { href: url, protocol: url.startsWith('https:') ? 'https:' : 'http:' }
        } as any,
        resources: processedResources
      };

      const rawIssues = await ruleRegistry.runAll(scanContext);

      // 5. Normalize raw issues
      const normalizedIssues: AuditIssue[] = rawIssues.map(IssueNormalizer.normalize);

      // 6. Compute scores & explanations
      const scores = ScoringEngine.calculate(
        rawIssues,
        url.startsWith('http:'),
        trackerDomains.size,
        isMixedContent
      );

      // 7. Assemble AuditSession record
      const fixerState = await StorageClient.getPreferences(domain);
      const session: AuditSession = {
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
        schemaVersion: 1,
        page: { url, domain, title, timestamp: Date.now() },
        startedAt: Date.now() - 200, // Approximate offset
        completedAt: Date.now(),
        scores,
        issues: normalizedIssues,
        resources: processedResources,
        fixerState,
        engineVersions: { core: '1.0.0', rules: '1.0.0' },
        metadata: {
          userAgent: sender.tab?.id ? 'WebLens OS Content Scraper' : navigator.userAgent,
          viewport
        }
      };

      // 8. Save session in storage
      await StorageClient.saveAuditSession(session);

      return { success: true, data: session };
    }

    case 'GET_AUDIT': {
      const tabId = payload.tabId;
      const tab = await getTab(tabId);
      if (!tab || !tab.url) return { success: true, data: null };
      
      const domain = new URL(tab.url).hostname;
      const dump = await StorageClient.getDump();
      const sessions = dump.history.filter(s => s.page.domain === domain);
      
      return { success: true, data: sessions.length ? sessions[0] : null };
    }

    case 'APPLY_FIXER_SETTINGS': {
      const tabId = payload.tabId;
      const settings = payload.settings;
      const tab = await getTab(tabId);
      if (!tab || !tab.url) return { success: true, data: undefined };

      const domain = new URL(tab.url).hostname;
      await StorageClient.savePreferences(domain, settings);

      // Programmatically apply fixer state inside the content tab
      await ensureContentScriptInjected(tabId);
      await sendToTabWithTimeout(tabId, { type: 'INJECT_FIXER_STATE', settings }, 3000);

      return { success: true, data: undefined };
    }

    case 'GET_FIXER_SETTINGS': {
      const tabId = payload.tabId;
      const tab = await getTab(tabId);
      if (!tab || !tab.url) return { success: true, data: DEFAULT_FIXER_STATE };

      const domain = new URL(tab.url).hostname;
      const settings = await StorageClient.getPreferences(domain);
      return { success: true, data: settings };
    }

    case 'HIGHLIGHT_ISSUE': {
      const tabId = payload.tabId;
      await ensureContentScriptInjected(tabId);
      return await sendToTabWithTimeout(tabId, { type: 'DRAW_HIGHLIGHT', selector: payload.selector }, 3000);
    }

    case 'CLEAR_HIGHLIGHT': {
      const tabId = payload.tabId;
      await ensureContentScriptInjected(tabId);
      return await sendToTabWithTimeout(tabId, { type: 'ERASE_HIGHLIGHT' }, 2000);
    }

    case 'LOAD_HISTORY': {
      const dump = await StorageClient.getDump();
      return { success: true, data: dump.history };
    }

    case 'DELETE_HISTORY': {
      await StorageClient.deleteAuditSession(payload.id);
      return { success: true, data: undefined };
    }

    case 'PIN_HISTORY': {
      await StorageClient.pinAuditSession(payload.id, payload.pinned);
      return { success: true, data: undefined };
    }

    case 'COMPARE_AUDITS': {
      const dump = await StorageClient.getDump();
      const sessionA = dump.history.find(s => s.id === payload.idA);
      const sessionB = dump.history.find(s => s.id === payload.idB);

      if (!sessionA || !sessionB) {
        return {
          success: false,
          error: { code: 'STORAGE_CORRUPTED', message: 'One or both target audits were not found in history database.' }
        };
      }

      const report = HistoryEngine.compare(sessionA, sessionB);
      return { success: true, data: report };
    }

    case 'EXPORT_REPORT': {
      const dump = await StorageClient.getDump();
      const session = dump.history.find(s => s.id === payload.id);
      if (!session) {
        return {
          success: false,
          error: { code: 'STORAGE_CORRUPTED', message: 'Target session report not found.' }
        };
      }

      const output = payload.format === 'json'
        ? ReportEngine.compileJSON(session)
        : ReportEngine.compileMarkdown(session);

      return { success: true, data: output };
    }

    default:
      return {
        success: false,
        error: { code: 'UNKNOWN_COMMAND', message: `Background received unknown action type.` }
      };
  }
}

async function ensureContentScriptInjected(tabId: number): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, { type: 'PING' }, (res) => {
      if (chrome.runtime.lastError || !res || !res.success) {
        // Ping failed, run executeScript to inject script programmatically
        chrome.scripting.executeScript(
          { target: { tabId }, files: ['apps/content/index.js'] },
          () => {
            if (chrome.runtime.lastError) {
              reject(new Error(`Failed to inject scanner script: ${chrome.runtime.lastError.message}`));
            } else {
              // Wait a brief tick for initialization
              setTimeout(resolve, 150);
            }
          }
        );
      } else {
        resolve();
      }
    });
  });
}

async function sendToTabWithTimeout(tabId: number, msg: any, timeoutMs: number): Promise<CommandResponse<any>> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve({
        success: false,
        error: { code: 'MESSAGING_TIMEOUT', message: `Tab request timeout exceeded (${timeoutMs}ms).` }
      });
    }, timeoutMs);

    chrome.tabs.sendMessage(tabId, msg, (response) => {
      clearTimeout(timer);
      if (chrome.runtime.lastError) {
        resolve({
          success: false,
          error: { code: 'CONTENT_SCRIPT_UNAVAILABLE', message: 'Tab scanner script connection failed.' }
        });
      } else if (response) {
        resolve(response);
      } else {
        resolve({
          success: false,
          error: { code: 'SCAN_FAILED', message: 'No response returned from the tab.' }
        });
      }
    });
  });
}

function processPageResources(
  pageUrl: string,
  pageDomain: string,
  resources: any[]
): {
  processedResources: ResourceSummary[];
  trackerDomains: Set<string>;
  totalTrackers: number;
  isMixedContent: boolean;
} {
  const processedResources: ResourceSummary[] = [];
  const trackerDomains = new Set<string>();
  let totalTrackers = 0;
  let isMixedContent = false;

  const isHttpsParent = pageUrl.startsWith('https:');

  resources.forEach((url: string) => {
    try {
      const resUrl = new URL(url);
      const resDomain = resUrl.hostname;
      const isThirdParty = resDomain !== pageDomain && !resDomain.endsWith('.' + pageDomain);

      // Sniff mixed content
      if (isHttpsParent && resUrl.protocol === 'http:') {
        isMixedContent = true;
      }

      // Check tracker matches
      let isTracker = false;
      let trackerCategory: 'analytics' | 'advertising' | 'social' | 'utility' | undefined;

      for (const rule of TRACKER_RULES) {
        if (url.includes(rule.pattern)) {
          isTracker = true;
          trackerCategory = rule.category;
          trackerDomains.add(resDomain);
          totalTrackers++;
          break;
        }
      }

      processedResources.push({
        url,
        domain: resDomain,
        type: 'resource',
        thirdParty: isThirdParty,
        tracker: isTracker,
        trackerCategory
      });
    } catch {
      // Ignore invalid URLs
    }
  });

  return {
    processedResources,
    trackerDomains,
    totalTrackers,
    isMixedContent
  };
}

async function getTab(tabId: number): Promise<chrome.tabs.Tab | null> {
  return new Promise((resolve) => {
    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError || !tab) resolve(null);
      else resolve(tab);
    });
  });
}
