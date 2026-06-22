import { AuditSession, ComparisonReport } from '../../shared/types';
import { ExportError } from '../../shared/errors';

function escapeCSVCell(val: string): string {
  if (val === undefined || val === null) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export class ReportEngine {
  /**
   * Compiles audit session details into formatted Markdown code.
   */
  public static compileMarkdown(session: AuditSession, comparison?: ComparisonReport): string {
    try {
      const dateStr = new Date(session.completedAt).toLocaleString();
      let md = `# WebLens OS Audit Report\n\n`;
      md += `**Target Host**: \`${session.page.domain}\`  \n`;
      md += `**Target URL**: [${session.page.url}](${session.page.url})  \n`;
      md += `**Scanned On**: ${dateStr}  \n`;
      if (session.scanProfile) {
        md += `**Scan Profile**: \`${session.scanProfile}\`  \n`;
      }
      md += `**Overall WebLens Score**: **${session.scores.overall}/100**  \n\n`;

      md += `## Score Breakdown\n\n`;
      md += `*   **Accessibility**: ${session.scores.accessibility}/100\n`;
      md += `*   **Privacy & Trust**: ${session.scores.privacy}/100\n`;
      md += `*   **User Experience (UX)**: ${session.scores.ux}/100\n\n`;

      if (session.userNotes) {
        md += `## User Notes\n\n`;
        md += `${session.userNotes}\n\n`;
      }

      if (session.insights) {
        const insights = session.insights;
        md += `## Structural Page Insights\n\n`;
        if (insights.pageLanguage) {
          md += `*   **Page Language**: \`${insights.pageLanguage}\`\n`;
        }
        md += `*   **Main Content Detected**: ${insights.mainContentFound ? 'Yes' : 'No'}\n`;
        md += `*   **iFrames Count**: ${insights.iframeCount}\n`;
        md += `*   **Intrusive Interstitials Detected**: ${insights.interstitialsDetected}\n`;
        
        md += `\n### Document Structure & Layout density\n`;
        md += `*   **Headings**: H1: ${insights.headingsCount.h1}, H2: ${insights.headingsCount.h2}, H3: ${insights.headingsCount.h3}, H4: ${insights.headingsCount.h4}, H5: ${insights.headingsCount.h5}, H6: ${insights.headingsCount.h6}\n`;
        md += `*   **Images**: Total: ${insights.imagesCount.total} (Missing alt attribute: ${insights.imagesCount.missingAlt})\n`;
        md += `*   **Form Controls**: Total: ${insights.formsCount.total} (Unlabeled: ${insights.formsCount.unlabeled}, Placeholder-only: ${insights.formsCount.placeholderOnly})\n`;
        md += `*   **Links**: Total: ${insights.linksCount.total} (Empty: ${insights.linksCount.empty}, Suspicious purpose: ${insights.linksCount.suspiciousPurpose})\n`;
        
        md += `\n### Resources & Network Connections\n`;
        md += `*   **Network Requests**: Total: ${insights.resourceSummary.total} (First-party: ${insights.resourceSummary.firstParty}, Third-party: ${insights.resourceSummary.thirdParty})\n`;
        md += `*   **Trackers Identified**: Total: ${insights.trackersSummary.total} (Analytics: ${insights.trackersSummary.analytics}, Advertising: ${insights.trackersSummary.advertising}, Social: ${insights.trackersSummary.social}, Utility: ${insights.trackersSummary.utility})\n\n`;
      }

      if (comparison) {
        md += `## Comparative Deltas (Relative to Previous Audit)\n\n`;
        md += `Comparing current audit to session from ${new Date(comparison.sessionA.timestamp).toLocaleString()}  \n`;
        if (comparison.matchConfidence) {
          md += `*   **Match Confidence**: \`${comparison.matchConfidence}\`  \n`;
        }
        md += `\n### Score Changes\n`;
        md += `*   **Overall Score**: ${comparison.scoreDeltas.overall.before} -> ${comparison.scoreDeltas.overall.after} (${comparison.scoreDeltas.overall.difference >= 0 ? '+' : ''}${comparison.scoreDeltas.overall.difference})\n`;
        md += `*   **Accessibility**: ${comparison.scoreDeltas.accessibility.before} -> ${comparison.scoreDeltas.accessibility.after} (${comparison.scoreDeltas.accessibility.difference >= 0 ? '+' : ''}${comparison.scoreDeltas.accessibility.difference})\n`;
        md += `*   **Privacy & Trust**: ${comparison.scoreDeltas.privacy.before} -> ${comparison.scoreDeltas.privacy.after} (${comparison.scoreDeltas.privacy.difference >= 0 ? '+' : ''}${comparison.scoreDeltas.privacy.difference})\n`;
        md += `*   **UX**: ${comparison.scoreDeltas.ux.before} -> ${comparison.scoreDeltas.ux.after} (${comparison.scoreDeltas.ux.difference >= 0 ? '+' : ''}${comparison.scoreDeltas.ux.difference})\n\n`;

        if (comparison.insightsDelta) {
          md += `### Structural Deltas\n`;
          md += `*   **Trackers difference**: ${comparison.insightsDelta.trackersDifference >= 0 ? '+' : ''}${comparison.insightsDelta.trackersDifference}\n`;
          md += `*   **Unlabeled form elements difference**: ${comparison.insightsDelta.unlabeledFormsDifference >= 0 ? '+' : ''}${comparison.insightsDelta.unlabeledFormsDifference}\n\n`;
        }

        md += `### Resolved Issues (${comparison.resolvedIssues.length})\n\n`;
        if (comparison.resolvedIssues.length === 0) {
          md += `*No previous issues were marked as resolved in this run.*\n\n`;
        } else {
          comparison.resolvedIssues.forEach((issue) => {
            md += `*   **[${issue.severity.toUpperCase()}] ${issue.title}** (${issue.category})\n`;
          });
          md += `\n`;
        }

        md += `### New Violations & Regressions (${comparison.newIssues.length})\n\n`;
        if (comparison.newIssues.length === 0) {
          md += `*Hurrah! No new regressions or issues were detected.*\n\n`;
        } else {
          comparison.newIssues.forEach((issue) => {
            md += `*   **[${issue.severity.toUpperCase()}] ${issue.title}** (${issue.category}) - ${issue.description}\n`;
          });
          md += `\n`;
        }

        md += `### Persistent Violations (${comparison.persistentIssues.length})\n\n`;
        if (comparison.persistentIssues.length > 0) {
          comparison.persistentIssues.forEach((issue) => {
            md += `*   **[${issue.severity.toUpperCase()}] ${issue.title}** (${issue.category})\n`;
          });
          md += `\n`;
        }
      }

      md += `---\n\n`;
      md += `## Active Violations (${session.issues.length} detected)\n\n`;

      if (session.issues.length === 0) {
        md += `*Hurrah! No issues were identified on this page.*  \n`;
      } else {
        const categories = {
          accessibility: 'Accessibility',
          privacy: 'Privacy & Trust',
          ux: 'UX & Readability',
          readability: 'UX & Readability'
        };

        session.issues.forEach((issue, idx) => {
          const catName = categories[issue.category] || issue.category;
          md += `### ${idx + 1}. [${issue.severity.toUpperCase()}] ${issue.title}\n`;
          md += `*   **Category**: ${catName} (${issue.subcategory})\n`;
          md += `*   **Why it matters**: ${issue.whyItMatters}\n`;
          md += `*   **Remediation**: ${issue.remediation}\n`;
          if (issue.locator?.primarySelector) {
            md += `*   **Element Selector**: \`${issue.locator.primarySelector}\`\n`;
          }
          if (issue.evidence) {
            md += `*   **Evidence Element Code**: \`${issue.evidence}\`\n`;
          }
          md += `\n`;
        });
      }

      md += `---\n\n`;
      md += `*Generated locally by WebLens OS Browser Extension. Zero data is shared outside your device.*  \n`;

      return md;
    } catch (err: any) {
      throw new ExportError(`Failed to compile Markdown report: ${err.message}`);
    }
  }

  /**
   * Serializes audit session details into a structured JSON string.
   */
  public static compileJSON(session: AuditSession): string {
    try {
      return JSON.stringify(session, null, 2);
    } catch (err: any) {
      throw new ExportError(`Failed to compile JSON report: ${err.message}`);
    }
  }

  /**
   * Compiles audit session details into formatted CSV code.
   */
  public static compileCSV(session: AuditSession): string {
    try {
      const headers = ['Rule ID', 'Severity', 'Title', 'Description', 'Selector path'];
      const rows = [headers.map(escapeCSVCell).join(',')];

      session.issues.forEach((issue) => {
        const selector = issue.locator?.primarySelector || '';
        const row = [
          issue.ruleId,
          issue.severity,
          issue.title,
          issue.description,
          selector
        ];
        rows.push(row.map(escapeCSVCell).join(','));
      });

      return rows.join('\r\n');
    } catch (err: any) {
      throw new ExportError(`Failed to compile CSV report: ${err.message}`);
    }
  }
}
