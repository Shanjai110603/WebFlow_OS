import { AuditRule, RawIssue, AuditIssue, ScanContext } from '../../shared/types';
import { SCORING_POLICIES } from '../../shared/constants';

// Rule Imports
import {
  MissingAltTextRule,
  MissingFormLabelRule,
  EmptyButtonRule,
  HeadingOrderRule,
  ContrastRule,
  FocusIndicatorRule
} from '../accessibility-engine';

import {
  HttpPageRule,
  MixedContentRule,
  KnownTrackerRule,
  OverlayDarkPatternRule
} from '../privacy-engine';

import {
  SmallBodyTextRule,
  BadLineHeightRule,
  StickyOverlayRule,
  DenseContentRule
} from '../readability-engine';

export class RuleRegistry {
  private rules: Map<string, AuditRule> = new Map();

  public register(rule: AuditRule): void {
    if (this.rules.has(rule.id)) {
      throw new Error(`Rule already registered: ${rule.id}`);
    }
    this.rules.set(rule.id, rule);
  }

  public async runAll(context: ScanContext): Promise<RawIssue[]> {
    const promises = Array.from(this.rules.values()).map(async (rule) => {
      try {
        return await rule.run(context);
      } catch (err) {
        console.error(`Rule ${rule.id} failed:`, err);
        return []; // Isolated failure fallback
      }
    });

    const results = await Promise.allSettled(promises);
    const rawIssues: RawIssue[] = [];

    for (const result of results) {
      if (result.status === 'fulfilled') {
        rawIssues.push(...result.value);
      }
    }

    return rawIssues;
  }
}

export function createDefaultRegistry(): RuleRegistry {
  const registry = new RuleRegistry();

  // 1. Accessibility
  registry.register(MissingAltTextRule);
  registry.register(MissingFormLabelRule);
  registry.register(EmptyButtonRule);
  registry.register(HeadingOrderRule);
  registry.register(ContrastRule);
  registry.register(FocusIndicatorRule);

  // 2. Privacy
  registry.register(HttpPageRule);
  registry.register(MixedContentRule);
  registry.register(KnownTrackerRule);
  registry.register(OverlayDarkPatternRule);

  // 3. Readability & UX
  registry.register(SmallBodyTextRule);
  registry.register(BadLineHeightRule);
  registry.register(StickyOverlayRule);
  registry.register(DenseContentRule);

  return registry;
}

// --- Dynamic Issue Normalizer ---
export class IssueNormalizer {
  private static issueDetails: Record<
    string,
    {
      title: string;
      subcategory: string;
      whyItMatters: string;
      remediation: string;
    }
  > = {
    'missing-alt-text': {
      title: 'Image missing alternative text',
      subcategory: 'Images & Media',
      whyItMatters: 'Screen reader users rely on alternative text descriptions to understand what an image contains.',
      remediation: 'Add an alt="..." attribute to the image element describing its visual content. Use an empty alt="" attribute if the image is purely decorative.'
    },
    'missing-form-label': {
      title: 'Form field missing associated label',
      subcategory: 'Forms & Controls',
      whyItMatters: 'Without associated labels, screen readers cannot explain the purpose of a form input when users focus on it.',
      remediation: 'Associate the field with a <label> element using the "for" attribute matching the input "id", or add an "aria-label" or "aria-labelledby" descriptor.'
    },
    'empty-button': {
      title: 'Button or link has no text value',
      subcategory: 'Interactions',
      whyItMatters: 'Empty control elements leave screen reader users completely unaware of what action clicking will execute.',
      remediation: 'Insert text content inside the button or anchor tags, or define a description using the "aria-label" attribute.'
    },
    'heading-order': {
      title: 'Incorrect heading level order',
      subcategory: 'Structure',
      whyItMatters: 'Skipping heading levels (e.g. H2 followed directly by H4) disrupts logical outline structures used for layout navigation.',
      remediation: 'Structure headings sequentially (H1 followed by H2, then H3, etc.). Do not select headers based only on their visual dimensions.'
    },
    'contrast': {
      title: 'Text has low contrast ratio',
      subcategory: 'Readability',
      whyItMatters: 'Users with visual impairments or color blindness cannot distinguish text that blends too closely into its background.',
      remediation: 'Increase the color contrast ratio to satisfy the WCAG AA minimum limit of 4.5:1 (3:1 for large headers) by picking darker text or lighter backgrounds.'
    },
    'focus-indicator': {
      title: 'Hidden outline on active control element',
      subcategory: 'Interactions',
      whyItMatters: 'Keyboard-only and screen reader users cannot locate where their focus is positioned if active outlines are deactivated.',
      remediation: 'Ensure focused states are distinct. Avoid applying "outline: none" rules in style configs without adding custom focus themes.'
    },
    'http-page': {
      title: 'Insecure page connection (HTTP)',
      subcategory: 'Connection Safety',
      whyItMatters: 'Unencrypted HTTP connections let local interceptors inspect, trace, or manipulate data shared with the site.',
      remediation: 'Install and configure SSL certificates to force traffic through HTTPS links.'
    },
    'mixed-content': {
      title: 'HTTPS page loads insecure resource (Mixed Content)',
      subcategory: 'Connection Safety',
      whyItMatters: 'Loading unencrypted resources (like HTTP images or scripts) inside an HTTPS page breaks security guarantees and exposes page segments.',
      remediation: 'Ensure all stylesheet links, script calls, and asset resources resolve over secure HTTPS URLs.'
    },
    'known-tracker': {
      title: 'Third-party tracker detected',
      subcategory: 'Tracking & Privacy',
      whyItMatters: 'Tracking beacons gather profiling records to track browsing histories across different websites without consent.',
      remediation: 'Minimize external integrations or configure local cookie blocker boundaries to limit third-party trackers.'
    },
    'overlay-dark-pattern': {
      title: 'Suspicious cookie consent / subscribe overlay blocker',
      subcategory: 'UX Obstruction',
      whyItMatters: 'Banners and overlays block visual access to content, using high-pressure wording to force tracking opt-ins.',
      remediation: 'Adopt accessible, lightweight consent prompts that do not cover page sections or block focus selections.'
    },
    'small-body-text': {
      title: 'Body paragraph text is too small',
      subcategory: 'Typography',
      whyItMatters: 'Font sizes smaller than 12px cause significant eyestrain and are unreadable for users with low vision.',
      remediation: 'Increase the font-size of paragraphs and body sections to at least 14px or 16px.'
    },
    'bad-line-height': {
      title: 'Dense paragraphs line height',
      subcategory: 'Typography',
      whyItMatters: 'Line heights below 1.2 stack text lines too closely, reducing readability for users with cognitive or visual impairments.',
      remediation: 'Set the CSS line-height style parameter to at least 1.5 for body and content paragraphs.'
    },
    'sticky-overlay': {
      title: 'Floating overlays cover excessive layout space',
      subcategory: 'Layout Density',
      whyItMatters: 'Large fixed headers or floating overlays reduce the active viewport area, blocking views on small screen sizes.',
      remediation: 'Limit the heights of fixed elements, or design layouts that hide overlay sections on scroll.'
    },
    'dense-content': {
      title: 'Extremely dense paragraph groups missing spacing headers',
      subcategory: 'Layout Density',
      whyItMatters: 'Large walls of text without headings or paragraphs segmentations make layouts hard to scan and digest.',
      remediation: 'Divide long articles into digestible parts separated by headings.'
    }
  };

  public static normalize(raw: RawIssue): AuditIssue {
    const details = IssueNormalizer.issueDetails[raw.ruleId] || {
      title: raw.ruleId.replace(/-/g, ' '),
      subcategory: 'General',
      whyItMatters: raw.message,
      remediation: 'Verify this element conforms to standard accessibility and layout rules.'
    };

    const category = raw.engine === 'readability' ? 'ux' : raw.engine;
    const policy = SCORING_POLICIES[category as 'accessibility' | 'privacy' | 'ux'];
    const scoreImpact = policy ? policy.deductionWeights[raw.ruleId] || 5 : 5;

    return {
      id: raw.id,
      ruleId: raw.ruleId,
      category: category as 'accessibility' | 'privacy' | 'ux' | 'readability',
      subcategory: details.subcategory,
      severity: raw.severity,
      title: details.title,
      description: raw.message,
      whyItMatters: details.whyItMatters,
      remediation: details.remediation,
      locator: raw.locator,
      scoreImpact,
      evidence: raw.evidence
    };
  }
}
