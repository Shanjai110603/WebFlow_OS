import { AuditSession } from '../../shared/types';
import { ExportError } from '../../shared/errors';

export class ReportEngine {
  /**
   * Compiles audit session details into formatted Markdown code.
   */
  public static compileMarkdown(session: AuditSession): string {
    try {
      const dateStr = new Date(session.completedAt).toLocaleString();
      let md = `# WebLens OS Audit Report\n\n`;
      md += `**Target Host**: \`${session.page.domain}\`  \n`;
      md += `**Target URL**: [${session.page.url}](${session.page.url})  \n`;
      md += `**Scanned On**: ${dateStr}  \n`;
      md += `**Overall WebLens Score**: **${session.scores.overall}/100**  \n\n`;

      md += `## Score Breakdown\n\n`;
      md += `*   **Accessibility**: ${session.scores.accessibility}/100\n`;
      md += `*   **Privacy & Trust**: ${session.scores.privacy}/100\n`;
      md += `*   **User Experience (UX)**: ${session.scores.ux}/100\n\n`;

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
}
