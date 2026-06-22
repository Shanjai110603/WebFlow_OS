import { FixerState, TypographyConfig, StickyCandidate } from '../../shared/types';

export class FixerController {
  private activeStyles: HTMLStyleElement | null = null;
  private currentState: FixerState | null = null;

  constructor(private document: Document, private window: Window) {}

  /**
   * Applies the selected styling rules directly to the DOM.
   */
  public apply(state: FixerState): void {
    this.currentState = state;
    
    if (!this.activeStyles) {
      this.activeStyles = this.document.createElement('style');
      this.activeStyles.id = 'weblens-injected-fixer';
      this.document.head.appendChild(this.activeStyles);
    }

    let cssRules = '';

    if (state.enabled) {
      if (state.darkMode) {
        cssRules += this.getDarkModeCSS();
      }

      if (state.focusMode) {
        cssRules += this.getFocusModeCSS();
      }

      if (state.hideSticky) {
        this.applyStickyHeuristics();
      } else {
        this.resetStickyHeuristics();
      }

      cssRules += this.getTypographyCSS(state.typography);
    } else {
      this.resetStickyHeuristics();
    }

    this.activeStyles.textContent = cssRules;
  }

  /**
   * Removes injected styles and resets the page view.
   */
  public rollback(): void {
    this.resetStickyHeuristics();
    if (this.activeStyles) {
      this.activeStyles.remove();
      this.activeStyles = null;
    }
  }

  private getDarkModeCSS(): string {
    return `
      html, body {
        background-color: #121214 !important;
        color: #e2e8f0 !important;
      }
      /* Ensure text in content sections remains light */
      p, span, li, a, h1, h2, h3, h4, h5, h6 {
        color: #e2e8f0 !important;
      }
      a { color: #a855f7 !important; }
      img { filter: brightness(0.8) contrast(1.2) !important; }
    `;
  }

  private getFocusModeCSS(): string {
    return `
      /* Dims background sections, highlighting main readable containers */
      body > *:not(main):not(article):not(section):not(#weblens-highlight-overlay):not(#weblens-restore-focus-banner) {
        opacity: 0.15 !important;
        filter: blur(2px) grayscale(50%) !important;
        pointer-events: none !important;
        transition: opacity 0.3s ease !important;
      }
      main, article, section {
        background-color: transparent !important;
        box-shadow: none !important;
      }
    `;
  }

  private getTypographyCSS(config: TypographyConfig): string {
    const font = config.fontFamily === 'dyslexic' 
      ? 'OpenDyslexic, sans-serif' 
      : config.fontFamily;

    return `
      p, span, li, a, h1, h2, h3, h4, h5, h6 {
        font-family: ${font === 'default' ? 'inherit' : font} !important;
        font-size: ${config.fontSize}% !important;
        line-height: ${config.lineHeight} !important;
        letter-spacing: ${config.letterSpacing}em !important;
      }
    `;
  }

  // --- Sticky Candidate Heuristics Engine ---
  private applyStickyHeuristics(): void {
    const elements = this.document.querySelectorAll<HTMLElement>('*');
    elements.forEach(el => {
      const style = this.window.getComputedStyle(el);
      const isStickyOrFixed = style.position === 'fixed' || style.position === 'sticky';
      if (!isStickyOrFixed) return;

      const candidate = this.evaluateStickyCandidate(el, style);
      if (candidate.score >= 50 && candidate.likelyBlocking) {
        el.setAttribute('data-weblens-hidden-sticky', 'true');
        el.style.setProperty('display', 'none', 'important');
      }
    });
  }

  private resetStickyHeuristics(): void {
    const elements = this.document.querySelectorAll<HTMLElement>('[data-weblens-hidden-sticky]');
    elements.forEach(el => {
      el.removeAttribute('data-weblens-hidden-sticky');
      el.style.removeProperty('display');
    });
  }

  private evaluateStickyCandidate(el: HTMLElement, style: CSSStyleDeclaration): StickyCandidate {
    const rect = el.getBoundingClientRect();
    const viewportWidth = this.window.innerWidth;
    const viewportHeight = this.window.innerHeight;
    const area = rect.width * rect.height;
    const areaRatio = area / (viewportWidth * viewportHeight);
    const zIndex = parseInt(style.zIndex, 10) || 0;

    const reasons: string[] = [];
    let score = 0;

    // Strict structural exclusions (Excludes core layout app boxes, nav bars)
    const tag = el.tagName.toLowerCase();
    const id = el.id.toLowerCase();
    const className = el.className.toString().toLowerCase();
    const role = el.getAttribute('role')?.toLowerCase() || '';

    const isExempt = 
      tag === 'nav' || tag === 'header' || tag === 'footer' ||
      role === 'navigation' || role === 'banner' ||
      id.includes('nav') || id.includes('header') || id.includes('app-shell') ||
      className.includes('nav') || className.includes('header');

    if (isExempt) {
      return { element: el, reasons: ['exempt'], score: 0, areaRatio, zIndex, fixedOrSticky: true, likelyBlocking: false };
    }

    if (zIndex > 1000) {
      score += 10;
      reasons.push('high-z-index');
    }
    if (areaRatio > 0.15) {
      score += 20;
      reasons.push('large-screen-area');
    }

    // Centered overlay check
    const centerOverlap = (
      rect.left < viewportWidth / 2 && rect.right > viewportWidth / 2 &&
      rect.top < viewportHeight / 2 && rect.bottom > viewportHeight / 2
    );
    if (centerOverlap) {
      score += 20;
      reasons.push('overlaps-viewport-center');
    }

    // Modal/consent patterns check
    const keywords = ['cookie', 'consent', 'subscribe', 'banner', 'overlay', 'modal', 'popup', 'newsletter'];
    const matchesKeyword = keywords.some(k => id.includes(k) || className.includes(k));
    if (matchesKeyword) {
      score += 25;
      reasons.push('modal-keyword-match');
    }

    const likelyBlocking = score >= 50;

    return {
      element: el,
      reasons,
      score,
      areaRatio,
      zIndex,
      fixedOrSticky: true,
      likelyBlocking
    };
  }
}
