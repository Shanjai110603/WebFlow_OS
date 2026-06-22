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
      scores: { overall: 80, accessibility: 80, privacy: 80, ux: 80 },
      issues: [
        { id: '1', category: 'accessibility', subcategory: 'Media', severity: 'warning', title: 'Alt tag missing', description: 'desc', locator: { primarySelector: 'img.logo' }, scoreImpact: 5 }
      ]
    };

    const mockSessionB: any = {
      id: 'session-b',
      page: { domain: 'example.com' },
      completedAt: 2000,
      scores: { overall: 90, accessibility: 90, privacy: 95, ux: 85 },
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
      scores: { overall: 85, accessibility: 80, privacy: 90, ux: 85 },
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
      scores: { overall: 85, accessibility: 80, privacy: 90, ux: 85 },
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
      scores: { overall: 80, accessibility: 80, privacy: 80, ux: 80 },
      issues: [
        { id: '1', ruleId: 'alt-missing', category: 'accessibility', subcategory: 'Media', severity: 'warning', title: 'Alt tag missing', description: 'desc', locator: { primarySelector: 'img.logo' }, scoreImpact: 5, whyItMatters: 'why', remediation: 'remed' }
      ]
    };

    const mockSessionB: any = {
      id: 'session-b',
      page: { domain: 'example.com', url: 'https://example.com', timestamp: 2000 },
      completedAt: 2000,
      scores: { overall: 90, accessibility: 90, privacy: 95, ux: 85 },
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
        fontSize: 350, // Max size limit is 200
        lineHeight: 1.6,
        letterSpacing: 0.05,
        fontFamily: 'dyslexic'
      }
    };

    const result = FixerStateSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});
