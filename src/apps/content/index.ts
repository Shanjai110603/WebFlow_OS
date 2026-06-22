import { FixerController } from '@domain/page-fixer';
import { HighlightingEngine } from '@domain/highlighting-engine';
import { createDefaultRegistry } from '@domain/audit-core';
import { TRACKER_RULES } from '@shared/constants';
import { FixerState, ResourceSummary } from '@shared/types';

const fixer = new FixerController(document, window);
const ruleRegistry = createDefaultRegistry();

function processPageResources(
  pageUrl: string,
  pageDomain: string,
  resources: string[]
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

let activeSettings: FixerState | null = null;
let currentHighlightSelector: string | null = null;

// Initialize preferences by querying background script storage on script injection
chrome.runtime.sendMessage({ type: 'GET_FIXER_SETTINGS', payload: { tabId: 0 } }, (res) => {
  if (res && res.success && res.data) {
    activeSettings = res.data;
    if (activeSettings?.enabled) {
      fixer.apply(activeSettings);
    }
  }
});

// --- Message Router ---
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const type = message.type;

  switch (type) {
    case 'PING':
      sendResponse({ success: true });
      break;

    case 'EXECUTE_SCRAPE':
      (async () => {
        try {
          const rawResources = window.performance
            ? window.performance.getEntriesByType('resource').map(r => r.name)
            : [];

          const url = window.location.href;
          const domain = window.location.hostname;
          const title = document.title;

          // Process resources and trackers locally in page context
          const { processedResources, trackerDomains, isMixedContent } = processPageResources(
            url,
            domain,
            rawResources
          );

          // Build context for rule scanning on native DOM tree
          const scanContext = {
            document,
            window,
            resources: processedResources
          };

          const rawIssues = await ruleRegistry.runAll(scanContext);

          sendResponse({
            success: true,
            data: {
              url,
              domain,
              title,
              rawIssues,
              processedResources,
              trackerDomainsCount: trackerDomains.size,
              isMixedContent,
              viewport: { width: window.innerWidth, height: window.innerHeight }
            }
          });
        } catch (err: any) {
          sendResponse({
            success: false,
            error: { code: 'SCAN_FAILED', message: err.message || 'Scrape and audit scan execution failed.' }
          });
        }
      })();
      break;

    case 'INJECT_FIXER_STATE':
      try {
        activeSettings = message.settings;
        if (activeSettings) {
          fixer.apply(activeSettings);
        } else {
          fixer.rollback();
        }
        sendResponse({ success: true });
      } catch (err: any) {
        sendResponse({
          success: false,
          error: { code: 'SCAN_FAILED', message: err.message || 'Page fixer injection failed.' }
        });
      }
      break;

    case 'DRAW_HIGHLIGHT':
      try {
        currentHighlightSelector = message.selector;
        HighlightingEngine.highlight(document, window, { primarySelector: message.selector });
        sendResponse({ success: true });
      } catch (err: any) {
        sendResponse({
          success: false,
          error: { code: 'HIGHLIGHT_FAILED', message: err.message || 'Overlay highlighting failed.' }
        });
      }
      break;

    case 'ERASE_HIGHLIGHT':
      currentHighlightSelector = null;
      HighlightingEngine.clear(document);
      sendResponse({ success: true });
      break;

    case 'ROUTE_CHANGED':
      // Handle background-triggered route transitions
      handleRouteTransition();
      sendResponse({ success: true });
      break;

    default:
      sendResponse({ success: false, error: { code: 'UNKNOWN_COMMAND', message: 'Unhandled content command.' } });
  }
  return true;
});

// --- Dynamic MutationObserver & SPA Watcher ---
let mutationDebounceTimer: any = null;

const observer = new MutationObserver(() => {
  if (mutationDebounceTimer) clearTimeout(mutationDebounceTimer);
  mutationDebounceTimer = setTimeout(() => {
    // 1. Reapply active page fixer rules if enabled
    if (activeSettings && activeSettings.enabled) {
      fixer.apply(activeSettings);
    }

    // 2. Reposition the active highlight overlay box if elements moved due to re-renders
    if (currentHighlightSelector) {
      try {
        HighlightingEngine.highlight(document, window, { primarySelector: currentHighlightSelector });
      } catch {
        // Element is missing from DOM after update, clear highlight quietly
        HighlightingEngine.clear(document);
        currentHighlightSelector = null;
      }
    }
  }, 300);
});

// Start layout observations once body mounts
if (document.body) {
  observer.observe(document.body, { childList: true, subtree: true });
} else {
  document.addEventListener('DOMContentLoaded', () => {
    if (document.body) observer.observe(document.body, { childList: true, subtree: true });
  });
}

// --- Monkeypatch pushState & replaceState for Local SPA Route Sniffing ---
function wrapHistoryEvent(type: 'pushState' | 'replaceState') {
  const original = window.history[type];
  return function (this: any, ...args: any[]) {
    const result = (original as any).apply(this, args);
    const event = new CustomEvent('weblensHistoryChange', { detail: { type } });
    window.dispatchEvent(event);
    return result;
  };
}

window.history.pushState = wrapHistoryEvent('pushState');
window.history.replaceState = wrapHistoryEvent('replaceState');

window.addEventListener('weblensHistoryChange', handleRouteTransition);
window.addEventListener('popstate', handleRouteTransition);
window.addEventListener('hashchange', handleRouteTransition);

function handleRouteTransition() {
  // Clear any existing highlight overlay first to prevent float issues on route changes
  HighlightingEngine.clear(document);
  currentHighlightSelector = null;

  // Retrieve storage state preferences for new view domain
  chrome.runtime.sendMessage({ type: 'GET_FIXER_SETTINGS', payload: { tabId: 0 } }, (res) => {
    if (res && res.success && res.data) {
      activeSettings = res.data;
      if (activeSettings?.enabled) {
        fixer.apply(activeSettings);
      } else {
        fixer.rollback();
      }
    }
  });
}
