import { AuditRule, RawIssue, AuditIssue, ScanContext } from '../../shared/types';
import { SCORING_POLICIES } from '../../shared/constants';

// Rule Imports
import {
  MissingAltTextRule,
  MissingFormLabelRule,
  EmptyButtonRule,
  HeadingOrderRule,
  ContrastRule,
  FocusIndicatorRule,
  MissingDocLangRule,
  MissingPageTitleRule,
  DuplicateInteractiveLabelsRule,
  MissingLandmarksRule,
  AriaHiddenMisuseRule,
  ImagesUsedAsButtonsRule,
  MissingSkipLinkRule,
  PlaceholderOnlyLabelingRule,
  IframeTitleMissingRule,
  BrokenTableSemanticsRule,
  InvalidHeadingDensityRule,
  TouchTargetSizeRule,
  InaccessibleModalsRule
} from '../accessibility-engine';

import {
  HttpPageRule,
  MixedContentRule,
  KnownTrackerRule,
  OverlayDarkPatternRule,
  InsecureFormsHttpRule,
  UnsafeTargetBlankRule,
  SuspiciousConsentButtonsRule,
  FingerprintingHeuristicsRule
} from '../privacy-engine';

import {
  SmallBodyTextRule,
  BadLineHeightRule,
  StickyOverlayRule,
  DenseContentRule,
  ExcessiveLineLengthRule,
  CrampedTapTargetsRule,
  ClutterScoreRule,
  IntrusiveInterstitialRule
} from '../readability-engine';

export class RuleRegistry {
  private rules: Map<string, AuditRule> = new Map();

  public register(rule: AuditRule): void {
    if (this.rules.has(rule.id)) {
      throw new Error(`Rule already registered: ${rule.id}`);
    }
    this.rules.set(rule.id, rule);
  }

  public async runAll(context: ScanContext, scanProfile?: string): Promise<RawIssue[]> {
    const activeRules = Array.from(this.rules.values()).filter(rule => {
      if (!scanProfile || scanProfile === 'full' || scanProfile === 'developer') return true;
      if (scanProfile === 'accessibility') return rule.category === 'accessibility';
      if (scanProfile === 'privacy') return rule.category === 'privacy';
      if (scanProfile === 'ux') return rule.category === 'readability' || rule.category === 'ux';
      if (scanProfile === 'quick' || scanProfile === 'summary') {
        const quickRules = ['missing-alt-text', 'missing-form-label', 'http-page', 'mixed-content', 'known-tracker', 'small-body-text'];
        return quickRules.includes(rule.id);
      }
      return true;
    });

    const promises = activeRules.map(async (rule) => {
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
  registry.register(MissingDocLangRule);
  registry.register(MissingPageTitleRule);
  registry.register(DuplicateInteractiveLabelsRule);
  registry.register(MissingLandmarksRule);
  registry.register(AriaHiddenMisuseRule);
  registry.register(ImagesUsedAsButtonsRule);
  registry.register(MissingSkipLinkRule);
  registry.register(PlaceholderOnlyLabelingRule);
  registry.register(IframeTitleMissingRule);
  registry.register(BrokenTableSemanticsRule);
  registry.register(InvalidHeadingDensityRule);
  registry.register(TouchTargetSizeRule);
  registry.register(InaccessibleModalsRule);

  // 2. Privacy
  registry.register(HttpPageRule);
  registry.register(MixedContentRule);
  registry.register(KnownTrackerRule);
  registry.register(OverlayDarkPatternRule);
  registry.register(InsecureFormsHttpRule);
  registry.register(UnsafeTargetBlankRule);
  registry.register(SuspiciousConsentButtonsRule);
  registry.register(FingerprintingHeuristicsRule);

  // 3. Readability & UX
  registry.register(SmallBodyTextRule);
  registry.register(BadLineHeightRule);
  registry.register(StickyOverlayRule);
  registry.register(DenseContentRule);
  registry.register(ExcessiveLineLengthRule);
  registry.register(CrampedTapTargetsRule);
  registry.register(ClutterScoreRule);
  registry.register(IntrusiveInterstitialRule);

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
      title: 'Extremely dense paragraph groups missing spacing headings',
      subcategory: 'Layout Density',
      whyItMatters: 'Large walls of text without headings or paragraphs segmentations make layouts hard to scan and digest.',
      remediation: 'Divide long articles into digestible parts separated by headings.'
    },
    // New Accessibility Rules
    'missing-doc-lang': {
      title: 'Document language attribute is missing',
      subcategory: 'Structure',
      whyItMatters: 'Screen readers use the HTML lang attribute to select the correct dictionary and pronunciation. Without it, speech output can be unreadable.',
      remediation: 'Add a lang attribute to the <html> tag, e.g. <html lang="en">.'
    },
    'missing-page-title': {
      title: 'Page title is missing or empty',
      subcategory: 'Structure',
      whyItMatters: 'The page title is the first element read by screen readers. It allows users to quickly identify the purpose of the loaded page.',
      remediation: 'Insert a descriptive <title> tag inside the document <head>.'
    },
    'duplicate-interactive-labels': {
      title: 'Duplicate interactive labels with different targets',
      subcategory: 'Interactions',
      whyItMatters: 'Repeated links or buttons with identical text (like multiple "Learn More" links) that go to different URLs create cognitive confusion for screen readers.',
      remediation: 'Provide unique text descriptions or use aria-label to add contextual differentiation.'
    },
    'missing-landmarks': {
      title: 'Missing HTML5 landmark regions',
      subcategory: 'Structure',
      whyItMatters: 'Landmark elements (<main>, <nav>, <header>, <footer>) help screen reader users jump directly to major page sections.',
      remediation: 'Wrap page contents in semantic landmark tags instead of plain generic divs.'
    },
    'aria-hidden-misuse': {
      title: 'Focusable element inside aria-hidden subtree',
      subcategory: 'Structure',
      whyItMatters: 'Interactive links or buttons wrapped in an aria-hidden="true" block are keyboard-focusable but remain hidden to screen readers, causing dead tabs.',
      remediation: 'Remove aria-hidden="true" from containers holding interactive nodes, or mark focusable nodes with tabindex="-1".'
    },
    'images-used-as-buttons': {
      title: 'Image used as button without label',
      subcategory: 'Interactions',
      whyItMatters: 'If an image serves as the sole content of a button, it must have an alt text or aria-label so screen readers can name the button\'s action.',
      remediation: 'Define an alt attribute on the image, or add an aria-label to the button container.'
    },
    'missing-skip-link': {
      title: 'Skip-to-content bypass link is missing',
      subcategory: 'Interactions',
      whyItMatters: 'Keyboard-only users must tab through header navigation menus on every page load if a skip link is not present.',
      remediation: 'Provide a visible or keyboard-revealed "Skip to Content" skip-link at the very beginning of the page.'
    },
    'placeholder-only-labeling': {
      title: 'Form input uses placeholder text as label',
      subcategory: 'Forms & Controls',
      whyItMatters: 'Placeholder text disappears when users type, leaving those with short-term memory challenges without a reference. It also has low default contrast.',
      remediation: 'Use a proper companion <label> element or define an explicit aria-label.'
    },
    'iframe-title-missing': {
      title: 'Missing title on iframe element',
      subcategory: 'Structure',
      whyItMatters: 'Screen readers need iframe titles to explain what third-party widgets or embedded video embeds are presenting.',
      remediation: 'Add a descriptive title attribute to the iframe element, e.g. title="YouTube video player".'
    },
    'broken-table-semantics': {
      title: 'Broken table layout structure',
      subcategory: 'Structure',
      whyItMatters: 'Data tables lacking proper column/row headers (<th>) cannot be navigated cell-by-cell dynamically by screen readers.',
      remediation: 'Format headers using <th> elements and assign scope="col" or scope="row" attributes.'
    },
    'invalid-heading-density': {
      title: 'Excessive or duplicate H1 headers',
      subcategory: 'Structure',
      whyItMatters: 'Using more than three H1 headers dilutes the primary visual focus and structure of the document.',
      remediation: 'Maintain a single primary H1 heading for the page title, using H2 and H3 for subtopics.'
    },
    'touch-target-size': {
      title: 'Interactive control too small for mobile touch',
      subcategory: 'Interactions',
      whyItMatters: 'Touch targets smaller than 24px are extremely difficult for mobile visitors to click accurately, triggering accidental taps.',
      remediation: 'Increase padding or size of buttons and link blocks to meet the minimum size requirement.'
    },
    'inaccessible-modals': {
      title: 'Dialog modal lacks accessibility controls',
      subcategory: 'Interactions',
      whyItMatters: 'Overlay dialog panels must capture keyboard focus so that users cannot accidentally tab to hidden background elements.',
      remediation: 'Assign role="dialog" and aria-modal="true" parameters, and trap keyboard tab actions within the modal scope.'
    },
    // New Privacy Rules
    'insecure-forms-http': {
      title: 'Insecure input fields on non-HTTPS page',
      subcategory: 'Connection Safety',
      whyItMatters: 'Entering credentials or personal information on forms loaded over plain HTTP connections exposes data to packet sniffers.',
      remediation: 'Ensure the page is served entirely over secure HTTPS before collecting user input.'
    },
    'unsafe-target-blank': {
      title: 'Link opens target blank without rel safety attributes',
      subcategory: 'Connection Safety',
      whyItMatters: 'Using target="_blank" without rel="noopener" allows the newly opened tab to access window.opener, introducing tabnabbing risks.',
      remediation: 'Add rel="noopener" or rel="noreferrer" attributes to all external anchor links.'
    },
    'suspicious-consent-buttons': {
      title: 'Cookie banner lacks equivalent reject button',
      subcategory: 'Tracking & Privacy',
      whyItMatters: 'Banners that make "Reject All" hidden or visually faint manipulate users into accepting cookies (dark patterns).',
      remediation: 'Provide visually equivalent options for "Accept All" and "Reject All" choices at the same hierarchical tier.'
    },
    'fingerprinting-heuristics': {
      title: 'Active browser fingerprinting trackers detected',
      subcategory: 'Tracking & Privacy',
      whyItMatters: 'Beacons that dynamically query system canvas context, system font availability, or audio layers build unique device profiles to track users.',
      remediation: 'Remove script calls to known fingerprinting networks.'
    },
    // New UX Rules
    'excessive-line-length': {
      title: 'Paragraph character line length is too long',
      subcategory: 'Typography',
      whyItMatters: 'Paragraphs wider than 80 characters require significant head movement to read, making scanning difficult.',
      remediation: 'Apply CSS max-width rules (e.g. max-width: 65ch) to main content containers.'
    },
    'cramped-tap-targets': {
      title: 'Cramped or tightly clustered links',
      subcategory: 'Interactions',
      whyItMatters: 'Interactive links placed too closely together cause target-clicking mistakes.',
      remediation: 'Add extra spacing or padding to interactive elements.'
    },
    'clutter-score': {
      title: 'High visual layout clutter and density',
      subcategory: 'Layout Density',
      whyItMatters: 'Pages containing high densities of ad boxes, banner scripts, and popups cause significant cognitive fatigue.',
      remediation: 'Clean up layout blocks and remove non-content advertising elements.'
    },
    'intrusive-interstitial': {
      title: 'Intrusive overlay blocking page access',
      subcategory: 'UX Obstruction',
      whyItMatters: 'Large popup frames blocking content immediately upon page load frustrate visitors and obstruct user goals.',
      remediation: 'Avoid showing interstitial prompts until a user has scrolled or spent time on content.'
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
      evidence: raw.evidence,
      confidence: raw.confidence || 'confirmed',
      suggestedFix: raw.suggestedFix || details.remediation,
      quickFixPreviewSelector: raw.quickFixPreviewSelector
    };
  }
}
