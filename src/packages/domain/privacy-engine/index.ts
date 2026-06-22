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
        const viewportArea = win.innerWidth * win.innerHeight;
        const areaRatio = viewportArea > 0 ? (rect.width * rect.height) / viewportArea : 0;

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

// --- 5. Insecure Forms HTTP Rule ---
export const InsecureFormsHttpRule: AuditRule = {
  id: 'insecure-forms-http',
  name: 'Insecure Input Fields Auditor',
  category: 'privacy',
  severityDefault: 'critical',
  scoreImpact: 15,
  async run(context: ScanContext): Promise<RawIssue[]> {
    const win = context.window;
    const doc = context.document;
    const issues: RawIssue[] = [];

    if (win.location.protocol === 'http:') {
      const sensitiveInputs = doc.querySelectorAll('input[type="password"], input[type="email"], input[type="tel"], input[name*="card"], input[name*="pass"]');
      sensitiveInputs.forEach(input => {
        const el = input as HTMLElement;
        issues.push({
          id: `insecure-input-${Math.random()}`,
          engine: 'privacy',
          ruleId: 'insecure-forms-http',
          severity: 'critical',
          locator: createLocator(el),
          message: `Sensitive input field <${el.tagName.toLowerCase()}> is served over insecure HTTP connection, risking credentials capture.`,
          evidence: el.outerHTML.substring(0, 150),
          metadata: {},
          confidence: 'confirmed',
          suggestedFix: 'Configure secure SSL certificates (HTTPS) for the hosting webserver and enforce secure redirects.'
        });
      });
    }

    return issues;
  }
};


// --- 7. Suspicious Consent Buttons Rule ---
export const SuspiciousConsentButtonsRule: AuditRule = {
  id: 'suspicious-consent-buttons',
  name: 'Consent Button Dark Patterns Auditor',
  category: 'privacy',
  severityDefault: 'warning',
  scoreImpact: 10,
  async run(context: ScanContext): Promise<RawIssue[]> {
    const doc = context.document;
    const issues: RawIssue[] = [];
    
    const banners = doc.querySelectorAll('div, section');
    banners.forEach(b => {
      const banner = b as HTMLElement;
      const content = banner.textContent?.toLowerCase() || '';
      if (content.includes('cookie') && (content.includes('consent') || content.includes('agree') || content.includes('accept'))) {
        const buttons = Array.from(banner.querySelectorAll('button, [role="button"]')) as HTMLElement[];
        if (buttons.length > 0) {
          const hasAccept = buttons.some(btn => {
            const text = btn.textContent?.toLowerCase() || '';
            return text.includes('accept') || text.includes('agree') || text.includes('allow');
          });
          const hasReject = buttons.some(btn => {
            const text = btn.textContent?.toLowerCase() || '';
            return text.includes('reject') || text.includes('decline') || text.includes('deny') || text.includes('manage') || text.includes('settings');
          });

          if (hasAccept && !hasReject) {
            issues.push({
              id: `dark-consent-${Math.random()}`,
              engine: 'privacy',
              ruleId: 'suspicious-consent-buttons',
              severity: 'warning',
              locator: createLocator(banner),
              message: 'Cookie consent dialog offers prominent "Accept" choices without an immediate matching "Reject" or "Manage" options.',
              evidence: banner.outerHTML.substring(0, 200),
              metadata: {},
              confidence: 'heuristic',
              suggestedFix: 'Include clear, prominent "Reject All" or "Manage Preferences" links next to the main "Accept" button.'
            });
          }
        }
      }
    });

    return issues;
  }
};

// --- 8. Fingerprinting Heuristics Rule ---
export const FingerprintingHeuristicsRule: AuditRule = {
  id: 'fingerprinting-heuristics',
  name: 'Device Fingerprinting Auditor',
  category: 'privacy',
  severityDefault: 'warning',
  scoreImpact: 10,
  async run(context: ScanContext): Promise<RawIssue[]> {
    const issues: RawIssue[] = [];
    
    context.resources.forEach(res => {
      const url = res.url.toLowerCase();
      if (url.includes('fingerprint') || url.includes('device-id') || url.includes('client-id') || url.includes('canvas-id')) {
        issues.push({
          id: `fingerprint-${res.domain}-${Math.random()}`,
          engine: 'privacy',
          ruleId: 'fingerprinting-heuristics',
          severity: 'warning',
          message: `Third-party resource matching fingerprinting signature detected: ${res.domain}`,
          evidence: res.url.substring(0, 100),
          metadata: { domain: res.domain },
          confidence: 'heuristic',
          suggestedFix: 'Deactivate fingerprinting analytics scripts that build client hardware profiles without consent.'
        });
      }
    });

    return issues;
  }
};
