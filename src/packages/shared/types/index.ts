// --- A. Raw Scan Model ---
export interface RawIssue {
  id: string; // Hash of ruleId + selector/evidence
  engine: 'accessibility' | 'privacy' | 'readability' | 'ux';
  ruleId: string;
  severity: 'critical' | 'warning' | 'info';
  locator?: IssueLocator;
  message: string;
  evidence?: string;
  metadata: Record<string, unknown>;
}

export interface IssueLocator {
  primarySelector?: string; // Stable CSS selector (fallback to parent tree)
  fallbackSelectors?: string[];
  xpath?: string; // XML path locator
  domPath?: string[]; // Tag tree from root node
  textSnippet?: string; // Content of targeted tag
  tagName?: string; // e.g. "IMG", "BUTTON"
  attributes?: Record<string, string>; // Attributes list (class, id, role)
  boundingBoxHint?: { x: number; y: number; width: number; height: number };
}

// --- B. Normalized Issue Model ---
export interface AuditIssue {
  id: string;
  category: 'accessibility' | 'privacy' | 'ux' | 'readability';
  subcategory: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  whyItMatters: string;
  remediation: string;
  locator?: IssueLocator;
  scoreImpact: number;
  evidence?: string;
}

// --- C. Audit Session / Saved Report Model ---
export interface AuditSession {
  id: string; // UUID v4
  schemaVersion: number; // Verification version (1 for current DB)
  page: PageSnapshot;
  startedAt: number;
  completedAt: number;
  scores: ScoreBreakdown;
  issues: AuditIssue[];
  resources: ResourceSummary[];
  fixerState: FixerState;
  engineVersions: {
    core: string;
    rules: string;
  };
  metadata: {
    userAgent: string;
    viewport: { width: number; height: number };
  };
}

export interface PageSnapshot {
  url: string;
  domain: string;
  title: string;
  timestamp: number;
}

// --- D. Resource Summary Model ---
export interface ResourceSummary {
  url: string;
  domain: string;
  type: string;
  thirdParty: boolean;
  tracker: boolean;
  trackerCategory?: 'analytics' | 'advertising' | 'social' | 'utility';
}

// --- E. Fixer State & Site Preference Model ---
export interface FixerState {
  version: number; // Schema version (e.g. 1)
  enabled: boolean;
  focusMode: boolean;
  darkMode: boolean;
  hideSticky: boolean;
  typography: TypographyConfig;
  lastUpdatedAt?: number;
}

export interface TypographyConfig {
  fontSize: number; // 100 to 200 (%)
  lineHeight: number; // 1.0 to 2.5
  letterSpacing: number; // 0 to 0.2 (em)
  fontFamily: 'default' | 'sans-serif' | 'serif' | 'dyslexic';
}

export interface SitePreferenceRecord {
  domain: string;
  state: FixerState;
  updatedAt: number;
}

export interface UserPreferences {
  [domain: string]: SitePreferenceRecord;
}

// --- F. Score Explanation Models ---
export interface DeductionRecord {
  ruleId: string;
  count: number;
  pointsPerDeduction: number;
  totalDeducted: number;
}

export interface ScoreExplanation {
  category: 'accessibility' | 'privacy' | 'ux';
  startingScore: number;
  deductions: DeductionRecord[];
  finalScore: number;
}

export interface ScoreBreakdown {
  overall: number;
  accessibility: number;
  privacy: number;
  ux: number;
  explanations: {
    accessibility: ScoreExplanation;
    privacy: ScoreExplanation;
    ux: ScoreExplanation;
  };
}

// --- G. Compare Model ---
export interface ScoreDelta {
  before: number;
  after: number;
  difference: number;
}

export interface ComparisonReport {
  domain: string;
  sessionA: { id: string; timestamp: number };
  sessionB: { id: string; timestamp: number };
  scoreDeltas: {
    overall: ScoreDelta;
    accessibility: ScoreDelta;
    privacy: ScoreDelta;
    ux: ScoreDelta;
  };
  resolvedIssues: AuditIssue[];
  newIssues: AuditIssue[];
  persistentIssues: AuditIssue[];
}

export interface IssueMatchResult {
  matched: boolean;
  confidence: number; // 0.0 to 1.0
  reason: 'selector' | 'xpath' | 'dompath' | 'text-similarity' | 'none';
}

// --- H. Error Payload Model ---
export interface ErrorPayload {
  code: 'SCAN_FAILED' | 'STORAGE_CORRUPTED' | 'MESSAGING_TIMEOUT' | 'EXPORT_FAILED' | 'HIGHLIGHT_FAILED';
  message: string;
  timestamp: number;
  context?: Record<string, unknown>;
  recoverable: boolean;
}
