import { AuditRule, RawIssue, ScanContext } from '../../shared/types';

export const UnsizedMediaClsRule: AuditRule = {
  id: 'unsized-media-cls',
  name: 'Unsized Media Elements (CLS Risk)',
  category: 'ux',
  severityDefault: 'warning',
  scoreImpact: 10,
  async run(context: ScanContext): Promise<RawIssue[]> {
    const doc = context.document;
    const mediaEls = Array.from(doc.querySelectorAll('img, iframe'));
    const issues: RawIssue[] = [];

    let count = 0;
    mediaEls.forEach((el) => {
      const hasWidth = el.hasAttribute('width');
      const hasHeight = el.hasAttribute('height');
      const style = el.getAttribute('style') || '';
      const hasAspectStyle = style.includes('aspect-ratio') || (style.includes('width') && style.includes('height'));

      if (!hasAspectStyle && (!hasWidth || !hasHeight) && count < 5) {
        count++;
        const tag = el.tagName.toLowerCase();
        const src = el.getAttribute('src') || el.getAttribute('alt') || 'element';

        issues.push({
          id: `cls-unsized-${tag}-${count}`,
          engine: 'ux',
          ruleId: 'unsized-media-cls',
          severity: 'warning',
          locator: {
            primarySelector: `${tag}${el.id ? '#' + el.id : ''}`
          },
          message: `<${tag}> element lacks explicit width and height dimensions, causing Cumulative Layout Shifts (CLS) as content loads.`,
          evidence: `<${tag} src="${src.substring(0, 50)}...">`,
          metadata: { tag, src },
          confidence: 'confirmed',
          suggestedFix: `Set explicit width="..." and height="..." attributes or CSS aspect-ratio properties on the <${tag}> tag.`
        });
      }
    });

    return issues;
  }
};

export const RenderBlockingScriptsRule: AuditRule = {
  id: 'render-blocking-scripts',
  name: 'Render-Blocking Scripts in Head',
  category: 'ux',
  severityDefault: 'warning',
  scoreImpact: 10,
  async run(context: ScanContext): Promise<RawIssue[]> {
    const doc = context.document;
    const headScripts = Array.from(doc.querySelectorAll('head script[src]'));
    const issues: RawIssue[] = [];

    let count = 0;
    headScripts.forEach((script) => {
      const hasDefer = script.hasAttribute('defer');
      const hasAsync = script.hasAttribute('async');
      const type = script.getAttribute('type') || '';
      const isModule = type === 'module';

      if (!hasDefer && !hasAsync && !isModule && count < 4) {
        count++;
        const src = script.getAttribute('src') || '';
        issues.push({
          id: `render-blocking-script-${count}`,
          engine: 'ux',
          ruleId: 'render-blocking-scripts',
          severity: 'warning',
          locator: {
            primarySelector: `script[src="${src}"]`
          },
          message: `Synchronous script in <head> blocks document HTML parsing and delays First Contentful Paint (FCP).`,
          evidence: script.outerHTML.substring(0, 100),
          metadata: { src },
          confidence: 'confirmed',
          suggestedFix: 'Add the `defer` or `async` attribute to the external script tag.'
        });
      }
    });

    return issues;
  }
};

export const ExcessiveDomBudgetRule: AuditRule = {
  id: 'excessive-dom-budget',
  name: 'Excessive DOM Size & Tree Density',
  category: 'ux',
  severityDefault: 'warning',
  scoreImpact: 15,
  async run(context: ScanContext): Promise<RawIssue[]> {
    const doc = context.document;
    const totalElements = doc.querySelectorAll('*').length;

    if (totalElements > 1000) {
      return [{
        id: 'excessive-dom-budget-issue',
        engine: 'ux',
        ruleId: 'excessive-dom-budget',
        severity: totalElements > 2000 ? 'critical' : 'warning',
        message: `High DOM node density (${totalElements} elements). Excessive DOM size increases memory usage and degrades layout recalculation speed.`,
        evidence: `Total DOM Elements: ${totalElements}`,
        metadata: { count: totalElements },
        confidence: 'confirmed',
        suggestedFix: 'Simplify component trees, paginate long lists, and remove hidden offscreen elements.'
      }];
    }
    return [];
  }
};

export const LazyLoadingImagesRule: AuditRule = {
  id: 'lazy-loading-images',
  name: 'Offscreen Images Missing Lazy Loading',
  category: 'ux',
  severityDefault: 'info',
  scoreImpact: 5,
  async run(context: ScanContext): Promise<RawIssue[]> {
    const doc = context.document;
    const images = Array.from(doc.querySelectorAll('img'));
    const issues: RawIssue[] = [];

    if (images.length > 5) {
      const nonLazyImages = images.filter(img => !img.hasAttribute('loading'));
      if (nonLazyImages.length > 3) {
        issues.push({
          id: 'lazy-loading-images-issue',
          engine: 'ux',
          ruleId: 'lazy-loading-images',
          severity: 'info',
          message: `${nonLazyImages.length} images are loaded eagerly without \`loading="lazy"\`. Non-critical offscreen images should be deferred.`,
          evidence: `${nonLazyImages.length} unlazy images found`,
          metadata: { count: nonLazyImages.length },
          confidence: 'heuristic',
          suggestedFix: 'Add `loading="lazy"` attributes to non-hero offscreen image tags.'
        });
      }
    }

    return issues;
  }
};

export const PERFORMANCE_RULES: AuditRule[] = [
  UnsizedMediaClsRule,
  RenderBlockingScriptsRule,
  ExcessiveDomBudgetRule,
  LazyLoadingImagesRule,
];

export class PerformanceEngine {
  public static async run(context: ScanContext): Promise<RawIssue[]> {
    const issuesList: RawIssue[] = [];
    for (const rule of PERFORMANCE_RULES) {
      try {
        const issues = await rule.run(context);
        issuesList.push(...issues);
      } catch (err) {
        console.error(`Performance Rule error [${rule.id}]:`, err);
      }
    }
    return issuesList;
  }
}
