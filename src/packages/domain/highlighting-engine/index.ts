import { IssueLocator } from '../../shared/types';

export class HighlightingEngine {
  public static highlight(doc: Document, win: Window, locator: IssueLocator): void {
    // 1. Clear active overlays
    HighlightingEngine.clear(doc);

    // 2. Resolve element target using fallback list
    const el = HighlightingEngine.resolveElement(doc, locator);
    if (!el) {
      throw new Error('Element moved or no longer exists in DOM.');
    }

    // 3. Scroll to container
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // 4. Calculate bounding box coordinates
    const rect = el.getBoundingClientRect();
    const scrollX = win.scrollX;
    const scrollY = win.scrollY;

    // 5. Draw highlighted layout box
    const overlay = doc.createElement('div');
    overlay.id = 'weblens-highlight-overlay';
    
    overlay.style.setProperty('position', 'absolute', 'important');
    overlay.style.setProperty('left', `${rect.left + scrollX - 4}px`, 'important');
    overlay.style.setProperty('top', `${rect.top + scrollY - 4}px`, 'important');
    overlay.style.setProperty('width', `${rect.width + 8}px`, 'important');
    overlay.style.setProperty('height', `${rect.height + 8}px`, 'important');
    overlay.style.setProperty('border', '4px solid #a855f7', 'important');
    overlay.style.setProperty('box-shadow', '0 0 16px #a855f7, inset 0 0 8px #a855f7', 'important');
    overlay.style.setProperty('pointer-events', 'none', 'important');
    overlay.style.setProperty('z-index', '2147483647', 'important');
    overlay.style.setProperty('border-radius', '6px', 'important');

    const styleTag = doc.createElement('style');
    styleTag.id = 'weblens-highlight-style';
    styleTag.textContent = `
      @keyframes weblens-flash {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.4; transform: scale(1.02); }
      }
      #weblens-highlight-overlay {
        animation: weblens-flash 1.5s infinite ease-in-out !important;
      }
    `;

    doc.body.appendChild(overlay);
    doc.body.appendChild(styleTag);
  }

  public static clear(doc: Document): void {
    const overlay = doc.getElementById('weblens-highlight-overlay');
    if (overlay) overlay.remove();

    const styleTag = doc.getElementById('weblens-highlight-style');
    if (styleTag) styleTag.remove();
  }

  private static resolveElement(doc: Document, locator: IssueLocator): HTMLElement | null {
    // A. Check primary CSS selector
    if (locator.primarySelector) {
      try {
        const el = doc.querySelector<HTMLElement>(locator.primarySelector);
        if (el) return el;
      } catch {}
    }

    // B. Check fallback list selectors
    if (locator.fallbackSelectors) {
      for (const selector of locator.fallbackSelectors) {
        try {
          const el = doc.querySelector<HTMLElement>(selector);
          if (el) return el;
        } catch {}
      }
    }

    // C. Check XPath
    if (locator.xpath) {
      try {
        const result = doc.evaluate(
          locator.xpath,
          doc,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        );
        const node = result.singleNodeValue;
        if (node && node.nodeType === Node.ELEMENT_NODE) {
          return node as HTMLElement;
        }
      } catch {}
    }

    // D. Text snippet + Tag search fallback
    if (locator.tagName && locator.textSnippet) {
      try {
        const tags = doc.querySelectorAll<HTMLElement>(locator.tagName);
        for (const el of Array.from(tags)) {
          if (el.textContent?.trim() === locator.textSnippet.trim()) {
            return el;
          }
        }
      } catch {}
    }

    return null;
  }
}
