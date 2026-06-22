import { AuditRule, RawIssue, ScanContext } from '../../shared/types';

export const SEO_RULES: AuditRule[] = [
  {
    id: 'missing-seo-title',
    name: 'Missing Page Title Tag',
    category: 'seo',
    severityDefault: 'critical',
    scoreImpact: 20,
    async run(context: ScanContext): Promise<RawIssue[]> {
      const doc = context.document;
      const titleEl = doc.querySelector('title');
      const titleText = titleEl ? titleEl.textContent?.trim() || '' : '';

      if (!titleEl || !titleText) {
        return [{
          id: 'seo-title-missing',
          engine: 'seo',
          ruleId: 'missing-seo-title',
          severity: 'critical',
          message: 'The page is missing a <title> tag. Search engines require page titles to list search snippets.',
          confidence: 'confirmed',
          metadata: {}
        }];
      }
      return [];
    }
  },
  {
    id: 'seo-title-length',
    name: 'Suboptimal Title tag length',
    category: 'seo',
    severityDefault: 'warning',
    scoreImpact: 10,
    async run(context: ScanContext): Promise<RawIssue[]> {
      const doc = context.document;
      const titleEl = doc.querySelector('title');
      const titleText = titleEl ? titleEl.textContent?.trim() || '' : '';

      if (titleEl && titleText) {
        const len = titleText.length;
        if (len < 30 || len > 60) {
          return [{
            id: 'seo-title-length-issue',
            engine: 'seo',
            ruleId: 'seo-title-length',
            severity: 'warning',
            message: `Title length (${len} chars) is outside optimal ranges (30-60 characters). It may be clipped or unclear on Search Results.`,
            evidence: titleText,
            metadata: { length: len },
            confidence: 'heuristic',
            suggestedFix: 'Re-word the title tag to stay between 30 and 60 characters.'
          }];
        }
      }
      return [];
    }
  },
  {
    id: 'missing-seo-description',
    name: 'Missing Meta Description',
    category: 'seo',
    severityDefault: 'critical',
    scoreImpact: 15,
    async run(context: ScanContext): Promise<RawIssue[]> {
      const doc = context.document;
      const descEl = doc.querySelector('meta[name="description"]');
      const descText = descEl ? descEl.getAttribute('content')?.trim() || '' : '';

      if (!descEl || !descText) {
        return [{
          id: 'seo-desc-missing',
          engine: 'seo',
          ruleId: 'missing-seo-description',
          severity: 'critical',
          message: 'The page lacks a meta description tag. Search engines will fallback to scrap content snippets.',
          confidence: 'confirmed',
          suggestedFix: 'Add a <meta name="description" content="..."> tag inside the <head> block.',
          metadata: {}
        }];
      }
      return [];
    }
  },
  {
    id: 'seo-description-length',
    name: 'Suboptimal Description Length',
    category: 'seo',
    severityDefault: 'warning',
    scoreImpact: 10,
    async run(context: ScanContext): Promise<RawIssue[]> {
      const doc = context.document;
      const descEl = doc.querySelector('meta[name="description"]');
      const descText = descEl ? descEl.getAttribute('content')?.trim() || '' : '';

      if (descEl && descText) {
        const len = descText.length;
        if (len < 70 || len > 160) {
          return [{
            id: 'seo-desc-length-issue',
            engine: 'seo',
            ruleId: 'seo-description-length',
            severity: 'warning',
            message: `Meta description length (${len} chars) is outside recommended thresholds (70-160 characters).`,
            evidence: descText,
            metadata: { length: len },
            confidence: 'heuristic',
            suggestedFix: 'Optimize the meta description content to fit between 70 and 160 characters.'
          }];
        }
      }
      return [];
    }
  },
  {
    id: 'missing-canonical-tag',
    name: 'Missing Canonical URL Link',
    category: 'seo',
    severityDefault: 'warning',
    scoreImpact: 10,
    async run(context: ScanContext): Promise<RawIssue[]> {
      const doc = context.document;
      const canonicalEl = doc.querySelector('link[rel="canonical"]');
      const href = canonicalEl ? canonicalEl.getAttribute('href')?.trim() || '' : '';

      if (!canonicalEl || !href) {
        return [{
          id: 'seo-canonical-missing',
          engine: 'seo',
          ruleId: 'missing-canonical-tag',
          severity: 'warning',
          message: 'Canonical link tag is absent. Search crawlers might index duplicate domain variations.',
          confidence: 'confirmed',
          suggestedFix: 'Inject a <link rel="canonical" href="..."> element referencing the authoritative URL.',
          metadata: {}
        }];
      }
      return [];
    }
  },
  {
    id: 'missing-viewport-meta',
    name: 'Missing Mobile Viewport Meta',
    category: 'seo',
    severityDefault: 'warning',
    scoreImpact: 10,
    async run(context: ScanContext): Promise<RawIssue[]> {
      const doc = context.document;
      const viewportEl = doc.querySelector('meta[name="viewport"]');
      if (!viewportEl) {
        return [{
          id: 'seo-viewport-missing',
          engine: 'seo',
          ruleId: 'missing-viewport-meta',
          severity: 'warning',
          message: 'The page lacks a viewport meta tag. Google penalizes pages that fail mobile indexing checks.',
          confidence: 'confirmed',
          suggestedFix: 'Add <meta name="viewport" content="width=device-width, initial-scale=1.0"> in the head section.',
          metadata: {}
        }];
      }
      return [];
    }
  },
  {
    id: 'missing-h1',
    name: 'Missing H1 Primary Heading',
    category: 'seo',
    severityDefault: 'critical',
    scoreImpact: 20,
    async run(context: ScanContext): Promise<RawIssue[]> {
      const doc = context.document;
      const h1s = doc.querySelectorAll('h1');
      if (h1s.length === 0) {
        return [{
          id: 'seo-h1-missing',
          engine: 'seo',
          ruleId: 'missing-h1',
          severity: 'critical',
          message: 'Page does not contain any <h1> tags. A single <h1> is required to summarize the topic context.',
          confidence: 'confirmed',
          metadata: {}
        }];
      }
      return [];
    }
  },
  {
    id: 'multiple-h1s',
    name: 'Multiple H1 Tags Detected',
    category: 'seo',
    severityDefault: 'warning',
    scoreImpact: 10,
    async run(context: ScanContext): Promise<RawIssue[]> {
      const doc = context.document;
      const h1s = doc.querySelectorAll('h1');
      if (h1s.length > 1) {
        return [{
          id: 'seo-h1-multiple',
          engine: 'seo',
          ruleId: 'multiple-h1s',
          severity: 'warning',
          message: `The page contains ${h1s.length} H1 headers. Best SEO practices advise using only one H1 heading.`,
          evidence: Array.from(h1s).map(el => el.outerHTML).join(', '),
          metadata: { count: h1s.length },
          confidence: 'confirmed',
          suggestedFix: 'Consolidate multiple H1 elements or downgrade sub-headings to H2 or H3.'
        }];
      }
      return [];
    }
  },
  {
    id: 'broken-heading-hierarchy',
    name: 'Skipped Heading Levels',
    category: 'seo',
    severityDefault: 'warning',
    scoreImpact: 10,
    async run(context: ScanContext): Promise<RawIssue[]> {
      const doc = context.document;
      const headings = Array.from(doc.querySelectorAll('h1, h2, h3, h4, h5, h6'));
      const issues: RawIssue[] = [];

      let prevLevel = 0;
      headings.forEach((heading, idx) => {
        const level = parseInt(heading.tagName.substring(1), 10);
        if (prevLevel > 0 && level - prevLevel > 1) {
          issues.push({
            id: `seo-hierarchy-skip-${idx}`,
            engine: 'seo',
            ruleId: 'broken-heading-hierarchy',
            severity: 'warning',
            locator: {
              primarySelector: heading.tagName.toLowerCase()
            },
            message: `Heading level skip detected: jumped from H${prevLevel} directly to H${level}.`,
            evidence: heading.outerHTML,
            metadata: { prevLevel, currentLevel: level },
            confidence: 'confirmed',
            suggestedFix: `Re-evaluate header hierarchy. Change H${level} to H${prevLevel + 1}.`
          });
        }
        prevLevel = level;
      });

      return issues;
    }
  },
  {
    id: 'empty-anchor-seo',
    name: 'Generic or Empty Link Text',
    category: 'seo',
    severityDefault: 'warning',
    scoreImpact: 10,
    async run(context: ScanContext): Promise<RawIssue[]> {
      const doc = context.document;
      const issues: RawIssue[] = [];
      const links = Array.from(doc.querySelectorAll('a'));
      const genericTexts = ['click here', 'read more', 'learn more', 'more', 'link', 'here', 'view'];

      let count = 0;
      links.forEach((link) => {
        const text = link.textContent?.trim().toLowerCase() || '';
        const href = link.getAttribute('href') || '';
        
        // Skip bookmark anchors
        if (!href || href.startsWith('#')) return;

        const isEmpty = !text;
        const isGeneric = genericTexts.includes(text);

        if ((isEmpty || isGeneric) && count < 5) {
          count++;
          issues.push({
            id: `seo-empty-link-${count}`,
            engine: 'seo',
            ruleId: 'empty-anchor-seo',
            severity: 'warning',
            locator: {
              primarySelector: `a[href="${href}"]`
            },
            message: isEmpty 
              ? 'Anchor link contains no descriptive text, making it crawlable but without context.'
              : `Anchor uses generic text "${text}" which provides zero keyword context to search crawlers.`,
            evidence: link.outerHTML,
            metadata: { type: isEmpty ? 'empty' : 'generic', text },
            confidence: 'confirmed',
            suggestedFix: 'Replace the link text with keyword-rich descriptive labels outlining the target page.'
          });
        }
      });

      return issues;
    }
  },
  {
    id: 'missing-structured-data',
    name: 'No Schema Structured Data Found',
    category: 'seo',
    severityDefault: 'warning',
    scoreImpact: 10,
    async run(context: ScanContext): Promise<RawIssue[]> {
      const doc = context.document;
      const ldJsonScripts = doc.querySelectorAll('script[type="application/ld+json"]');
      const microdata = doc.querySelectorAll('[itemscope]');

      if (ldJsonScripts.length === 0 && microdata.length === 0) {
        return [{
          id: 'seo-schema-missing',
          engine: 'seo',
          ruleId: 'missing-structured-data',
          severity: 'warning',
          message: 'Structured data (JSON-LD or Microdata) is missing. Rich snippets will not render in search rankings.',
          confidence: 'confirmed',
          suggestedFix: 'Incorporate JSON-LD schema blocks describing products, articles, or organization profiles.',
          metadata: {}
        }];
      }
      return [];
    }
  }
];

export class SeoEngine {
  public static async run(context: ScanContext): Promise<RawIssue[]> {
    const issuesList: RawIssue[] = [];
    for (const rule of SEO_RULES) {
      try {
        const issues = await rule.run(context);
        issuesList.push(...issues);
      } catch (err) {
        console.error(`SEO Rule run error [${rule.id}]:`, err);
      }
    }
    return issuesList;
  }
}
