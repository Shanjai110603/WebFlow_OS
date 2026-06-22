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
        const matchingLabel = doc.querySelector(`label[for="${id}"]`);
        if (matchingLabel) {
          hasLabel = true;
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
    const elements = doc.querySelectorAll('button, a');

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
