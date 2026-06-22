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

// --- 1. Small Body Text Rule ---
export const SmallBodyTextRule: AuditRule = {
  id: 'small-body-text',
  name: 'Small Font Scanner',
  category: 'readability',
  severityDefault: 'warning',
  scoreImpact: 10,
  async run(context: ScanContext): Promise<RawIssue[]> {
    const doc = context.document;
    const win = context.window;
    const issues: RawIssue[] = [];
    const paragraphs = doc.querySelectorAll('p');

    paragraphs.forEach(p => {
      const el = p as HTMLElement;
      const style = win.getComputedStyle(el);
      const fontSizeStr = style.fontSize;
      const fontSize = parseFloat(fontSizeStr) || 16;

      // Skip elements that are visually hidden
      if (style.display === 'none' || style.visibility === 'hidden' || el.textContent?.trim() === '') return;

      if (fontSize < 12) {
        issues.push({
          id: `font-size-${fontSize}-${Math.random()}`,
          engine: 'readability',
          ruleId: 'small-body-text',
          severity: 'warning',
          locator: createLocator(el),
          message: `Body text font-size is too small (${fontSizeStr}). Below the standard readability floor of 12px.`,
          evidence: el.textContent?.substring(0, 100) || '',
          metadata: { fontSize: fontSizeStr }
        });
      }
    });

    return issues;
  }
};

// --- 2. Bad Line Height Rule ---
export const BadLineHeightRule: AuditRule = {
  id: 'bad-line-height',
  name: 'Line Height Auditor',
  category: 'readability',
  severityDefault: 'warning',
  scoreImpact: 10,
  async run(context: ScanContext): Promise<RawIssue[]> {
    const doc = context.document;
    const win = context.window;
    const issues: RawIssue[] = [];
    const paragraphs = doc.querySelectorAll('p');

    paragraphs.forEach(p => {
      const el = p as HTMLElement;
      const style = win.getComputedStyle(el);
      const fontSize = parseFloat(style.fontSize) || 16;
      const lineHeightStr = style.lineHeight;

      // If lineHeight is a specific pixel value
      if (lineHeightStr && lineHeightStr.endsWith('px')) {
        const lineHeight = parseFloat(lineHeightStr);
        const ratio = fontSize > 0 ? lineHeight / fontSize : 0;
        
        if (ratio < 1.2) {
          issues.push({
            id: `lineheight-${ratio.toFixed(2)}-${Math.random()}`,
            engine: 'readability',
            ruleId: 'bad-line-height',
            severity: 'warning',
            locator: createLocator(el),
            message: `Paragraph line height spacing is too dense (${lineHeightStr} for font-size ${style.fontSize}). Ratio is ${ratio.toFixed(2)}, which is below the recommended 1.2 minimum.`,
            evidence: el.textContent?.substring(0, 100) || '',
            metadata: { ratio, lineHeight: lineHeightStr, fontSize: style.fontSize }
          });
        }
      }
    });

    return issues;
  }
};

// --- 3. Sticky Overlay Blocker Rule ---
export const StickyOverlayRule: AuditRule = {
  id: 'sticky-overlay',
  name: 'Sticky Layout Auditor',
  category: 'readability',
  severityDefault: 'warning',
  scoreImpact: 10,
  async run(context: ScanContext): Promise<RawIssue[]> {
    const doc = context.document;
    const win = context.window;
    const issues: RawIssue[] = [];
    const elements = doc.querySelectorAll('div, section');

    elements.forEach(el => {
      const element = el as HTMLElement;
      const style = win.getComputedStyle(element);

      if (style.position === 'fixed' || style.position === 'sticky') {
        const rect = element.getBoundingClientRect();
        const viewportArea = win.innerWidth * win.innerHeight;
        const areaRatio = viewportArea > 0 ? (rect.width * rect.height) / viewportArea : 0;

        // Flag fixed overlays covering more than 20% of the active viewport area
        // Skip structural headers/footers
        const tag = element.tagName.toLowerCase();
        if (tag === 'header' || tag === 'footer' || tag === 'nav') return;

        if (areaRatio > 0.20 && rect.width > 100 && rect.height > 100) {
          issues.push({
            id: `sticky-overlay-${Math.round(areaRatio * 100)}-${Math.random()}`,
            engine: 'readability',
            ruleId: 'sticky-overlay',
            severity: 'warning',
            locator: createLocator(element),
            message: `Fixed element covers too much page area (${Math.round(areaRatio * 100)}% of the active viewport), blocking reading zones.`,
            evidence: element.outerHTML.substring(0, 150),
            metadata: { areaRatio }
          });
        }
      }
    });

    return issues;
  }
};

// --- 4. Dense Content Rule ---
export const DenseContentRule: AuditRule = {
  id: 'dense-content',
  name: 'Content Density Scanner',
  category: 'readability',
  severityDefault: 'info',
  scoreImpact: 10,
  async run(context: ScanContext): Promise<RawIssue[]> {
    const doc = context.document;
    const issues: RawIssue[] = [];
    const paragraphs = doc.querySelectorAll('p');

    paragraphs.forEach(p => {
      const el = p as HTMLElement;
      const text = el.textContent || '';
      
      // If a paragraph text block exceeds 800 characters without structural subdivisions
      if (text.trim().length > 800) {
        issues.push({
          id: `dense-${text.length}-${Math.random()}`,
          engine: 'readability',
          ruleId: 'dense-content',
          severity: 'info',
          locator: createLocator(el),
          message: `Paragraph contains exceptionally long dense blocks of text (${text.length} characters) without headings or subdivisions.`,
          evidence: text.substring(0, 100) + '...',
          metadata: { textLength: text.length }
        });
      }
    });

    return issues;
  }
};
