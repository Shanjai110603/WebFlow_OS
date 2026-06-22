import { PageInsights, ResourceSummary } from '../../shared/types';
import { ReaderModeController } from './reader-mode';

export class InsightsCompiler {
  public static compile(document: Document, window: Window, resources: ResourceSummary[]): PageInsights {
    const headingsCount = {
      h1: document.querySelectorAll('h1').length,
      h2: document.querySelectorAll('h2').length,
      h3: document.querySelectorAll('h3').length,
      h4: document.querySelectorAll('h4').length,
      h5: document.querySelectorAll('h5').length,
      h6: document.querySelectorAll('h6').length
    };

    const images = document.querySelectorAll('img');
    let missingAltCount = 0;
    images.forEach(img => {
      if (!img.hasAttribute('alt')) {
        missingAltCount++;
      }
    });

    const inputs = document.querySelectorAll('input, select, textarea');
    let unlabeledCount = 0;
    let placeholderOnlyCount = 0;
    inputs.forEach(input => {
      const el = input as HTMLElement;
      const type = el.getAttribute('type');
      if (type === 'hidden' || type === 'submit' || type === 'button' || type === 'image') return;

      let hasLabel = false;
      if (el.closest('label')) hasLabel = true;
      const id = el.id;
      if (id && document.querySelector(`label[for="${id}"]`)) hasLabel = true;
      if (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.getAttribute('title')) hasLabel = true;

      if (!hasLabel) {
        unlabeledCount++;
        if (el.getAttribute('placeholder')) {
          placeholderOnlyCount++;
        }
      }
    });

    const links = document.querySelectorAll('a');
    let emptyLinksCount = 0;
    let suspiciousPurposeCount = 0;
    const genericTexts = ['click here', 'read more', 'learn more', 'more', 'link', 'go', 'here', 'button'];

    links.forEach(l => {
      const text = l.textContent?.trim().toLowerCase() || '';
      const hasHref = l.hasAttribute('href');
      const hasAria = l.getAttribute('aria-label') || l.getAttribute('aria-labelledby');
      const hasAlt = Array.from(l.querySelectorAll('img')).some(img => img.getAttribute('alt')?.trim());

      if (hasHref && !text && !hasAria && !hasAlt) {
        emptyLinksCount++;
      }

      if (genericTexts.includes(text)) {
        suspiciousPurposeCount++;
      }
    });

    const totalResources = resources.length;
    const thirdPartyResources = resources.filter(r => r.thirdParty).length;
    const firstPartyResources = totalResources - thirdPartyResources;

    const trackersSummary = {
      analytics: resources.filter(r => r.tracker && r.trackerCategory === 'analytics').length,
      advertising: resources.filter(r => r.tracker && r.trackerCategory === 'advertising').length,
      social: resources.filter(r => r.tracker && r.trackerCategory === 'social').length,
      utility: resources.filter(r => r.tracker && r.trackerCategory === 'utility').length,
      total: resources.filter(r => r.tracker).length
    };

    let interstitialsDetected = 0;
    const overlays = document.querySelectorAll('div, section');
    overlays.forEach(el => {
      const element = el as HTMLElement;
      const style = window.getComputedStyle(element);

      if (style.position === 'fixed' || style.position === 'absolute') {
        const rect = element.getBoundingClientRect();
        const areaRatio = (window.innerWidth * window.innerHeight) > 0 
          ? (rect.width * rect.height) / (window.innerWidth * window.innerHeight) 
          : 0;
        
        if (areaRatio > 0.35 && rect.width > 280 && rect.height > 250) {
          const content = element.textContent?.toLowerCase() || '';
          if (content.includes('subscribe') || content.includes('newsletter') || content.includes('signup')) {
            interstitialsDetected++;
          }
        }
      }
    });

    const pageLanguage = document.querySelector('html')?.getAttribute('lang') || undefined;
    const iframeCount = document.querySelectorAll('iframe').length;

    const readerController = new ReaderModeController(document);
    const mainContentFound = readerController.extractMainContent() !== null;

    return {
      headingsCount,
      imagesCount: { total: images.length, missingAlt: missingAltCount },
      formsCount: { total: inputs.length, unlabeled: unlabeledCount, placeholderOnly: placeholderOnlyCount },
      linksCount: { total: links.length, empty: emptyLinksCount, suspiciousPurpose: suspiciousPurposeCount },
      resourceSummary: { total: totalResources, thirdParty: thirdPartyResources, firstParty: firstPartyResources },
      trackersSummary,
      interstitialsDetected,
      pageLanguage,
      iframeCount,
      mainContentFound
    };
  }
}
