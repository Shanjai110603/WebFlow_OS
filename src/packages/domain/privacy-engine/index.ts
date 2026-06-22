import { AuditRule, RawIssue, ScanContext, IssueLocator } from '../../shared/types';
import { getUniqueCSSSelector, getDOMPath } from '../../shared/utils';

function createLocator(el: HTMLElement): IssueLocator {
  const rect = el.getBoundingClientRect();
  return {
    primarySelector: getUniqueCSSSelector(el),
    domPath: getDOMPath(el),
    tagName: el.tagName,
    boundingBoxHint: {
      x: Math.round(rect.left + window.scrollX),
      y: Math.round(rect.top + window.scrollY),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    }
  };
}

// --- 1. HTTP Page Insecure Rule ---
export const HttpPageRule: AuditRule = {
  id: 'http-page',
  name: 'HTTPS Security Auditor',
  category: 'privacy',
  severityDefault: 'critical',
  scoreImpact: 30,
  async run(context: ScanContext): Promise<RawIssue[]> {
    const win = context.window;
    const issues: RawIssue[] = [];

    if (win.location.protocol === 'http:') {
      issues.push({
        id: 'http-insecure-page',
        engine: 'privacy',
        ruleId: 'http-page',
        severity: 'critical',
        message: 'Webpage connection is unencrypted (HTTP). Transmitted data is vulnerable to packet interception.',
        evidence: win.location.href,
        metadata: {}
      });
    }

    return issues;
  }
};

// --- 2. Mixed Content Asset Rule ---
export const MixedContentRule: AuditRule = {
  id: 'mixed-content',
  name: 'Mixed Content Auditor',
  category: 'privacy',
  severityDefault: 'critical',
  scoreImpact: 10,
  async run(context: ScanContext): Promise<RawIssue[]> {
    const doc = context.document;
    const win = context.window;
    const issues: RawIssue[] = [];

    // Skip check if the parent site itself is insecure (dealt with in HTTP Page rule)
    if (win.location.protocol !== 'https:') return [];

    // Check script and image nodes for insecure HTTP sources
    const elements = doc.querySelectorAll('script[src], img[src], iframe[src], link[rel="stylesheet"]');
    elements.forEach(el => {
      const element = el as HTMLElement;
      const srcAttr = element.getAttribute('src') || element.getAttribute('href');
      
      if (srcAttr && srcAttr.startsWith('http://')) {
        issues.push({
          id: `mixed-${srcAttr.substring(0, 30)}-${Math.random()}`,
          engine: 'privacy',
          ruleId: 'mixed-content',
          severity: 'critical',
          locator: createLocator(element),
          message: `Secured page loads insecure mixed content asset: ${srcAttr}`,
          evidence: element.outerHTML.substring(0, 200),
          metadata: { insecureURL: srcAttr }
        });
      }
    });

    return issues;
  }
};

// --- 3. Trackers Scan Rule ---
export const KnownTrackerRule: AuditRule = {
  id: 'known-tracker',
  name: 'Tracker Request Sniffer',
  category: 'privacy',
  severityDefault: 'warning',
  scoreImpact: 5,
  async run(context: ScanContext): Promise<RawIssue[]> {
    const issues: RawIssue[] = [];

    context.resources.forEach(res => {
      if (res.tracker) {
        issues.push({
          id: `tracker-${res.domain}-${Math.random()}`,
          engine: 'privacy',
          ruleId: 'known-tracker',
          severity: 'warning',
          message: `Contacted tracker resource domain matching classifier: ${res.domain} (Category: ${res.trackerCategory || 'General'})`,
          evidence: res.url.substring(0, 100),
          metadata: { domain: res.domain, category: res.trackerCategory }
        });
      }
    });

    return issues;
  }
};

// --- 4. Cookie Banner Overlay Dark Pattern Rule ---
export const OverlayDarkPatternRule: AuditRule = {
  id: 'overlay-dark-pattern',
  name: 'Overlay Dark Pattern Detector',
  category: 'privacy',
  severityDefault: 'critical',
  scoreImpact: 15,
  async run(context: ScanContext): Promise<RawIssue[]> {
    const doc = context.document;
    const win = context.window;
    const issues: RawIssue[] = [];

    // Find large fixed overlays containing opt-in keywords
    const overlays = doc.querySelectorAll('div, section');
    overlays.forEach(el => {
      const element = el as HTMLElement;
      const style = win.getComputedStyle(element);

      if (style.position === 'fixed' || style.position === 'sticky') {
        const rect = element.getBoundingClientRect();
        const areaRatio = (rect.width * rect.height) / (win.innerWidth * win.innerHeight);

        // Scan overlays occupying visible space and containing cookie banner keywords
        if (areaRatio > 0.05) {
          const content = element.textContent?.toLowerCase() || '';
          const keywords = ['cookie', 'consent', 'subscribe', 'newsletter', 'accept tracking', 'tracking policy'];
          const matchesKeyword = keywords.some(k => content.includes(k));

          if (matchesKeyword) {
            issues.push({
              id: `dark-overlay-${Math.random()}`,
              engine: 'privacy',
              ruleId: 'overlay-dark-pattern',
              severity: 'critical',
              locator: createLocator(element),
              message: 'Full-screen overlay flags potential cookie banner or opt-in tracking pattern.',
              evidence: element.outerHTML.substring(0, 150),
              metadata: { areaRatio }
            });
          }
        }
      }
    });

    return issues;
  }
};
