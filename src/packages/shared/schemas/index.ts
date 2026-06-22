import { z } from 'zod';

export const TypographyConfigSchema = z.object({
  fontSize: z.number().min(80).max(200),
  lineHeight: z.number().min(1.0).max(2.5),
  letterSpacing: z.number().min(0).max(0.2),
  fontFamily: z.enum(['default', 'sans-serif', 'serif', 'dyslexic'])
});

export const FixerStateSchema = z.object({
  version: z.number().int(),
  enabled: z.boolean(),
  focusMode: z.boolean(),
  darkMode: z.boolean(),
  hideSticky: z.boolean(),
  readerMode: z.boolean().optional(),
  readingWidth: z.enum(['narrow', 'medium', 'wide', 'full']).optional(),
  paragraphSpacing: z.number().optional(),
  headingEmphasis: z.boolean().optional(),
  imageDimming: z.boolean().optional(),
  highlightLinks: z.boolean().optional(),
  readingRuler: z.boolean().optional(),
  typography: TypographyConfigSchema,
  lastUpdatedAt: z.number().optional()
});

export const SitePreferenceRecordSchema = z.object({
  domain: z.string(),
  state: FixerStateSchema,
  updatedAt: z.number()
});

export const PageSnapshotSchema = z.object({
  url: z.string().url(),
  domain: z.string(),
  title: z.string(),
  timestamp: z.number()
});

export const ResourceSummarySchema = z.object({
  url: z.string(),
  domain: z.string(),
  type: z.string(),
  thirdParty: z.boolean(),
  tracker: z.boolean(),
  trackerCategory: z.enum(['analytics', 'advertising', 'social', 'utility']).optional()
});

export const IssueLocatorSchema = z.object({
  primarySelector: z.string().optional(),
  fallbackSelectors: z.array(z.string()).optional(),
  xpath: z.string().optional(),
  domPath: z.array(z.string()).optional(),
  textSnippet: z.string().optional(),
  tagName: z.string().optional(),
  attributes: z.record(z.string(), z.string()).optional(),
  boundingBoxHint: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number()
  }).optional()
});

export const AuditIssueSchema = z.object({
  id: z.string(),
  ruleId: z.string(),
  category: z.enum(['accessibility', 'privacy', 'ux', 'readability', 'security', 'seo']),
  subcategory: z.string(),
  severity: z.enum(['critical', 'warning', 'info']),
  title: z.string(),
  description: z.string(),
  whyItMatters: z.string(),
  remediation: z.string(),
  locator: IssueLocatorSchema.optional(),
  scoreImpact: z.number(),
  evidence: z.string().optional(),
  confidence: z.enum(['confirmed', 'heuristic']).optional(),
  suggestedFix: z.string().optional(),
  quickFixPreviewSelector: z.string().optional()
});

export const PageInsightsSchema = z.object({
  headingsCount: z.object({
    h1: z.number(),
    h2: z.number(),
    h3: z.number(),
    h4: z.number(),
    h5: z.number(),
    h6: z.number()
  }),
  imagesCount: z.object({ total: z.number(), missingAlt: z.number() }),
  formsCount: z.object({ total: z.number(), unlabeled: z.number(), placeholderOnly: z.number() }),
  linksCount: z.object({ total: z.number(), empty: z.number(), suspiciousPurpose: z.number() }),
  resourceSummary: z.object({ total: z.number(), thirdParty: z.number(), firstParty: z.number() }),
  trackersSummary: z.object({
    analytics: z.number(),
    advertising: z.number(),
    social: z.number(),
    utility: z.number(),
    total: z.number()
  }),
  interstitialsDetected: z.number(),
  pageLanguage: z.string().optional(),
  iframeCount: z.number(),
  mainContentFound: z.boolean(),
  seoMetadata: z.object({
    title: z.string().optional(),
    titleLength: z.number(),
    description: z.string().optional(),
    descriptionLength: z.number(),
    canonical: z.string().optional(),
    robots: z.string().optional(),
    charset: z.string().optional(),
    hasViewport: z.boolean(),
    structuredDataCount: z.number(),
    structuredDataTypes: z.array(z.string())
  }).optional()
});

export const DeductionRecordSchema = z.object({
  ruleId: z.string(),
  count: z.number(),
  pointsPerDeduction: z.number(),
  totalDeducted: z.number()
});

export const ScoreExplanationSchema = z.object({
  category: z.enum(['accessibility', 'privacy', 'ux', 'security', 'seo']),
  startingScore: z.number(),
  deductions: z.array(DeductionRecordSchema),
  finalScore: z.number()
});

export const ScoreBreakdownSchema = z.object({
  overall: z.number().min(0).max(100),
  accessibility: z.number().min(0).max(100),
  privacy: z.number().min(0).max(100),
  ux: z.number().min(0).max(100),
  security: z.number().min(0).max(100),
  seo: z.number().min(0).max(100),
  explanations: z.object({
    accessibility: ScoreExplanationSchema,
    privacy: ScoreExplanationSchema,
    ux: ScoreExplanationSchema,
    security: ScoreExplanationSchema,
    seo: ScoreExplanationSchema
  })
});

export const AuditSessionSchema = z.object({
  id: z.string().uuid(),
  schemaVersion: z.number().int(),
  scanProfile: z.enum(['quick', 'full', 'accessibility', 'privacy', 'ux', 'security', 'seo', 'developer', 'summary']).optional(),
  page: PageSnapshotSchema,
  startedAt: z.number(),
  completedAt: z.number(),
  scores: ScoreBreakdownSchema,
  issues: z.array(AuditIssueSchema),
  resources: z.array(ResourceSummarySchema),
  insights: PageInsightsSchema.optional(),
  fixerState: FixerStateSchema,
  userNotes: z.string().optional(),
  isPinned: z.boolean().optional(),
  engineVersions: z.object({
    core: z.string(),
    rules: z.string()
  }),
  metadata: z.object({
    userAgent: z.string(),
    viewport: z.object({
      width: z.number(),
      height: z.number()
    })
  })
});

export const StorageDumpSchema = z.object({
  preferences: z.record(z.string(), SitePreferenceRecordSchema).default({}),
  history: z.array(AuditSessionSchema).default([])
});

// --- Command Payload Validators ---
export const PayloadValidators = {
  RUN_AUDIT: z.object({
    tabId: z.number().int().positive(),
    scanProfile: z.enum(['quick', 'full', 'accessibility', 'privacy', 'ux', 'developer', 'summary']).optional()
  }),
  GET_AUDIT: z.object({
    tabId: z.number().int().positive()
  }),
  APPLY_FIXER_SETTINGS: z.object({
    tabId: z.number().int().positive(),
    settings: FixerStateSchema
  }),
  GET_FIXER_SETTINGS: z.object({
    tabId: z.number().int().positive()
  }),
  HIGHLIGHT_ISSUE: z.object({
    tabId: z.number().int().positive(),
    selector: z.string().min(1)
  }),
  CLEAR_HIGHLIGHT: z.object({
    tabId: z.number().int().positive()
  }),
  LOAD_HISTORY: z.object({}),
  DELETE_HISTORY: z.object({
    id: z.string().uuid()
  }),
  PIN_HISTORY: z.object({
    id: z.string().uuid(),
    pinned: z.boolean()
  }),
  COMPARE_AUDITS: z.object({
    idA: z.string().uuid(),
    idB: z.string().uuid()
  }),
  EXPORT_REPORT: z.object({
    id: z.string().uuid(),
    format: z.enum(['md', 'json', 'csv'])
  }),
  SAVE_ANNOTATION: z.object({
    id: z.string().uuid(),
    notes: z.string()
  })
};
