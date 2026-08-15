export interface ScanContext {
  document: Document;
  window: Window;
  url?: string;
  domain?: string;
  resources?: ResourceSummary[];
}

export interface AuditRule {
  id: string;
  name: string;
  category: 'accessibility' | 'privacy' | 'ux' | 'readability' | 'security' | 'seo' | 'performance';
  severityDefault: 'critical' | 'warning' | 'info';
  scoreImpact: number;
  run: (context: ScanContext) => Promise<RawIssue[]>;
}

export interface IssueMatchResult {
  matched: boolean;
  confidence: number;
  reason: 'selector' | 'xpath' | 'dompath' | 'text-similarity' | 'none';
}

export interface StickyCandidate {
  element: HTMLElement;
  reasons: string[];
  score: number;
  areaRatio: number;
  zIndex: number;
  fixedOrSticky: boolean;
  likelyBlocking: boolean;
}

// --- A. Raw Scan Model ---
export interface RawIssue {
  id: string; // Hash of ruleId + selector/evidence
  engine: 'accessibility' | 'privacy' | 'readability' | 'ux' | 'security' | 'seo' | 'performance';
  ruleId: string;
  severity: 'critical' | 'warning' | 'info';
  locator?: IssueLocator;
  message: string;
  evidence?: string;
  metadata: Record<string, unknown>;
  confidence?: 'confirmed' | 'heuristic';
  suggestedFix?: string;
  quickFixPreviewSelector?: string;
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
  ruleId: string;
  category: 'accessibility' | 'privacy' | 'ux' | 'readability' | 'security' | 'seo' | 'performance';
  subcategory: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  whyItMatters: string;
  remediation: string;
  locator?: IssueLocator;
  scoreImpact: number;
  evidence?: string;
  confidence?: 'confirmed' | 'heuristic';
  suggestedFix?: string;
  quickFixPreviewSelector?: string;
}

export type ScanProfileType = 'quick' | 'full' | 'accessibility' | 'privacy' | 'ux' | 'security' | 'seo' | 'performance' | 'developer' | 'summary';

export interface PageInsights {
  headingsCount: Record<'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6', number>;
  imagesCount: { total: number; missingAlt: number };
  formsCount: { total: number; unlabeled: number; placeholderOnly: number };
  linksCount: { total: number; empty: number; suspiciousPurpose: number };
  resourceSummary: { total: number; thirdParty: number; firstParty: number };
  trackersSummary: { analytics: number; advertising: number; social: number; utility: number; total: number };
  interstitialsDetected: number;
  pageLanguage?: string;
  iframeCount: number;
  mainContentFound: boolean;
  seoMetadata?: {
    title?: string;
    titleLength: number;
    description?: string;
    descriptionLength: number;
    canonical?: string;
    robots?: string;
    charset?: string;
    hasViewport: boolean;
    structuredDataCount: number;
    structuredDataTypes: string[];
  };
}

// --- C. Audit Session / Saved Report Model ---
export interface AuditSession {
  id: string; // UUID v4
  schemaVersion: number; // Verification version (1 for current DB)
  scanProfile?: ScanProfileType;
  page: PageSnapshot;
  startedAt: number;
  completedAt: number;
  scores: ScoreBreakdown;
  issues: AuditIssue[];
  resources: ResourceSummary[];
  insights?: PageInsights;
  fixerState: FixerState;
  userNotes?: string;
  isPinned?: boolean;
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
  readerMode?: boolean;
  readingWidth?: 'narrow' | 'medium' | 'wide' | 'full';
  paragraphSpacing?: number;
  headingEmphasis?: boolean;
  imageDimming?: boolean;
  highlightLinks?: boolean;
  readingRuler?: boolean;
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

export interface CategoryPolicy {
  category: 'accessibility' | 'privacy' | 'ux' | 'security' | 'seo' | 'performance';
  startingScore: number;
  maxDeductionCap: number;
  deductionWeights: Record<string, number>;
}

export interface ScoreExplanation {
  category: 'accessibility' | 'privacy' | 'ux' | 'security' | 'seo' | 'performance';
  startingScore: number;
  deductions: DeductionRecord[];
  finalScore: number;
}

export interface ScoreBreakdown {
  overall: number;
  accessibility: number;
  privacy: number;
  ux: number;
  security: number;
  seo: number;
  performance: number;
  explanations: {
    accessibility: ScoreExplanation;
    privacy: ScoreExplanation;
    ux: ScoreExplanation;
    security: ScoreExplanation;
    seo: ScoreExplanation;
    performance: ScoreExplanation;
  };
}

// --- G. Compare Model ---
export interface ScoreDelta {
  before: number;
  after: number;
  difference: number;
}

export interface ComparisonReport {
  id?: string;
  domain: string;
  comparedAt?: number;
  sessionA: { id: string; timestamp: number };
  sessionB: { id: string; timestamp: number };
  scoreDeltas: {
    overall: ScoreDelta;
    accessibility: ScoreDelta;
    privacy: ScoreDelta;
    ux: ScoreDelta;
    security: ScoreDelta;
    seo: ScoreDelta;
    performance: ScoreDelta;
  };
  insightsDelta?: {
    trackersDifference: number;
    unlabeledFormsDifference: number;
  };
  newIssues: AuditIssue[];
  resolvedIssues: AuditIssue[];
  persistentIssues: AuditIssue[];
  matchConfidence?: 'high' | 'medium' | 'low';
}

// --- H. Extension Chrome Message Contract ---
export type ExtensionActionType =
  | 'RUN_AUDIT'
  | 'GET_AUDIT'
  | 'APPLY_FIXER_SETTINGS'
  | 'GET_FIXER_SETTINGS'
  | 'HIGHLIGHT_ISSUE'
  | 'CLEAR_HIGHLIGHT'
  | 'LOAD_HISTORY'
  | 'DELETE_HISTORY'
  | 'PIN_HISTORY'
  | 'COMPARE_AUDITS'
  | 'EXPORT_REPORT'
  | 'SAVE_ANNOTATION';

export interface CommandMap {
  RUN_AUDIT: { tabId: number; scanProfile?: ScanProfileType };
  GET_AUDIT: { tabId: number };
  APPLY_FIXER_SETTINGS: { tabId: number; settings: FixerState };
  GET_FIXER_SETTINGS: { tabId: number };
  HIGHLIGHT_ISSUE: { tabId: number; selector: string };
  CLEAR_HIGHLIGHT: { tabId: number };
  LOAD_HISTORY: Record<string, never>;
  DELETE_HISTORY: { id: string };
  PIN_HISTORY: { id: string; pinned: boolean };
  COMPARE_AUDITS: { idA: string; idB: string };
  EXPORT_REPORT: { id: string; tabId?: number; session?: AuditSession; format: 'pdf' | 'md' | 'json' | 'csv' };
  SAVE_ANNOTATION: { id: string; notes: string };
}

export interface CommandResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    context?: Record<string, unknown>;
  };
}
