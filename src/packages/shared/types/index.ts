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
  confidence?: 'confirmed' | 'heuristic';
  suggestedFix?: string;
  quickFixPreviewSelector?: string;
}

export type ScanProfileType = 'quick' | 'full' | 'accessibility' | 'privacy' | 'ux' | 'developer' | 'summary';

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
  };
  resolvedIssues: AuditIssue[];
  newIssues: AuditIssue[];
  persistentIssues: AuditIssue[];
  insightsDelta?: {
    trackersDifference: number;
    unlabeledFormsDifference: number;
  };
  matchConfidence?: 'strong' | 'weak';
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

// --- I. Missing Platform & Domain Types ---
export interface CategoryPolicy {
  category: 'accessibility' | 'privacy' | 'ux';
  startingScore: number;
  maxDeductionCap: number;
  deductionWeights: Record<string, number>;
}

export interface ScanContext {
  document: Document;
  window: Window;
  resources: ResourceSummary[];
}

export interface AuditRule {
  id: string;
  name: string;
  category: 'accessibility' | 'privacy' | 'readability' | 'ux';
  severityDefault: 'critical' | 'warning' | 'info';
  scoreImpact: number;
  run(context: ScanContext): Promise<RawIssue[]>;
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

export interface CommandError {
  code:
    | 'MESSAGING_TIMEOUT'
    | 'INVALID_PAYLOAD'
    | 'UNKNOWN_COMMAND'
    | 'STORAGE_CORRUPTED'
    | 'SCAN_FAILED'
    | 'EXPORT_FAILED'
    | 'HIGHLIGHT_FAILED'
    | 'CONTENT_SCRIPT_UNAVAILABLE'
    | 'PERMISSION_DENIED';
  message: string;
  context?: Record<string, unknown>;
}

export type CommandResponse<T> =
  | { success: true; data: T }
  | { success: false; error: CommandError };

export interface CommandMap {
  RUN_AUDIT: {
    payload: { tabId: number; scanProfile?: ScanProfileType };
    response: AuditSession;
  };
  GET_AUDIT: {
    payload: { tabId: number };
    response: AuditSession | null;
  };
  APPLY_FIXER_SETTINGS: {
    payload: { tabId: number; settings: FixerState };
    response: void;
  };
  GET_FIXER_SETTINGS: {
    payload: { tabId: number };
    response: FixerState;
  };
  HIGHLIGHT_ISSUE: {
    payload: { tabId: number; selector: string };
    response: void;
  };
  CLEAR_HIGHLIGHT: {
    payload: { tabId: number };
    response: void;
  };
  LOAD_HISTORY: {
    payload: Record<string, never>;
    response: AuditSession[];
  };
  DELETE_HISTORY: {
    payload: { id: string };
    response: void;
  };
  PIN_HISTORY: {
    payload: { id: string; pinned: boolean };
    response: void;
  };
  COMPARE_AUDITS: {
    payload: { idA: string; idB: string };
    response: ComparisonReport;
  };
  EXPORT_REPORT: {
    payload: { id: string; format: 'md' | 'json' | 'csv' };
    response: string;
  };
  SAVE_ANNOTATION: {
    payload: { id: string; notes: string };
    response: void;
  };
}
