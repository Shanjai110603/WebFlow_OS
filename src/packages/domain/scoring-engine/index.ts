import { ScoreBreakdown, ScoreExplanation, DeductionRecord, RawIssue } from '../../shared/types';
import { SCORING_POLICIES } from '../../shared/constants';

export class ScoringEngine {
  public static calculate(
    rawIssues: RawIssue[],
    isInsecure: boolean,
    totalTrackerDomains: number,
    isHTTPMixedContent: boolean
  ): ScoreBreakdown {
    // 1. Calculate Accessibility
    const accessibilityExplanation = ScoringEngine.calculateCategory(
      'accessibility',
      rawIssues.filter(r => r.engine === 'accessibility')
    );

    // 2. Calculate Privacy
    // Privacy is computed using both DOM checks and request metrics
    const privacyIssues = rawIssues.filter(r => r.engine === 'privacy');
    const privacyExplanation = ScoringEngine.calculatePrivacy(
      privacyIssues,
      isInsecure,
      totalTrackerDomains,
      isHTTPMixedContent
    );

    // 3. Calculate UX
    const uxExplanation = ScoringEngine.calculateCategory(
      'ux',
      rawIssues.filter(r => r.engine === 'readability' || r.engine === 'ux')
    );

    // 4. Calculate Security
    const securityExplanation = ScoringEngine.calculateCategory(
      'security',
      rawIssues.filter(r => r.engine === 'security')
    );

    // 5. Calculate SEO
    const seoExplanation = ScoringEngine.calculateCategory(
      'seo',
      rawIssues.filter(r => r.engine === 'seo')
    );

    // 6. Compute Overall Score
    const overall = Math.round(
      (accessibilityExplanation.finalScore +
        privacyExplanation.finalScore +
        uxExplanation.finalScore +
        securityExplanation.finalScore +
        seoExplanation.finalScore) /
        5
    );

    return {
      overall,
      accessibility: accessibilityExplanation.finalScore,
      privacy: privacyExplanation.finalScore,
      ux: uxExplanation.finalScore,
      security: securityExplanation.finalScore,
      seo: seoExplanation.finalScore,
      explanations: {
        accessibility: accessibilityExplanation,
        privacy: privacyExplanation,
        ux: uxExplanation,
        security: securityExplanation,
        seo: seoExplanation
      }
    };
  }

  private static calculateCategory(
    category: 'accessibility' | 'ux' | 'security' | 'seo',
    issues: RawIssue[]
  ): ScoreExplanation {
    const policy = SCORING_POLICIES[category];
    const deductionsMap: Record<string, number> = {};

    // Group issue counts
    for (const issue of issues) {
      deductionsMap[issue.ruleId] = (deductionsMap[issue.ruleId] || 0) + 1;
    }

    const deductions: DeductionRecord[] = [];
    let totalDeducted = 0;

    for (const [ruleId, count] of Object.entries(deductionsMap)) {
      const weight = policy.deductionWeights[ruleId] || 5;
      const pointsDeducted = count * weight;
      totalDeducted += pointsDeducted;

      deductions.push({
        ruleId,
        count,
        pointsPerDeduction: weight,
        totalDeducted: pointsDeducted
      });
    }

    // Apply the floor cap limit
    const finalScore = Math.max(
      policy.startingScore - Math.min(totalDeducted, policy.maxDeductionCap),
      0
    );

    return {
      category,
      startingScore: policy.startingScore,
      deductions,
      finalScore
    };
  }

  private static calculatePrivacy(
    issues: RawIssue[],
    isInsecure: boolean,
    totalTrackerDomains: number,
    isHTTPMixedContent: boolean
  ): ScoreExplanation {
    const policy = SCORING_POLICIES.privacy;
    const deductions: DeductionRecord[] = [];
    let totalDeducted = 0;

    // A. HTTP Page check
    if (isInsecure) {
      const weight = policy.deductionWeights['http-page'] || 30;
      totalDeducted += weight;
      deductions.push({
        ruleId: 'http-page',
        count: 1,
        pointsPerDeduction: weight,
        totalDeducted: weight
      });
    }

    // B. Mixed Content check
    if (isHTTPMixedContent) {
      const weight = policy.deductionWeights['mixed-content'] || 10;
      totalDeducted += weight;
      deductions.push({
        ruleId: 'mixed-content',
        count: 1,
        pointsPerDeduction: weight,
        totalDeducted: weight
      });
    }

    // C. Known Trackers check
    if (totalTrackerDomains > 0) {
      const weight = policy.deductionWeights['known-tracker'] || 5;
      const totalDeductionVal = totalTrackerDomains * weight;
      totalDeducted += totalDeductionVal;
      deductions.push({
        ruleId: 'known-tracker',
        count: totalTrackerDomains,
        pointsPerDeduction: weight,
        totalDeducted: totalDeductionVal
      });
    }

    // D. Dark pattern overlays
    const darkPatternCount = issues.filter(i => i.ruleId === 'overlay-dark-pattern').length;
    if (darkPatternCount > 0) {
      const weight = policy.deductionWeights['overlay-dark-pattern'] || 15;
      const totalDeductionVal = darkPatternCount * weight;
      totalDeducted += totalDeductionVal;
      deductions.push({
        ruleId: 'overlay-dark-pattern',
        count: darkPatternCount,
        pointsPerDeduction: weight,
        totalDeducted: totalDeductionVal
      });
    }

    // Apply the floor cap limit
    const finalScore = Math.max(
      policy.startingScore - Math.min(totalDeducted, policy.maxDeductionCap),
      0
    );

    return {
      category: 'privacy',
      startingScore: policy.startingScore,
      deductions,
      finalScore
    };
  }
}
