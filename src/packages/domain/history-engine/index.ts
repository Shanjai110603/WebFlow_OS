import { AuditSession, ComparisonReport, AuditIssue, IssueMatchResult, ScoreDelta } from '../../shared/types';
import { calculateTextSimilarity } from '../../shared/utils';

export class HistoryEngine {
  /**
   * Compares two saved audit sessions for the same domain and calculates differences.
   */
  public static compare(sessionA: AuditSession, sessionB: AuditSession): ComparisonReport {
    if (sessionA.page.domain.toLowerCase() !== sessionB.page.domain.toLowerCase()) {
      throw new Error('WebLens comparison requires audits from the same host domain.');
    }

    const scoreDeltas = {
      overall: HistoryEngine.calculateDelta(sessionA.scores.overall, sessionB.scores.overall),
      accessibility: HistoryEngine.calculateDelta(sessionA.scores.accessibility, sessionB.scores.accessibility),
      privacy: HistoryEngine.calculateDelta(sessionA.scores.privacy, sessionB.scores.privacy),
      ux: HistoryEngine.calculateDelta(sessionA.scores.ux, sessionB.scores.ux)
    };

    const resolvedIssues: AuditIssue[] = [];
    const newIssues: AuditIssue[] = [];
    const persistentIssues: AuditIssue[] = [];

    // Analyze issues in A relative to B
    const matchedInB = new Set<string>();

    for (const issueA of sessionA.issues) {
      let foundMatch = false;

      for (const issueB of sessionB.issues) {
        if (matchedInB.has(issueB.id)) continue;

        const matchResult = HistoryEngine.match(issueA, issueB);
        if (matchResult.matched && matchResult.confidence >= 0.7) {
          persistentIssues.push(issueB);
          matchedInB.add(issueB.id);
          foundMatch = true;
          break;
        }
      }

      if (!foundMatch) {
        resolvedIssues.push(issueA);
      }
    }

    // Any issue in B that was NOT matched to A is new
    for (const issueB of sessionB.issues) {
      if (!matchedInB.has(issueB.id)) {
        newIssues.push(issueB);
      }
    }

    return {
      domain: sessionA.page.domain,
      sessionA: { id: sessionA.id, timestamp: sessionA.completedAt },
      sessionB: { id: sessionB.id, timestamp: sessionB.completedAt },
      scoreDeltas,
      resolvedIssues,
      newIssues,
      persistentIssues
    };
  }

  private static calculateDelta(before: number, after: number): ScoreDelta {
    return {
      before,
      after,
      difference: after - before
    };
  }

  /**
   * Evaluates if two issues refer to the same DOM node/violation based on multiple paths.
   */
  public static match(issueA: AuditIssue, issueB: AuditIssue): IssueMatchResult {
    if (issueA.category !== issueB.category || issueA.subcategory !== issueB.subcategory) {
      return { matched: false, confidence: 0, reason: 'none' };
    }

    const locA = issueA.locator;
    const locB = issueB.locator;

    if (!locA || !locB) {
      return { matched: false, confidence: 0, reason: 'none' };
    }

    // 1. Exact CSS Selector match
    if (locA.primarySelector && locB.primarySelector && locA.primarySelector === locB.primarySelector) {
      return { matched: true, confidence: 1.0, reason: 'selector' };
    }

    // 2. Exact XPath match
    if (locA.xpath && locB.xpath && locA.xpath === locB.xpath) {
      return { matched: true, confidence: 0.9, reason: 'xpath' };
    }

    // 3. Structural Path similarity
    if (locA.domPath && locB.domPath) {
      const similarity = HistoryEngine.calculatePathSimilarity(locA.domPath, locB.domPath);
      if (similarity >= 0.8) {
        return { matched: true, confidence: 0.75, reason: 'dompath' };
      }
    }

    // 4. Tag & Text similarity check
    if (locA.tagName === locB.tagName && locA.textSnippet && locB.textSnippet) {
      const similarity = calculateTextSimilarity(locA.textSnippet, locB.textSnippet);
      if (similarity >= 0.7) {
        return { matched: true, confidence: 0.70, reason: 'text-similarity' };
      }
    }

    return { matched: false, confidence: 0, reason: 'none' };
  }

  private static calculatePathSimilarity(pathA: string[], pathB: string[]): number {
    const minLength = Math.min(pathA.length, pathB.length);
    if (minLength === 0) return 0;
    
    let matches = 0;
    for (let i = 0; i < minLength; i++) {
      if (pathA[i] === pathB[i]) matches++;
    }
    return matches / Math.max(pathA.length, pathB.length);
  }
}
