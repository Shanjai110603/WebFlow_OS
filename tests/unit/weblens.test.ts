import { describe, it, expect } from 'vitest';
import { 
  parseRGB, 
  calculateContrastRatio 
} from '../../src/packages/shared/utils';
import { TRACKER_RULES } from '../../src/packages/shared/constants';
import { ScoringEngine } from '../../src/packages/domain/scoring-engine';
import { HistoryEngine } from '../../src/packages/domain/history-engine';
import { ReportEngine } from '../../src/packages/domain/report-engine';
import { FixerStateSchema } from '../../src/packages/shared/schemas';
import { SecurityEngine } from '../../src/packages/domain/security-engine';
import { SeoEngine } from '../../src/packages/domain/seo-engine';
import { JSDOM } from 'jsdom';

describe('WCAG Color Contrast Calculations', () => {
  it('should parse rgb color strings correctly', () => {
    const rgb = parseRGB('rgb(255, 255, 255)');
    expect(rgb).not.toBeNull();
    expect(rgb!.r).toBe(255);
    expect(rgb!.g).toBe(255);
    expect(rgb!.b).toBe(255);
    expect(rgb!.a).toBe(1.0);

    const rgba = parseRGB('rgba(12, 34, 56, 0.5)');
    expect(rgba).not.toBeNull();
    expect(rgba!.r).toBe(12);
    expect(rgba!.g).toBe(34);
    expect(rgba!.b).toBe(56);
    expect(rgba!.a).toBe(0.5);
  });

  it('should calculate correct contrast ratio for black and white', () => {
    const white = { r: 255, g: 255, b: 255, a: 1.0 };
    const black = { r: 0, g: 0, b: 0, a: 1.0 };

    const ratio = calculateContrastRatio(white, black);
    expect(ratio).toBeCloseTo(21.0, 1);
  });

  it('should calculate correct contrast ratio for low contrast colors', () => {
    const white = { r: 255, g: 255, b: 255, a: 1.0 };
    const gray = { r: 119, g: 119, b: 119, a: 1.0 }; // #777777

    const ratio = calculateContrastRatio(white, gray);
    expect(ratio).toBeCloseTo(4.47, 1);
  });
});

describe('Tracker Classification Mapping', () => {
  it('should detect analytics trackers', () => {
    const url = 'https://www.google-analytics.com/analytics.js';
    const match = TRACKER_RULES.find(r => url.includes(r.pattern));
    expect(match).toBeDefined();
    expect(match!.category).toBe('analytics');
  });

  it('should detect advertising trackers', () => {
    const url = 'https://ad.doubleclick.net/adj/name';
    const match = TRACKER_RULES.find(r => url.includes(r.pattern));
    expect(match).toBeDefined();
    expect(match!.category).toBe('advertising');
  });
});

describe('Scoring Engine Calculations', () => {
  it('should calculate accessibility scores with correct deductions', () => {
    const rawIssues: any[] = [
      { engine: 'accessibility', ruleId: 'missing-alt-text' }, // -5
      { engine: 'accessibility', ruleId: 'contrast' } // -10
    ];

    const result = ScoringEngine.calculate(rawIssues, false, 0, false);
    expect(result.accessibility).toBe(85);
  });

  it('should cap deductions to floor caps', () => {
    const rawIssues: any[] = [
      { engine: 'accessibility', ruleId: 'contrast' },
      { engine: 'accessibility', ruleId: 'contrast' },
      { engine: 'accessibility', ruleId: 'contrast' },
      { engine: 'accessibility', ruleId: 'contrast' },
      { engine: 'accessibility', ruleId: 'contrast' },
      { engine: 'accessibility', ruleId: 'contrast' },
      { engine: 'accessibility', ruleId: 'contrast' } // 7 * 10 = 70 points
    ];

    const result = ScoringEngine.calculate(rawIssues, false, 0, false);
    // Max accessibility deduction cap is 60 points (Starting: 100, Floor: 40)
    expect(result.accessibility).toBe(40);
  });

  it('should calculate privacy score based on HTTP state and trackers', () => {
    const result = ScoringEngine.calculate([], true, 2, false); // HTTP Insecure (-30), 2 Trackers (-10)
    expect(result.privacy).toBe(60); // 100 - 40 = 60
  });
});

describe('History Match & Compare Engine', () => {
  it('should calculate delta report correctly', () => {
    const mockSessionA: any = {
      id: 'session-a',
      page: { domain: 'example.com' },
      completedAt: 1000,
      scores: { overall: 80, accessibility: 80, privacy: 80, ux: 80, security: 80, seo: 80 },
      issues: [
        { id: '1', category: 'accessibility', subcategory: 'Media', severity: 'warning', title: 'Alt tag missing', description: 'desc', locator: { primarySelector: 'img.logo' }, scoreImpact: 5 }
      ]
    };

    const mockSessionB: any = {
      id: 'session-b',
      page: { domain: 'example.com' },
      completedAt: 2000,
      scores: { overall: 90, accessibility: 90, privacy: 95, ux: 85, security: 90, seo: 90 },
      issues: [] // Issue is now resolved
    };

    const report = HistoryEngine.compare(mockSessionA, mockSessionB);
    expect(report.scoreDeltas.overall.difference).toBe(10);
    expect(report.resolvedIssues.length).toBe(1);
    expect(report.newIssues.length).toBe(0);
  });
});

describe('Report Compilation Exporter', () => {
  it('should compile valid Markdown reports', () => {
    const mockSession: any = {
      id: 'session-123',
      page: { domain: 'example.com', url: 'https://example.com', timestamp: Date.now() },
      completedAt: Date.now(),
      scores: { overall: 85, accessibility: 80, privacy: 90, ux: 85, security: 85, seo: 85 },
      issues: [
        { id: '1', category: 'accessibility', subcategory: 'Media', severity: 'warning', title: 'Alt tag missing', description: 'desc', locator: { primarySelector: 'img.logo' }, scoreImpact: 5, whyItMatters: 'why', remediation: 'remed' }
      ]
    };

    const md = ReportEngine.compileMarkdown(mockSession);
    expect(md).toContain('# WebLens OS Audit Report');
    expect(md).toContain('example.com');
    expect(md).toContain('Alt tag missing');
  });

  it('should compile valid CSV reports', () => {
    const mockSession: any = {
      id: 'session-123',
      page: { domain: 'example.com', url: 'https://example.com', timestamp: Date.now() },
      completedAt: Date.now(),
      scores: { overall: 85, accessibility: 80, privacy: 90, ux: 85, security: 85, seo: 85 },
      issues: [
        { id: '1', ruleId: 'alt-missing', category: 'accessibility', subcategory: 'Media', severity: 'warning', title: 'Alt tag missing', description: 'desc', locator: { primarySelector: 'img.logo' }, scoreImpact: 5, whyItMatters: 'why', remediation: 'remed' }
      ]
    };

    const csv = ReportEngine.compileCSV(mockSession);
    expect(csv).toContain('Rule ID,Severity,Title,Description,Selector path');
    expect(csv).toContain('alt-missing,warning,Alt tag missing,desc,img.logo');
  });

  it('should compile Markdown reports with comparison deltas', () => {
    const mockSessionA: any = {
      id: 'session-a',
      page: { domain: 'example.com', url: 'https://example.com', timestamp: 1000 },
      completedAt: 1000,
      scores: { overall: 80, accessibility: 80, privacy: 80, ux: 80, security: 80, seo: 80 },
      issues: [
        { id: '1', ruleId: 'alt-missing', category: 'accessibility', subcategory: 'Media', severity: 'warning', title: 'Alt tag missing', description: 'desc', locator: { primarySelector: 'img.logo' }, scoreImpact: 5, whyItMatters: 'why', remediation: 'remed' }
      ]
    };

    const mockSessionB: any = {
      id: 'session-b',
      page: { domain: 'example.com', url: 'https://example.com', timestamp: 2000 },
      completedAt: 2000,
      scores: { overall: 90, accessibility: 90, privacy: 95, ux: 85, security: 90, seo: 90 },
      issues: []
    };

    const report = HistoryEngine.compare(mockSessionA, mockSessionB);
    const md = ReportEngine.compileMarkdown(mockSessionB, report);
    expect(md).toContain('## Comparative Deltas (Relative to Previous Audit)');
    expect(md).toContain('Resolved Issues (1)');
  });
});

describe('Zod Schema Verification', () => {
  it('should validate valid preferences structure', () => {
    const valid = {
      version: 1,
      enabled: true,
      focusMode: false,
      darkMode: true,
      hideSticky: false,
      typography: {
        fontSize: 120,
        lineHeight: 1.6,
        letterSpacing: 0.05,
        fontFamily: 'dyslexic'
      }
    };

    const result = FixerStateSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('should block invalid typography font size values', () => {
    const invalid = {
      version: 1,
      enabled: true,
      focusMode: false,
      darkMode: true,
      hideSticky: false,
      typography: {
        fontSize: 350,
        lineHeight: 1.6,
        letterSpacing: 0.05,
        fontFamily: 'dyslexic'
      }
    };

    const result = FixerStateSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});

describe('Security Audit Engine', () => {
  it('should detect insecure HTTP connection', async () => {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://example.com/' });
    const context = {
      window: dom.window as any,
      document: dom.window.document,
      resources: []
    };
    const issues = await SecurityEngine.run(context);
    expect(issues.some(i => i.ruleId === 'insecure-transport-http')).toBe(true);
  });

  it('should detect mixed content resources', async () => {
    const dom = new JSDOM('<!DOCTYPE html><html><body><img src="http://example.com/image.png"></body></html>', { url: 'https://example.com/' });
    const context = {
      window: dom.window as any,
      document: dom.window.document,
      resources: [{ url: 'http://example.com/image.png', domain: 'example.com', type: 'image', thirdParty: false, tracker: false }]
    };
    const issues = await SecurityEngine.run(context);
    expect(issues.some(i => i.ruleId === 'mixed-content-resource')).toBe(true);
  });

  it('should detect unsafe target blank links', async () => {
    const dom = new JSDOM('<!DOCTYPE html><html><body><a href="https://external.com" target="_blank">External</a></body></html>', { url: 'https://example.com/' });
    const context = {
      window: dom.window as any,
      document: dom.window.document,
      resources: []
    };
    const issues = await SecurityEngine.run(context);
    expect(issues.some(i => i.ruleId === 'unsafe-target-blank')).toBe(true);
  });

  it('should detect insecure form actions', async () => {
    const dom = new JSDOM('<!DOCTYPE html><html><body><form action="http://insecure-api.com/submit"></form></body></html>', { url: 'https://example.com/' });
    const context = {
      window: dom.window as any,
      document: dom.window.document,
      resources: []
    };
    const issues = await SecurityEngine.run(context);
    expect(issues.some(i => i.ruleId === 'insecure-form-action')).toBe(true);
  });
});

describe('SEO Audit Engine', () => {
  it('should detect missing title and meta descriptions', async () => {
    const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>', { url: 'https://example.com/' });
    const context = {
      window: dom.window as any,
      document: dom.window.document,
      resources: []
    };
    const issues = await SeoEngine.run(context);
    expect(issues.some(i => i.ruleId === 'missing-seo-title')).toBe(true);
    expect(issues.some(i => i.ruleId === 'missing-seo-description')).toBe(true);
  });

  it('should detect suboptimal title lengths', async () => {
    const dom = new JSDOM('<!DOCTYPE html><html><head><title>Too Short</title></head><body></body></html>', { url: 'https://example.com/' });
    const context = {
      window: dom.window as any,
      document: dom.window.document,
      resources: []
    };
    const issues = await SeoEngine.run(context);
    expect(issues.some(i => i.ruleId === 'seo-title-length')).toBe(true);
  });

  it('should detect missing or multiple H1 elements', async () => {
    const dom = new JSDOM('<!DOCTYPE html><html><body><h1>Header 1</h1><h1>Header 2</h1></body></html>', { url: 'https://example.com/' });
    const context = {
      window: dom.window as any,
      document: dom.window.document,
      resources: []
    };
    const issues = await SeoEngine.run(context);
    expect(issues.some(i => i.ruleId === 'multiple-h1s')).toBe(true);
  });
});
