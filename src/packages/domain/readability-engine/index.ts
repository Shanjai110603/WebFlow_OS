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

// --- 5. Excessive Line Length Rule ---
export const ExcessiveLineLengthRule: AuditRule = {
  id: 'excessive-line-length',
  name: 'Line Length Auditor',
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
      const text = el.textContent?.trim() || '';
      if (text.length < 150) return;

      const rect = el.getBoundingClientRect();
      const style = win.getComputedStyle(el);
      const fontSize = parseFloat(style.fontSize) || 16;
      
      const estimatedCpl = fontSize > 0 ? rect.width / (fontSize * 0.5) : 0;

      if (estimatedCpl > 90 && rect.width > 700) {
        issues.push({
          id: `line-length-${Math.round(estimatedCpl)}-${Math.random()}`,
          engine: 'readability',
          ruleId: 'excessive-line-length',
          severity: 'warning',
          locator: createLocator(el),
          message: `Paragraph line width is too wide (${Math.round(estimatedCpl)} estimated characters per line). Paragraphs exceeding 80 characters reduce visual tracking readability.`,
          evidence: text.substring(0, 100),
          metadata: { estimatedCpl, width: rect.width },
          confidence: 'heuristic',
          suggestedFix: 'Limit the reading container width using CSS (e.g. max-width: 65ch or max-width: 700px).'
        });
      }
    });

    return issues;
  }
};

// --- 6. Cramped Tap Targets Rule ---
export const CrampedTapTargetsRule: AuditRule = {
  id: 'cramped-tap-targets',
  name: 'Cramped Tap Targets Scanner',
  category: 'readability',
  severityDefault: 'warning',
  scoreImpact: 10,
  async run(context: ScanContext): Promise<RawIssue[]> {
    const doc = context.document;
    const issues: RawIssue[] = [];
    const targets = Array.from(doc.querySelectorAll('button, a[href], [role="button"]')) as HTMLElement[];

    for (let i = 0; i < targets.length; i++) {
      const rectA = targets[i].getBoundingClientRect();
      if (rectA.width === 0 && rectA.height === 0) continue;

      for (let j = i + 1; j < targets.length; j++) {
        const rectB = targets[j].getBoundingClientRect();
        if (rectB.width === 0 && rectB.height === 0) continue;

        const horizontalOverlap = Math.max(0, Math.min(rectA.right, rectB.right) - Math.max(rectA.left, rectB.left));
        const verticalOverlap = Math.max(0, Math.min(rectA.bottom, rectB.bottom) - Math.max(rectA.top, rectB.top));

        const horizontalGap = Math.max(rectA.left, rectB.left) - Math.min(rectA.right, rectB.right);
        const verticalGap = Math.max(rectA.top, rectB.top) - Math.min(rectA.bottom, rectB.bottom);

        if ((horizontalOverlap > 0 && verticalGap > 0 && verticalGap < 8) || 
            (verticalOverlap > 0 && horizontalGap > 0 && horizontalGap < 8)) {
          issues.push({
            id: `cramped-${targets[i].tagName}-${Math.random()}`,
            engine: 'readability',
            ruleId: 'cramped-tap-targets',
            severity: 'warning',
            locator: createLocator(targets[i]),
            message: `Interactive elements are positioned too closely (${targets[i].tagName.toLowerCase()} and ${targets[j].tagName.toLowerCase()} have less than 8px spacing).`,
            evidence: targets[i].outerHTML.substring(0, 100),
            metadata: {},
            confidence: 'heuristic',
            suggestedFix: 'Add spacing margins or increase container padding between neighboring buttons and anchor links.'
          });
          break;
        }
      }
    }

    return issues;
  }
};

// --- 7. Clutter Score Rule ---
export const ClutterScoreRule: AuditRule = {
  id: 'clutter-score',
  name: 'Visual Clutter Scanner',
  category: 'readability',
  severityDefault: 'info',
  scoreImpact: 10,
  async run(context: ScanContext): Promise<RawIssue[]> {
    const doc = context.document;
    const issues: RawIssue[] = [];

    const iframes = doc.querySelectorAll('iframe').length;
    const ads = doc.querySelectorAll('[id*="ad-"], [class*="ad-"], [id*="banner"], [class*="banner"]').length;
    const links = doc.querySelectorAll('a[href]').length;
    const paragraphs = doc.querySelectorAll('p').length;

    if ((iframes > 5 || ads > 10) && paragraphs > 0 && (links / paragraphs) > 10) {
      issues.push({
        id: `clutter-${Math.random()}`,
        engine: 'readability',
        ruleId: 'clutter-score',
        severity: 'info',
        message: `High layout clutter level identified: page contains ${iframes} iframe segments, ${ads} structural ad selectors, and ${links} link tags.`,
        metadata: { iframes, ads, links, paragraphs },
        confidence: 'heuristic',
        suggestedFix: 'Activate WebLens OS Layout Cleaner to hide floating items and suppress repetitive elements.'
      });
    }

    return issues;
  }
};

// --- 8. Intrusive Interstitial Rule ---
export const IntrusiveInterstitialRule: AuditRule = {
  id: 'intrusive-interstitial',
  name: 'Intrusive Interstitial Scanner',
  category: 'readability',
  severityDefault: 'warning',
  scoreImpact: 10,
  async run(context: ScanContext): Promise<RawIssue[]> {
    const doc = context.document;
    const win = context.window;
    const issues: RawIssue[] = [];
    const overlays = doc.querySelectorAll('div, section');

    overlays.forEach(el => {
      const element = el as HTMLElement;
      const style = win.getComputedStyle(element);

      if (style.position === 'fixed' || style.position === 'absolute') {
        const rect = element.getBoundingClientRect();
        const viewportWidth = win.innerWidth;
        const viewportHeight = win.innerHeight;
        
        const isCenteredX = (rect.left + rect.width / 2) > (viewportWidth * 0.3) && (rect.left + rect.width / 2) < (viewportWidth * 0.7);
        const isCenteredY = (rect.top + rect.height / 2) > (viewportHeight * 0.3) && (rect.top + rect.height / 2) < (viewportHeight * 0.7);
        const areaRatio = (viewportWidth * viewportHeight) > 0 ? (rect.width * rect.height) / (viewportWidth * viewportHeight) : 0;

        if (isCenteredX && isCenteredY && areaRatio > 0.35 && rect.width > 280 && rect.height > 250) {
          const content = element.textContent?.toLowerCase() || '';
          const isConsentOrAd = content.includes('subscribe') || content.includes('newsletter') || content.includes('signup') || content.includes('advertisement') || content.includes('join');

          if (isConsentOrAd) {
            issues.push({
              id: `interstitial-${Math.random()}`,
              engine: 'readability',
              ruleId: 'intrusive-interstitial',
              severity: 'warning',
              locator: createLocator(element),
              message: `Intrusive overlay promo banner is active, blocking central webpage view (${Math.round(areaRatio * 100)}% coverage).`,
              evidence: element.outerHTML.substring(0, 150),
              metadata: { areaRatio },
              confidence: 'heuristic',
              suggestedFix: 'Show newsletters or advertisement prompts inline rather than as fixed viewport-blocking overlay modals.'
            });
          }
        }
      }
    });

    return issues;
  }
};
