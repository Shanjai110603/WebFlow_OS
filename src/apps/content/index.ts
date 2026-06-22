import { FixerController } from '@domain/page-fixer';
import { HighlightingEngine } from '@domain/highlighting-engine';
import { FixerState } from '@shared/types';

const fixer = new FixerController(document, window);
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
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const type = message.type;

  switch (type) {
    case 'PING':
      sendResponse({ success: true });
      break;

    case 'EXECUTE_SCRAPE':
      try {
        const resources = window.performance
          ? window.performance.getEntriesByType('resource').map(r => r.name)
          : [];

        sendResponse({
          success: true,
          data: {
            url: window.location.href,
            domain: window.location.hostname,
            title: document.title,
            resources,
            htmlContext: document.documentElement.outerHTML,
            viewport: { width: window.innerWidth, height: window.innerHeight }
          }
        });
      } catch (err: any) {
        sendResponse({
          success: false,
          error: { code: 'SCAN_FAILED', message: err.message || 'Scrape execution failed.' }
        });
      }
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
    const result = original.apply(this, args);
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
