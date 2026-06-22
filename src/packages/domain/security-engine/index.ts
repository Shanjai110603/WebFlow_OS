import { AuditRule, RawIssue, ScanContext } from '../../shared/types';

export const SECURITY_RULES: AuditRule[] = [
  {
    id: 'insecure-transport-http',
    name: 'Insecure Connection (HTTP)',
    category: 'security',
    severityDefault: 'critical',
    scoreImpact: 30,
    async run(context: ScanContext): Promise<RawIssue[]> {
      const url = context.window.location.href;
      if (url.startsWith('http:')) {
        return [{
          id: `sec-transport-http`,
          engine: 'security',
          ruleId: 'insecure-transport-http',
          severity: 'critical',
          message: 'The page is served over insecure HTTP connection, leaving data sent vulnerable to eavesdropping.',
          metadata: { url },
          confidence: 'confirmed'
        }];
      }
      return [];
    }
  },
  {
    id: 'mixed-content-resource',
    name: 'Mixed Content Resources',
    category: 'security',
    severityDefault: 'warning',
    scoreImpact: 15,
    async run(context: ScanContext): Promise<RawIssue[]> {
      const parentIsHttps = context.window.location.protocol === 'https:';
      if (!parentIsHttps) return [];

      const issues: RawIssue[] = [];
      context.resources.forEach((res, index) => {
        if (res.url.startsWith('http:')) {
          issues.push({
            id: `sec-mixed-content-${index}`,
            engine: 'security',
            ruleId: 'mixed-content-resource',
            severity: 'warning',
            message: `Resource is loaded insecurely over HTTP from a secure page: ${res.url}`,
            evidence: res.url,
            locator: { primarySelector: `img[src="${res.url}"], script[src="${res.url}"], link[href="${res.url}"]` },
            metadata: { url: res.url },
            confidence: 'confirmed'
          });
        }
      });
      return issues;
    }
  },
  {
    id: 'unsafe-target-blank',
    name: 'Unsafe Target Blank Link',
    category: 'security',
    severityDefault: 'warning',
    scoreImpact: 10,
    async run(context: ScanContext): Promise<RawIssue[]> {
      const doc = context.document;
      const issues: RawIssue[] = [];
      const links = Array.from(doc.querySelectorAll('a[target="_blank"]'));

      links.forEach((link, idx) => {
        const href = link.getAttribute('href') || '';
        const rel = link.getAttribute('rel') || '';
        
        // Skip same-origin links
        if (!href || href.startsWith('/') || href.startsWith('#') || href.startsWith(context.window.location.origin)) {
          return;
        }

        const missingNoopener = !rel.includes('noopener') && !rel.includes('noreferrer');
        if (missingNoopener) {
          issues.push({
            id: `sec-target-blank-${idx}`,
            engine: 'security',
            ruleId: 'unsafe-target-blank',
            severity: 'warning',
            locator: {
              primarySelector: link.className ? `a.${link.className.split(' ').join('.')}[target="_blank"]` : `a[target="_blank"]`,
              xpath: `//a[@target='_blank'][${idx + 1}]`
            },
            message: 'External link opens in a new tab without rel="noopener" or rel="noreferrer", exposing to reverse tab-nabbing vulnerabilities.',
            evidence: link.outerHTML,
            metadata: { href, rel },
            confidence: 'confirmed',
            suggestedFix: 'Add rel="noopener noreferrer" attribute to the anchor link.'
          });
        }
      });

      return issues;
    }
  },
  {
    id: 'unsafe-javascript-links',
    name: 'Javascript Protocol Link',
    category: 'security',
    severityDefault: 'warning',
    scoreImpact: 10,
    async run(context: ScanContext): Promise<RawIssue[]> {
      const doc = context.document;
      const issues: RawIssue[] = [];
      const links = Array.from(doc.querySelectorAll('a[href^="javascript:"]'));

      links.forEach((link, idx) => {
        const href = link.getAttribute('href') || '';
        issues.push({
          id: `sec-js-link-${idx}`,
          engine: 'security',
          ruleId: 'unsafe-javascript-links',
          severity: 'warning',
          locator: {
            primarySelector: `a[href="${href}"]`
          },
          message: 'The link uses javascript: protocol to execute inline script code, which weakens CSP protections.',
          evidence: link.outerHTML,
          metadata: { href },
          confidence: 'confirmed',
          suggestedFix: 'Replace javascript: href with standard buttons and register click events via event listeners.'
        });
      });

      return issues;
    }
  },
  {
    id: 'insecure-form-action',
    name: 'Insecure Form Action Target',
    category: 'security',
    severityDefault: 'critical',
    scoreImpact: 25,
    async run(context: ScanContext): Promise<RawIssue[]> {
      const doc = context.document;
      const issues: RawIssue[] = [];
      const forms = Array.from(doc.querySelectorAll('form[action]'));

      forms.forEach((form, idx) => {
        const action = form.getAttribute('action') || '';
        if (action.startsWith('http:')) {
          issues.push({
            id: `sec-form-action-${idx}`,
            engine: 'security',
            ruleId: 'insecure-form-action',
            severity: 'critical',
            locator: {
              primarySelector: `form[action="${action}"]`
            },
            message: 'Form action target URL uses insecure HTTP protocols. Data submitted is unencrypted.',
            evidence: form.outerHTML,
            metadata: { action },
            confidence: 'confirmed',
            suggestedFix: 'Change the action URL target protocol to HTTPS.'
          });
        }
      });

      return issues;
    }
  },
  {
    id: 'insecure-password-form',
    name: 'Password Field on HTTP Page',
    category: 'security',
    severityDefault: 'critical',
    scoreImpact: 30,
    async run(context: ScanContext): Promise<RawIssue[]> {
      const url = context.window.location.href;
      const isHttp = url.startsWith('http:');
      if (!isHttp) return [];

      const doc = context.document;
      const passInputs = doc.querySelectorAll('input[type="password"]');

      if (passInputs.length > 0) {
        return [{
          id: 'sec-password-http',
          engine: 'security',
          ruleId: 'insecure-password-form',
          severity: 'critical',
          message: 'Credential fields are present on an insecure plain HTTP page, exposing users to password theft.',
          locator: { primarySelector: 'input[type="password"]' },
          evidence: Array.from(passInputs).map(el => el.outerHTML).join(', '),
          metadata: { inputCount: passInputs.length },
          confidence: 'confirmed'
        }];
      }

      return [];
    }
  },
  {
    id: 'risky-inline-event-handlers',
    name: 'Inline Event Handlers Used',
    category: 'security',
    severityDefault: 'info',
    scoreImpact: 5,
    async run(context: ScanContext): Promise<RawIssue[]> {
      const doc = context.document;
      const issues: RawIssue[] = [];
      
      // Look for any elements containing common inline script event attributes
      const allElements = Array.from(doc.querySelectorAll('*'));
      let count = 0;

      allElements.forEach((el) => {
        const inlineAttrs = Array.from(el.attributes).filter(attr => attr.name.startsWith('on'));
        if (inlineAttrs.length > 0 && count < 10) {
          count++;
          issues.push({
            id: `sec-inline-handler-${count}`,
            engine: 'security',
            ruleId: 'risky-inline-event-handlers',
            severity: 'info',
            locator: {
              primarySelector: el.tagName.toLowerCase() + (el.id ? `#${el.id}` : '')
            },
            message: `Inline event handler used (${inlineAttrs[0].name}). Inline script bindings weaken CSP policies.`,
            evidence: el.outerHTML,
            metadata: { attribute: inlineAttrs[0].name },
            confidence: 'confirmed',
            suggestedFix: 'Remove inline handlers and attach listener functions dynamically using addEventListener.'
          });
        }
      });

      return issues.slice(0, 5); // Cap to avoid flooding details list
    }
  },
  {
    id: 'deceptive-interaction-blocker',
    name: 'Deceptive Full-page Overlays',
    category: 'security',
    severityDefault: 'warning',
    scoreImpact: 15,
    async run(context: ScanContext): Promise<RawIssue[]> {
      const doc = context.document;
      const win = context.window;
      const issues: RawIssue[] = [];
      const overlays = Array.from(doc.querySelectorAll('div, section, dialog'));

      for (const element of overlays) {
        const htmlEl = element as HTMLElement;
        if (!htmlEl.style) continue;

        try {
          const style = win.getComputedStyle(htmlEl);
          const isFixedOrAbsolute = style.position === 'fixed' || style.position === 'absolute';
          const zIndex = parseInt(style.zIndex, 10);
          const isHighZIndex = zIndex > 999;
          
          const rect = htmlEl.getBoundingClientRect();
          const coversViewport = rect.width >= win.innerWidth * 0.9 && rect.height >= win.innerHeight * 0.9;

          if (isFixedOrAbsolute && isHighZIndex && coversViewport && style.display !== 'none' && style.visibility !== 'hidden') {
            issues.push({
              id: 'sec-overlay-blocker',
              engine: 'security',
              ruleId: 'deceptive-interaction-blocker',
              severity: 'warning',
              locator: {
                primarySelector: htmlEl.tagName.toLowerCase() + (htmlEl.id ? `#${htmlEl.id}` : '') + (htmlEl.className ? `.${htmlEl.className.split(' ').join('.')}` : '')
              },
              message: 'A large, high-zIndex overlay layout is active, which may deceptively intercept user interactions or clicks.',
              evidence: htmlEl.outerHTML.substring(0, 200),
              metadata: { zIndex, width: rect.width, height: rect.height },
              confidence: 'heuristic',
              suggestedFix: 'Review overlay elements; ensure overlays are user-dismissable and do not cover key page options.'
            });
            break; // Stop at first major finding
          }
        } catch {
          // Ignore style calculation errors
        }
      }

      return issues;
    }
  }
];

export class SecurityEngine {
  public static async run(context: ScanContext): Promise<RawIssue[]> {
    const issuesList: RawIssue[] = [];
    for (const rule of SECURITY_RULES) {
      try {
        const issues = await rule.run(context);
        issuesList.push(...issues);
      } catch (err) {
        console.error(`Security Rule run error [${rule.id}]:`, err);
      }
    }
    return issuesList;
  }
}
