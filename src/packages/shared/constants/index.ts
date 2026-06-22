import { CategoryPolicy } from '../types';

export const CORE_VERSION = '1.0.0';
export const RULES_VERSION = '1.0.0';

export const DEFAULT_FIXER_STATE = {
  version: 1,
  enabled: false,
  focusMode: false,
  darkMode: false,
  hideSticky: false,
  readerMode: false,
  readingWidth: 'medium' as const,
  paragraphSpacing: 1.0,
  headingEmphasis: false,
  imageDimming: false,
  highlightLinks: false,
  readingRuler: false,
  typography: {
    fontSize: 100,
    lineHeight: 1.5,
    letterSpacing: 0,
    fontFamily: 'default' as const
  }
};

export const SCORING_POLICIES: Record<'accessibility' | 'privacy' | 'ux' | 'security' | 'seo', CategoryPolicy> = {
  accessibility: {
    category: 'accessibility',
    startingScore: 100,
    maxDeductionCap: 60, // Floor limit of 40
    deductionWeights: {
      'missing-alt-text': 5,
      'missing-form-label': 10,
      'empty-button': 10,
      'heading-order': 5,
      'contrast': 10,
      'focus-indicator': 5
    }
  },
  privacy: {
    category: 'privacy',
    startingScore: 100,
    maxDeductionCap: 70, // Floor limit of 30
    deductionWeights: {
      'http-page': 30,
      'mixed-content': 10,
      'known-tracker': 5, // Per domain
      'overlay-dark-pattern': 15
    }
  },
  ux: {
    category: 'ux',
    startingScore: 100,
    maxDeductionCap: 50, // Floor limit of 50
    deductionWeights: {
      'small-body-text': 10,
      'bad-line-height': 10,
      'sticky-overlay': 10,
      'dense-content': 10
    }
  },
  security: {
    category: 'security',
    startingScore: 100,
    maxDeductionCap: 60, // Floor limit of 40
    deductionWeights: {
      'insecure-transport-http': 30,
      'mixed-content-resource': 15,
      'unsafe-target-blank': 10,
      'unsafe-javascript-links': 10,
      'insecure-form-action': 25,
      'insecure-password-form': 30,
      'risky-inline-event-handlers': 5,
      'deceptive-interaction-blocker': 15
    }
  },
  seo: {
    category: 'seo',
    startingScore: 100,
    maxDeductionCap: 60, // Floor limit of 40
    deductionWeights: {
      'missing-seo-title': 20,
      'seo-title-length': 10,
      'missing-seo-description': 15,
      'seo-description-length': 10,
      'missing-canonical-tag': 10,
      'missing-viewport-meta': 10,
      'missing-h1': 20,
      'multiple-h1s': 10,
      'broken-heading-hierarchy': 10,
      'empty-anchor-seo': 10,
      'missing-structured-data': 10
    }
  }
};

// Tracker rules map
export const TRACKER_RULES = [
  { pattern: 'google-analytics.com', category: 'analytics' as const },
  { pattern: 'googletagmanager.com', category: 'analytics' as const },
  { pattern: 'mixpanel.com', category: 'analytics' as const },
  { pattern: 'amplitude.com', category: 'analytics' as const },
  { pattern: 'hotjar.com', category: 'analytics' as const },
  { pattern: 'doubleclick.net', category: 'advertising' as const },
  { pattern: 'googleadservices.com', category: 'advertising' as const },
  { pattern: 'adnxs.com', category: 'advertising' as const },
  { pattern: 'facebook.net', category: 'advertising' as const },
  { pattern: 'facebook.com/tr', category: 'advertising' as const },
  { pattern: 'rubiconproject.com', category: 'advertising' as const },
  { pattern: 'pubmatic.com', category: 'advertising' as const },
  { pattern: 'twitter.com', category: 'social' as const },
  { pattern: 'linkedin.com', category: 'social' as const },
  { pattern: 'pinterest.com', category: 'social' as const },
  { pattern: 'sentry.io', category: 'utility' as const },
  { pattern: 'bugsnag.com', category: 'utility' as const },
  { pattern: 'recaptcha.net', category: 'utility' as const }
];
