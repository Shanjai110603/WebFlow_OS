import { AuditRule, RawIssue, ScanContext, IssueLocator } from '../../shared/types';
import { 
  getUniqueCSSSelector, 
  getDOMPath, 
  getResolvedBackgroundColor, 
  parseRGB, 
  calculateContrastRatio 
} from '../../shared/utils';

// Helper to compile locators
function createLocator(el: HTMLElement): IssueLocator {
  const rect = el.getBoundingClientRect();
  return {
    primarySelector: getUniqueCSSSelector(el),
    xpath: getXPath(el),
    domPath: getDOMPath(el),
    tagName: el.tagName,
    textSnippet: el.textContent?.substring(0, 100).trim(),
    attributes: getElementAttributes(el),
    boundingBoxHint: {
      x: Math.round(rect.left + window.scrollX),
      y: Math.round(rect.top + window.scrollY),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    }
  };
}

function getXPath(el: HTMLElement): string {
  const paths: string[] = [];
  let current: HTMLElement | null = el;
  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let index = 0;
    let sibling = current.previousSibling;
    while (sibling) {
      if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === current.nodeName) {
        index++;
      }
      sibling = sibling.previousSibling;
    }
    const tagName = current.nodeName.toLowerCase();
    const pathIndex = index > 0 ? `[${index + 1}]` : '';
    paths.unshift(`${tagName}${pathIndex}`);
    current = current.parentElement;
  }
  return paths.length ? '/' + paths.join('/') : '';
}

function getElementAttributes(el: HTMLElement): Record<string, string> {
  const attrs: Record<string, string> = {};
  if (el.hasAttributes()) {
    const list = el.attributes;
    for (let i = 0; i < list.length; i++) {
      attrs[list[i].name] = list[i].value;
    }
  }
  return attrs;
}

function walkDOM(node: Node, callback: (el: HTMLElement) => void) {
  if (node.nodeType === Node.ELEMENT_NODE) {
    callback(node as HTMLElement);
  }
  let child = node.firstChild;
  while (child) {
    walkDOM(child, callback);
    child = child.nextSibling;
  }
}

// --- 1. Missing Alt Text Rule ---
export const MissingAltTextRule: AuditRule = {
  id: 'missing-alt-text',
  name: 'Alt Text Scanner',
  category: 'accessibility',
  severityDefault: 'warning',
  scoreImpact: 5,
  async run(context: ScanContext): Promise<RawIssue[]> {
    const doc = context.document;
    const issues: RawIssue[] = [];
    const imgs = doc.querySelectorAll('img');

    imgs.forEach(img => {
      // Check if alt attribute is completely missing
      if (!img.hasAttribute('alt')) {
        issues.push({
          id: `alt-${img.src.substring(0, 30)}-${Math.random()}`,
          engine: 'accessibility',
          ruleId: 'missing-alt-text',
          severity: 'warning',
          locator: createLocator(img),
          message: `Image is missing an alternative description alt tag.`,
          evidence: img.outerHTML.substring(0, 200),
          metadata: {}
        });
      }
    });

    return issues;
  }
};

// --- 2. Missing Form Label Rule ---
export const MissingFormLabelRule: AuditRule = {
  id: 'missing-form-label',
  name: 'Form Labels Auditor',
  category: 'accessibility',
  severityDefault: 'critical',
  scoreImpact: 10,
  async run(context: ScanContext): Promise<RawIssue[]> {
    const doc = context.document;
    const issues: RawIssue[] = [];
    const inputs = doc.querySelectorAll('input, select, textarea');

    inputs.forEach(input => {
      const el = input as HTMLElement;
      // Skip buttons/hidden inputs
      const type = el.getAttribute('type');
      if (type === 'hidden' || type === 'submit' || type === 'button' || type === 'image') return;

      let hasLabel = false;

      // Check if nested in a label
      if (el.closest('label')) {
        hasLabel = true;
      }

      // Check if label targets via ID
      const id = el.id;
      if (id) {
        try {
          const matchingLabel = doc.querySelector(`label[for="${id}"]`);
          if (matchingLabel) {
            hasLabel = true;
          }
        } catch {
          // Ignore invalid selector queries
        }
      }

      // Check ARIA labels
      if (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.getAttribute('title')) {
        hasLabel = true;
      }

      if (!hasLabel) {
        issues.push({
          id: `label-${id || 'no-id'}-${Math.random()}`,
          engine: 'accessibility',
          ruleId: 'missing-form-label',
          severity: 'critical',
          locator: createLocator(el),
          message: `Form field <${el.tagName.toLowerCase()}> is missing an associated label or ARIA descriptor.`,
          evidence: el.outerHTML.substring(0, 200),
          metadata: {}
        });
      }
    });

    return issues;
  }
};

// --- 3. Empty Buttons & Links Rule ---
export const EmptyButtonRule: AuditRule = {
  id: 'empty-button',
  name: 'Empty Button Scanner',
  category: 'accessibility',
  severityDefault: 'critical',
  scoreImpact: 10,
  async run(context: ScanContext): Promise<RawIssue[]> {
    const doc = context.document;
    const issues: RawIssue[] = [];
    const elements = doc.querySelectorAll('button, a, [role="button"]');

    elements.forEach(el => {
      const element = el as HTMLElement;
      const role = element.getAttribute('role');
      const isButton = element.tagName.toLowerCase() === 'button' || role === 'button';
      const isLink = element.tagName.toLowerCase() === 'a';

      // Skip elements that don't represent interactive links/buttons
      if (isLink && !element.hasAttribute('href')) return;

      const text = element.textContent?.trim();
      const hasAria = element.getAttribute('aria-label') || element.getAttribute('aria-labelledby');
      const hasImageAlt = Array.from(element.querySelectorAll('img')).some(img => img.getAttribute('alt')?.trim());

      if (!text && !hasAria && !hasImageAlt) {
        issues.push({
          id: `empty-${isButton ? 'btn' : 'link'}-${Math.random()}`,
          engine: 'accessibility',
          ruleId: 'empty-button',
          severity: 'critical',
          locator: createLocator(element),
          message: `${isButton ? 'Button' : 'Link'} has no visible text content, image alt details, or ARIA label.`,
          evidence: element.outerHTML.substring(0, 200),
          metadata: {}
        });
      }
    });

    return issues;
  }
};

// --- 4. Heading Order Sequence Rule ---
export const HeadingOrderRule: AuditRule = {
  id: 'heading-order',
  name: 'Heading Hierarchy Validator',
  category: 'accessibility',
  severityDefault: 'warning',
  scoreImpact: 5,
  async run(context: ScanContext): Promise<RawIssue[]> {
    const doc = context.document;
    const issues: RawIssue[] = [];
    const headings = Array.from(doc.querySelectorAll('h1, h2, h3, h4, h5, h6')) as HTMLElement[];

    let lastLevel = 0;

    headings.forEach(heading => {
      const level = parseInt(heading.tagName.substring(1), 10);

      // If heading jumps level by more than 1 (e.g. H2 followed directly by H4)
      if (lastLevel > 0 && level > lastLevel + 1) {
        issues.push({
          id: `heading-${level}-${Math.random()}`,
          engine: 'accessibility',
          ruleId: 'heading-order',
          severity: 'warning',
          locator: createLocator(heading),
          message: `Heading sequence jumps nested levels incorrectly from H${lastLevel} directly to H${level}.`,
          evidence: heading.outerHTML.substring(0, 200),
          metadata: { lastLevel, currentLevel: level }
        });
      }
      lastLevel = level;
    });

    return issues;
  }
};

// --- 5. Contrast Checks Rule ---
export const ContrastRule: AuditRule = {
  id: 'contrast',
  name: 'WCAG Contrast Auditor',
  category: 'accessibility',
  severityDefault: 'critical',
  scoreImpact: 10,
  async run(context: ScanContext): Promise<RawIssue[]> {
    const doc = context.document;
    const win = context.window;
    const issues: RawIssue[] = [];

    if (!doc.body) return [];

    // Walk the body nodes to find elements with visible text nodes
    walkDOM(doc.body, (el) => {
      // Check if element has direct text nodes with content
      const childNodes = Array.from(el.childNodes);
      const hasDirectText = childNodes.some(node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim());

      if (hasDirectText) {
        const style = win.getComputedStyle(el);
        
        // Skip hidden elements
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return;

        const textColor = parseRGB(style.color);
        const bgColor = getResolvedBackgroundColor(el, win);

        if (textColor) {
          const contrast = calculateContrastRatio(textColor, bgColor);
          
          // Determine WCAG AA threshold: 4.5 for standard, 3.0 for large text (>18px/24px)
          const fontSize = parseFloat(style.fontSize) || 16;
          const isBold = style.fontWeight === 'bold' || parseInt(style.fontWeight, 10) >= 700;
          const threshold = (fontSize >= 24 || (fontSize >= 18.5 && isBold)) ? 3.0 : 4.5;

          if (contrast < threshold) {
            issues.push({
              id: `contrast-${el.tagName}-${Math.round(contrast * 100)}-${Math.random()}`,
              engine: 'accessibility',
              ruleId: 'contrast',
              severity: 'critical',
              locator: createLocator(el),
              message: `Low text contrast ratio (${contrast.toFixed(2)}:1) does not satisfy the WCAG AA minimum requirement of ${threshold}:1.`,
              evidence: el.outerHTML.substring(0, 100),
              metadata: { contrast, threshold, textRGB: style.color, bgRGB: `rgb(${bgColor.r},${bgColor.g},${bgColor.b})` }
            });
          }
        }
      }
    });

    return issues;
  }
};

// --- 6. Focus Indicator Rule ---
export const FocusIndicatorRule: AuditRule = {
  id: 'focus-indicator',
  name: 'Keyboard Focus Auditor',
  category: 'accessibility',
  severityDefault: 'warning',
  scoreImpact: 5,
  async run(context: ScanContext): Promise<RawIssue[]> {
    const doc = context.document;
    const issues: RawIssue[] = [];
    const interactive = doc.querySelectorAll('a[href], button, input, select, textarea');

    interactive.forEach(el => {
      const element = el as HTMLElement;
      
      // Look for indicators that outlines are deactivated inline or in stylesheets
      const inlineStyle = element.getAttribute('style')?.toLowerCase() || '';
      if (inlineStyle.includes('outline:none') || inlineStyle.includes('outline: 0') || inlineStyle.includes('outline:none !important')) {
        issues.push({
          id: `focus-${Math.random()}`,
          engine: 'accessibility',
          ruleId: 'focus-indicator',
          severity: 'warning',
          locator: createLocator(element),
          message: `Interactive element uses inline style overrides to deactivate focus outlines.`,
          evidence: element.outerHTML.substring(0, 200),
          metadata: {}
        });
      }
    });

    return issues;
  }
};

// --- 7. Missing Doc Lang Rule ---
export const MissingDocLangRule: AuditRule = {
  id: 'missing-doc-lang',
  name: 'Document Language Auditor',
  category: 'accessibility',
  severityDefault: 'critical',
  scoreImpact: 10,
  async run(context: ScanContext): Promise<RawIssue[]> {
    const doc = context.document;
    const html = doc.querySelector('html');
    const lang = html?.getAttribute('lang')?.trim();
    if (!lang) {
      return [{
        id: `doc-lang-${Math.random()}`,
        engine: 'accessibility',
        ruleId: 'missing-doc-lang',
        severity: 'critical',
        message: 'Document language attribute is missing or empty on the <html> tag.',
        metadata: {},
        confidence: 'confirmed',
        suggestedFix: 'Add a lang attribute to the <html> tag, e.g. <html lang="en">.'
      }];
    }
    return [];
  }
};

// --- 8. Missing Page Title Rule ---
export const MissingPageTitleRule: AuditRule = {
  id: 'missing-page-title',
  name: 'Page Title Scanner',
  category: 'accessibility',
  severityDefault: 'warning',
  scoreImpact: 5,
  async run(context: ScanContext): Promise<RawIssue[]> {
    const doc = context.document;
    const title = doc.querySelector('title')?.textContent?.trim();
    if (!title) {
      return [{
        id: `page-title-${Math.random()}`,
        engine: 'accessibility',
        ruleId: 'missing-page-title',
        severity: 'warning',
        message: 'Page title is missing or empty in the document head.',
        metadata: {},
        confidence: 'confirmed',
        suggestedFix: 'Insert a descriptive <title> tag inside the document <head>.'
      }];
    }
    return [];
  }
};

// --- 9. Duplicate Interactive Labels Rule ---
export const DuplicateInteractiveLabelsRule: AuditRule = {
  id: 'duplicate-interactive-labels',
  name: 'Duplicate Interactive Labels Scanner',
  category: 'accessibility',
  severityDefault: 'warning',
  scoreImpact: 5,
  async run(context: ScanContext): Promise<RawIssue[]> {
    const doc = context.document;
    const issues: RawIssue[] = [];
    const elements = doc.querySelectorAll('a[href], button');
    const seenTexts: Record<string, string> = {};

    elements.forEach(el => {
      const element = el as HTMLElement;
      const text = element.textContent?.trim().toLowerCase() || '';
      if (!text || text.length < 3) return;
      
      const target = element.tagName.toLowerCase() === 'a' 
        ? element.getAttribute('href') || '' 
        : 'button-action';

      if (seenTexts[text]) {
        if (seenTexts[text] !== target) {
          issues.push({
            id: `dup-label-${Math.random()}`,
            engine: 'accessibility',
            ruleId: 'duplicate-interactive-labels',
            severity: 'warning',
            locator: createLocator(element),
            message: `Interactive element shares the label "${text}" with another control pointing to a different action/target.`,
            evidence: element.outerHTML.substring(0, 150),
            metadata: { text, firstTarget: seenTexts[text], secondTarget: target },
            confidence: 'heuristic',
            suggestedFix: 'Add descriptive text or an aria-label to distinguish the controls (e.g. aria-label="Learn more about our team").'
          });
        }
      } else {
        seenTexts[text] = target;
      }
    });

    return issues;
  }
};

// --- 10. Missing Landmarks Rule ---
export const MissingLandmarksRule: AuditRule = {
  id: 'missing-landmarks',
  name: 'Landmarks Auditor',
  category: 'accessibility',
  severityDefault: 'warning',
  scoreImpact: 5,
  async run(context: ScanContext): Promise<RawIssue[]> {
    const doc = context.document;
    const landmarks = doc.querySelectorAll('main, nav, header, footer, [role="main"], [role="navigation"], [role="banner"], [role="contentinfo"]');
    if (landmarks.length === 0) {
      return [{
        id: `landmark-${Math.random()}`,
        engine: 'accessibility',
        ruleId: 'missing-landmarks',
        severity: 'warning',
        message: 'No HTML5 landmark regions (main, nav, header, footer) were found on the page.',
        metadata: {},
        confidence: 'confirmed',
        suggestedFix: 'Wrap page contents in semantic landmark tags such as <main>, <nav>, <header>, or <footer> to help assistive technologies navigate sections.'
      }];
    }
    return [];
  }
};

// --- 11. ARIA Hidden Misuse Rule ---
export const AriaHiddenMisuseRule: AuditRule = {
  id: 'aria-hidden-misuse',
  name: 'ARIA Hidden Misuse Scanner',
  category: 'accessibility',
  severityDefault: 'critical',
  scoreImpact: 10,
  async run(context: ScanContext): Promise<RawIssue[]> {
    const doc = context.document;
    const issues: RawIssue[] = [];
    const hiddenSubtrees = doc.querySelectorAll('[aria-hidden="true"]');

    hiddenSubtrees.forEach(tree => {
      const focusables = tree.querySelectorAll('a[href], button, input, select, textarea, [tabindex="0"]');
      focusables.forEach(el => {
        const element = el as HTMLElement;
        const tabIndex = element.getAttribute('tabindex');
        if (tabIndex !== '-1') {
          issues.push({
            id: `aria-hidden-misuse-${Math.random()}`,
            engine: 'accessibility',
            ruleId: 'aria-hidden-misuse',
            severity: 'critical',
            locator: createLocator(element),
            message: 'Focusable element is nested inside an aria-hidden="true" container, preventing screen reader interaction but leaving it keyboard-selectable.',
            evidence: element.outerHTML.substring(0, 150),
            metadata: {},
            confidence: 'confirmed',
            suggestedFix: 'Remove aria-hidden="true" from the parent container, or add tabindex="-1" to the focusable element if it should be completely hidden.'
          });
        }
      });
    });

    return issues;
  }
};

// --- 12. Images Used As Buttons Rule ---
export const ImagesUsedAsButtonsRule: AuditRule = {
  id: 'images-used-as-buttons',
  name: 'Images as Buttons Auditor',
  category: 'accessibility',
  severityDefault: 'critical',
  scoreImpact: 10,
  async run(context: ScanContext): Promise<RawIssue[]> {
    const doc = context.document;
    const issues: RawIssue[] = [];
    const elements = doc.querySelectorAll('button, a[href], [role="button"]');

    elements.forEach(el => {
      const element = el as HTMLElement;
      const imgs = element.querySelectorAll('img');
      if (imgs.length > 0 && !element.textContent?.trim()) {
        const hasAccessibleName = element.getAttribute('aria-label') || element.getAttribute('aria-labelledby') || Array.from(imgs).some(img => img.getAttribute('alt')?.trim());
        if (!hasAccessibleName) {
          issues.push({
            id: `img-btn-${Math.random()}`,
            engine: 'accessibility',
            ruleId: 'images-used-as-buttons',
            severity: 'critical',
            locator: createLocator(element),
            message: 'Image is used inside a button or link container without an alt attribute or aria-label, leaving the control unnamed.',
            evidence: element.outerHTML.substring(0, 200),
            metadata: {},
            confidence: 'confirmed',
            suggestedFix: 'Define a descriptive alt attribute on the image element, or add an aria-label directly to the button/link.'
          });
        }
      }
    });

    return issues;
  }
};

// --- 13. Missing Skip Link Rule ---
export const MissingSkipLinkRule: AuditRule = {
  id: 'missing-skip-link',
  name: 'Skip Link Auditor',
  category: 'accessibility',
  severityDefault: 'warning',
  scoreImpact: 5,
  async run(context: ScanContext): Promise<RawIssue[]> {
    const doc = context.document;
    const links = Array.from(doc.querySelectorAll('a[href]')) as HTMLAnchorElement[];
    
    if (links.length < 30) return [];

    let hasSkipLink = false;
    for (const link of links) {
      const text = link.textContent?.toLowerCase() || '';
      const href = link.getAttribute('href') || '';
      if (href.startsWith('#') && (text.includes('skip') || text.includes('content') || text.includes('main'))) {
        hasSkipLink = true;
        break;
      }
    }

    if (!hasSkipLink) {
      return [{
        id: `skip-link-${Math.random()}`,
        engine: 'accessibility',
        ruleId: 'missing-skip-link',
        severity: 'warning',
        message: 'No skip-to-content bypass link was found on this navigation-heavy page.',
        metadata: {},
        confidence: 'heuristic',
        suggestedFix: 'Insert an anchor link at the very beginning of the body that points to the main content element, e.g. <a href="#main" class="skip-link">Skip to main content</a>.'
      }];
    }

    return [];
  }
};

// --- 14. Placeholder Only Labeling Rule ---
export const PlaceholderOnlyLabelingRule: AuditRule = {
  id: 'placeholder-only-labeling',
  name: 'Placeholder Only Labeling Scanner',
  category: 'accessibility',
  severityDefault: 'warning',
  scoreImpact: 5,
  async run(context: ScanContext): Promise<RawIssue[]> {
    const doc = context.document;
    const issues: RawIssue[] = [];
    const inputs = doc.querySelectorAll('input[placeholder], textarea[placeholder]');

    inputs.forEach(input => {
      const el = input as HTMLInputElement;
      const type = el.getAttribute('type');
      if (type === 'hidden' || type === 'submit' || type === 'button' || type === 'image') return;

      let hasLabel = false;
      if (el.closest('label')) hasLabel = true;
      const id = el.id;
      if (id && doc.querySelector(`label[for="${id}"]`)) hasLabel = true;
      if (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.getAttribute('title')) hasLabel = true;

      if (!hasLabel && el.getAttribute('placeholder')) {
        issues.push({
          id: `placeholder-only-${id || 'no-id'}-${Math.random()}`,
          engine: 'accessibility',
          ruleId: 'placeholder-only-labeling',
          severity: 'warning',
          locator: createLocator(el),
          message: 'Form input uses placeholder text as its sole label. Placeholders disappear when typing and are not accessible.',
          evidence: el.outerHTML.substring(0, 150),
          metadata: {},
          confidence: 'confirmed',
          suggestedFix: 'Provide a visible <label> linked via the "for" attribute to the input\'s "id", or use aria-label.'
        });
      }
    });

    return issues;
  }
};

// --- 15. Iframe Title Missing Rule ---
export const IframeTitleMissingRule: AuditRule = {
  id: 'iframe-title-missing',
  name: 'Iframe Title Scanner',
  category: 'accessibility',
  severityDefault: 'warning',
  scoreImpact: 5,
  async run(context: ScanContext): Promise<RawIssue[]> {
    const doc = context.document;
    const issues: RawIssue[] = [];
    const iframes = doc.querySelectorAll('iframe');

    iframes.forEach(iframe => {
      const title = iframe.getAttribute('title')?.trim();
      if (!title) {
        issues.push({
          id: `iframe-title-${Math.random()}`,
          engine: 'accessibility',
          ruleId: 'iframe-title-missing',
          severity: 'warning',
          locator: createLocator(iframe as HTMLElement),
          message: 'Iframe element is missing a descriptive title attribute, hindering screen reader navigation.',
          evidence: iframe.outerHTML.substring(0, 200),
          metadata: {},
          confidence: 'confirmed',
          suggestedFix: 'Add a title attribute explaining the purpose of the frame content, e.g. <iframe title="Embedded map of branch offices">.'
        });
      }
    });

    return issues;
  }
};

// --- 16. Broken Table Semantics Rule ---
export const BrokenTableSemanticsRule: AuditRule = {
  id: 'broken-table-semantics',
  name: 'Table Semantics Scanner',
  category: 'accessibility',
  severityDefault: 'warning',
  scoreImpact: 5,
  async run(context: ScanContext): Promise<RawIssue[]> {
    const doc = context.document;
    const issues: RawIssue[] = [];
    const tables = doc.querySelectorAll('table');

    tables.forEach(table => {
      const headers = table.querySelectorAll('th');
      const cells = table.querySelectorAll('td');

      if (cells.length > 0 && headers.length === 0) {
        issues.push({
          id: `table-semantics-${Math.random()}`,
          engine: 'accessibility',
          ruleId: 'broken-table-semantics',
          severity: 'warning',
          locator: createLocator(table as HTMLElement),
          message: 'Data table lacks table header (<th>) elements, preventing assistive technologies from structuring tabular cells.',
          evidence: table.outerHTML.substring(0, 200),
          metadata: {},
          confidence: 'confirmed',
          suggestedFix: 'Use <th> tags for column and row titles, and group them inside <thead> and <tbody>.'
        });
      }
    });

    return issues;
  }
};

// --- 17. Invalid Heading Density Rule ---
export const InvalidHeadingDensityRule: AuditRule = {
  id: 'invalid-heading-density',
  name: 'Heading Density Scanner',
  category: 'accessibility',
  severityDefault: 'warning',
  scoreImpact: 5,
  async run(context: ScanContext): Promise<RawIssue[]> {
    const doc = context.document;
    const h1s = doc.querySelectorAll('h1');

    if (h1s.length > 3) {
      const firstH1 = h1s[0] as HTMLElement;
      return [{
        id: `h1-density-${Math.random()}`,
        engine: 'accessibility',
        ruleId: 'invalid-heading-density',
        severity: 'warning',
        locator: createLocator(firstH1),
        message: `Page has excessive primary headings (${h1s.length} <h1> tags found). Use a single H1 for primary topics.`,
        evidence: firstH1.outerHTML.substring(0, 150),
        metadata: { count: h1s.length },
        confidence: 'confirmed',
        suggestedFix: 'Use only one main <h1> tag for the main page title. Convert nested section titles to <h2> or <h3> headings.'
      }];
    }

    return [];
  }
};

// --- 18. Touch Target Size Rule ---
export const TouchTargetSizeRule: AuditRule = {
  id: 'touch-target-size',
  name: 'Touch Target Size Scanner',
  category: 'accessibility',
  severityDefault: 'warning',
  scoreImpact: 5,
  async run(context: ScanContext): Promise<RawIssue[]> {
    const doc = context.document;
    const issues: RawIssue[] = [];
    const elements = doc.querySelectorAll('button, a[href], [role="button"]');

    elements.forEach(el => {
      const element = el as HTMLElement;
      const rect = element.getBoundingClientRect();
      
      if (rect.width === 0 && rect.height === 0) return;

      if (rect.width < 24 || rect.height < 24) {
        issues.push({
          id: `touch-target-${Math.random()}`,
          engine: 'accessibility',
          ruleId: 'touch-target-size',
          severity: 'warning',
          locator: createLocator(element),
          message: `Touch target size is too small (${Math.round(rect.width)}x${Math.round(rect.height)}px). WCAG recommends a minimum of 24x24px for tap targets.`,
          evidence: element.outerHTML.substring(0, 150),
          metadata: { width: rect.width, height: rect.height },
          confidence: 'confirmed',
          suggestedFix: 'Increase the width or height of the element, or apply padding to enlarge the clickable touch surface.'
        });
      }
    });

    return issues;
  }
};

// --- 19. Inaccessible Modals Rule ---
export const InaccessibleModalsRule: AuditRule = {
  id: 'inaccessible-modals',
  name: 'Modal Accessibility Scanner',
  category: 'accessibility',
  severityDefault: 'warning',
  scoreImpact: 5,
  async run(context: ScanContext): Promise<RawIssue[]> {
    const doc = context.document;
    const win = context.window;
    const issues: RawIssue[] = [];
    const divs = doc.querySelectorAll('div, section');

    divs.forEach(el => {
      const element = el as HTMLElement;
      const style = win.getComputedStyle(element);
      
      if (style.position === 'fixed' && (parseInt(style.zIndex, 10) > 100)) {
        const rect = element.getBoundingClientRect();
        const viewportArea = win.innerWidth * win.innerHeight;
        const areaRatio = viewportArea > 0 ? (rect.width * rect.height) / viewportArea : 0;

        if (areaRatio > 0.25) {
          const role = element.getAttribute('role');
          const isModal = role === 'dialog' || role === 'alertdialog';
          const hasAriaModal = element.getAttribute('aria-modal') === 'true';

          if (!isModal || !hasAriaModal) {
            issues.push({
              id: `modal-access-${Math.random()}`,
              engine: 'accessibility',
              ruleId: 'inaccessible-modals',
              severity: 'warning',
              locator: createLocator(element),
              message: 'Potential overlay dialog box does not declare accessibility role="dialog" or aria-modal="true".',
              evidence: element.outerHTML.substring(0, 200),
              metadata: { role, areaRatio },
              confidence: 'heuristic',
              suggestedFix: 'Apply role="dialog" and aria-modal="true" to the outer modal wrapper tag to guide assistive technologies.'
            });
          }
        }
      }
    });

    return issues;
  }
};
