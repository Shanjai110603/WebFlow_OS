import { FixerState } from '../../shared/types';

export class ReaderModeController {
  private originalDisplayStates: Map<HTMLElement, string> = new Map();
  private readerContainer: HTMLElement | null = null;

  constructor(private document: Document) {}

  /**
   * Identifies the primary content block on the page heuristically.
   */
  public extractMainContent(): { title: string; html: string } | null {
    const title = this.document.title || 'Untitled Article';
    
    // Scan standard content elements
    const candidates: { el: HTMLElement; score: number }[] = [];
    const elements = this.document.querySelectorAll('article, main, div, section');

    elements.forEach(node => {
      const el = node as HTMLElement;
      const tag = el.tagName.toLowerCase();
      if (tag === 'header' || tag === 'footer' || tag === 'nav' || tag === 'aside') return;
      
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const paragraphs = el.querySelectorAll('p');
      if (paragraphs.length === 0) return;

      const textLength = el.textContent?.trim().length || 0;
      if (textLength < 300) return;

      let score = paragraphs.length * 10;
      score += Math.min(200, textLength / 20);

      if (tag === 'article') score += 100;
      if (tag === 'main') score += 80;

      const links = el.querySelectorAll('a').length;
      if (links > 0) {
        score -= (links / paragraphs.length) * 15;
      }

      candidates.push({ el, score });
    });

    if (candidates.length === 0) return null;

    candidates.sort((a, b) => b.score - a.score);
    const bestContentNode = candidates[0].el;

    const clone = bestContentNode.cloneNode(true) as HTMLElement;
    const itemsToClean = clone.querySelectorAll('script, style, iframe, nav, footer, header, form, [class*="share"], [id*="share"], [class*="social"], [id*="social"], [class*="comment"], [id*="comment"]');
    itemsToClean.forEach(item => item.remove());

    return {
      title,
      html: clone.innerHTML
    };
  }

  /**
   * Applies the local isolated Reader Mode view inside a shadow root container.
   */
  public apply(state: FixerState): void {
    if (!this.readerContainer) {
      const content = this.extractMainContent();
      if (!content) return;

      this.readerContainer = this.document.createElement('div');
      this.readerContainer.id = 'weblens-reader-overlay';
      this.readerContainer.style.position = 'fixed';
      this.readerContainer.style.top = '0';
      this.readerContainer.style.left = '0';
      this.readerContainer.style.width = '100vw';
      this.readerContainer.style.height = '100vh';
      this.readerContainer.style.zIndex = '2147483647';
      this.readerContainer.style.backgroundColor = state.darkMode ? '#121214' : '#f9f9fb';
      this.readerContainer.style.overflowY = 'auto';

      const shadow = this.readerContainer.attachShadow({ mode: 'open' });

      const style = this.document.createElement('style');
      style.textContent = `
        :host {
          all: initial;
        }
        .reader-wrapper {
          max-width: ${state.readingWidth === 'narrow' ? '500px' : state.readingWidth === 'wide' ? '850px' : state.readingWidth === 'full' ? '100%' : '700px'};
          margin: 0 auto;
          padding: 40px 24px;
          font-family: ${state.typography.fontFamily === 'sans-serif' ? 'system-ui, sans-serif' : state.typography.fontFamily === 'serif' ? 'Georgia, serif' : state.typography.fontFamily === 'dyslexic' ? 'OpenDyslexic, sans-serif' : 'system-ui, sans-serif'};
          font-size: ${state.typography.fontSize}%;
          line-height: ${state.typography.lineHeight};
          letter-spacing: ${state.typography.letterSpacing}em;
          color: ${state.darkMode ? '#e4e4e7' : '#18181b'};
          background-color: ${state.darkMode ? '#121214' : '#f9f9fb'};
        }
        h1 {
          font-size: 2.25em;
          line-height: 1.25;
          margin-bottom: 24px;
          border-bottom: 2px solid ${state.darkMode ? '#27272a' : '#e4e4e7'};
          padding-bottom: 12px;
          font-weight: 800;
          color: ${state.darkMode ? '#ffffff' : '#09090b'};
        }
        p {
          margin-top: 0;
          margin-bottom: ${state.paragraphSpacing ? `${state.paragraphSpacing * 1.5}em` : '1.5em'};
        }
        a {
          color: ${state.darkMode ? '#a78bfa' : '#7c3aed'};
          text-decoration: underline;
          font-weight: ${state.highlightLinks ? 'bold' : 'normal'};
          background-color: ${state.highlightLinks ? (state.darkMode ? 'rgba(167, 139, 250, 0.15)' : 'rgba(124, 58, 237, 0.1)') : 'transparent'};
          padding: ${state.highlightLinks ? '1px 3px' : '0'};
          border-radius: 3px;
        }
        img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          margin: 20px 0;
          opacity: ${state.imageDimming ? '0.1' : '1.0'};
          display: ${state.imageDimming ? 'none' : 'block'};
        }
        .heading-emphasis h2, .heading-emphasis h3, .heading-emphasis h4 {
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: ${state.darkMode ? '#f472b6' : '#db2777'} !important;
        }
      `;

      const wrapper = this.document.createElement('div');
      wrapper.className = `reader-wrapper ${state.headingEmphasis ? 'heading-emphasis' : ''}`;
      
      const h1 = this.document.createElement('h1');
      h1.textContent = content.title;
      wrapper.appendChild(h1);

      const contentDiv = this.document.createElement('div');
      contentDiv.innerHTML = content.html;
      wrapper.appendChild(contentDiv);

      shadow.appendChild(style);
      shadow.appendChild(wrapper);

      const children = Array.from(this.document.body.children) as HTMLElement[];
      children.forEach(child => {
        if (child.id !== 'weblens-reader-overlay' && child.tagName.toLowerCase() !== 'script' && child.tagName.toLowerCase() !== 'style') {
          this.originalDisplayStates.set(child, child.style.display);
          child.style.display = 'none';
        }
      });

      this.document.body.appendChild(this.readerContainer);
    } else {
      const shadow = this.readerContainer.shadowRoot;
      if (shadow) {
        const style = shadow.querySelector('style');
        if (style) {
          style.textContent = `
            :host {
              all: initial;
            }
            .reader-wrapper {
              max-width: ${state.readingWidth === 'narrow' ? '500px' : state.readingWidth === 'wide' ? '850px' : state.readingWidth === 'full' ? '100%' : '700px'};
              margin: 0 auto;
              padding: 40px 24px;
              font-family: ${state.typography.fontFamily === 'sans-serif' ? 'system-ui, sans-serif' : state.typography.fontFamily === 'serif' ? 'Georgia, serif' : state.typography.fontFamily === 'dyslexic' ? 'OpenDyslexic, sans-serif' : 'system-ui, sans-serif'};
              font-size: ${state.typography.fontSize}%;
              line-height: ${state.typography.lineHeight};
              letter-spacing: ${state.typography.letterSpacing}em;
              color: ${state.darkMode ? '#e4e4e7' : '#18181b'};
              background-color: ${state.darkMode ? '#121214' : '#f9f9fb'};
            }
            h1 {
              font-size: 2.25em;
              line-height: 1.25;
              margin-bottom: 24px;
              border-bottom: 2px solid ${state.darkMode ? '#27272a' : '#e4e4e7'};
              padding-bottom: 12px;
              font-weight: 800;
              color: ${state.darkMode ? '#ffffff' : '#09090b'};
            }
            p {
              margin-top: 0;
              margin-bottom: ${state.paragraphSpacing ? `${state.paragraphSpacing * 1.5}em` : '1.5em'};
            }
            a {
              color: ${state.darkMode ? '#a78bfa' : '#7c3aed'};
              text-decoration: underline;
              font-weight: ${state.highlightLinks ? 'bold' : 'normal'};
              background-color: ${state.highlightLinks ? (state.darkMode ? 'rgba(167, 139, 250, 0.15)' : 'rgba(124, 58, 237, 0.1)') : 'transparent'};
              padding: ${state.highlightLinks ? '1px 3px' : '0'};
              border-radius: 3px;
            }
            img {
              max-width: 100%;
              height: auto;
              border-radius: 8px;
              margin: 20px 0;
              opacity: ${state.imageDimming ? '0.1' : '1.0'};
              display: ${state.imageDimming ? 'none' : 'block'};
            }
            .heading-emphasis h2, .heading-emphasis h3, .heading-emphasis h4 {
              text-transform: uppercase;
              letter-spacing: 0.05em;
              color: ${state.darkMode ? '#f472b6' : '#db2777'} !important;
            }
          `;
        }
        
        const wrapper = shadow.querySelector('.reader-wrapper');
        if (wrapper) {
          wrapper.className = `reader-wrapper ${state.headingEmphasis ? 'heading-emphasis' : ''}`;
        }
      }
      this.readerContainer.style.backgroundColor = state.darkMode ? '#121214' : '#f9f9fb';
    }
  }

  /**
   * Safely rolls back the Reader Mode overlay and restores original document display states.
   */
  public rollback(): void {
    if (this.readerContainer) {
      this.readerContainer.remove();
      this.readerContainer = null;

      this.originalDisplayStates.forEach((display, el) => {
        if (this.document.body.contains(el)) {
          el.style.display = display;
        }
      });
      this.originalDisplayStates.clear();
    }
  }
}
