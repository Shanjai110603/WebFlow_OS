// --- Color Contrast Utilities ---

export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

export function parseRGB(colorStr: string): RGBA | null {
  const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/i);
  if (match) {
    return {
      r: parseInt(match[1], 10),
      g: parseInt(match[2], 10),
      b: parseInt(match[3], 10),
      a: match[4] !== undefined ? parseFloat(match[4]) : 1.0
    };
  }
  return null;
}

export function getRelativeLuminance(color: RGBA): number {
  const rs = color.r / 255;
  const gs = color.g / 255;
  const bs = color.b / 255;

  const r = rs <= 0.03928 ? rs / 12.92 : Math.pow((rs + 0.055) / 1.055, 2.4);
  const g = gs <= 0.03928 ? gs / 12.92 : Math.pow((gs + 0.055) / 1.055, 2.4);
  const b = bs <= 0.03928 ? bs / 12.92 : Math.pow((bs + 0.055) / 1.055, 2.4);

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function calculateContrastRatio(color1: RGBA, color2: RGBA): number {
  const l1 = getRelativeLuminance(color1);
  const l2 = getRelativeLuminance(color2);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

export function getResolvedBackgroundColor(el: HTMLElement, win: Window): RGBA {
  let currentEl: HTMLElement | null = el;
  while (currentEl) {
    const style = win.getComputedStyle(currentEl);
    const bg = style.backgroundColor;
    const parsed = parseRGB(bg);
    if (parsed && parsed.a > 0.1) {
      return parsed;
    }
    currentEl = currentEl.parentElement;
  }
  return { r: 255, g: 255, b: 255, a: 1.0 }; // Default white
}

// --- CSS Selector Utilities ---

export function getUniqueCSSSelector(el: HTMLElement): string {
  if (el.id) {
    return `#${el.id}`;
  }

  const path: string[] = [];
  let currentEl: HTMLElement | null = el;

  while (currentEl && currentEl.nodeType === Node.ELEMENT_NODE) {
    let selector = currentEl.nodeName.toLowerCase();
    
    if (currentEl.parentElement) {
      const siblings = Array.from(currentEl.parentElement.children);
      const sameTagSiblings = siblings.filter(sib => sib.nodeName === currentEl!.nodeName);
      
      if (sameTagSiblings.length > 1) {
        const index = sameTagSiblings.indexOf(currentEl) + 1;
        selector += `:nth-of-type(${index})`;
      }
    }
    
    path.unshift(selector);
    currentEl = currentEl.parentElement;
  }

  return path.join(' > ');
}

// --- DOM Path Finder ---

export function getDOMPath(el: HTMLElement): string[] {
  const path: string[] = [];
  let currentEl: HTMLElement | null = el;
  while (currentEl) {
    path.unshift(currentEl.tagName.toLowerCase());
    currentEl = currentEl.parentElement;
  }
  return path;
}

// --- Text Similarity Checker ---

export function calculateTextSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1.0;
  if (!str1 || !str2) return 0.0;

  const s1 = str1.trim().toLowerCase();
  const s2 = str2.trim().toLowerCase();
  if (s1 === s2) return 1.0;

  // Simple Jaccard similarity of 3-grams
  const getGrams = (s: string) => {
    const grams = new Set<string>();
    for (let i = 0; i < s.length - 2; i++) {
      grams.add(s.substring(i, i + 3));
    }
    return grams;
  };

  const g1 = getGrams(s1);
  const g2 = getGrams(s2);

  const intersection = new Set([...g1].filter(x => g2.has(x)));
  const union = new Set([...g1, ...g2]);

  if (union.size === 0) return 0.0;
  return intersection.size / union.size;
}

// --- Safe HTML Sanitization/Escaping ---

export function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
