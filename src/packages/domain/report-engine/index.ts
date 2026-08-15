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
   * Compiles audit session details into a formatted, self-contained printable PDF HTML document.
   */
  public static compilePDF(session: AuditSession, _comparison?: ComparisonReport): string {
    try {
      const dateStr = new Date(session.completedAt).toLocaleString();
      const domain = session.page.domain;
      const url = session.page.url;
      const scores = session.scores;

      let issuesHtml = '';
      if (session.issues.length === 0) {
        issuesHtml = `<div className="no-issues">🎉 No audit issues detected! Webpage complies with scanned WebLens standards.</div>`;
      } else {
        issuesHtml = session.issues
          .map((issue, idx) => {
            const badgeClass =
              issue.severity === 'critical' ? 'badge-critical' : issue.severity === 'warning' ? 'badge-warning' : 'badge-info';
            return `
              <div className="issue-card">
                <div className="issue-header">
                  <span className="badge ${badgeClass}">${issue.severity}</span>
                  <span className="issue-cat">${issue.category} &bull; ${issue.subcategory}</span>
                </div>
                <h3 className="issue-title">${idx + 1}. ${issue.title}</h3>
                <p className="issue-desc">${issue.description}</p>
                <div className="issue-meta">
                  <strong>Why it matters:</strong> ${issue.whyItMatters || 'N/A'}<br/>
                  <strong>Remediation:</strong> ${issue.remediation || 'N/A'}
                </div>
                ${issue.locator?.primarySelector ? `<div className="issue-code"><code>${issue.locator.primarySelector}</code></div>` : ''}
              </div>
            `;
          })
          .join('');
      }

      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>WebLens OS PDF Audit Report - ${domain}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Outfit:wght@600;700;800&display=swap');

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, sans-serif;
      background: #0f172a;
      color: #f8fafc;
      padding: 32px;
      line-height: 1.5;
    }

    .report-container {
      max-width: 840px;
      margin: 0 auto;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 16px;
      padding: 32px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
    }

    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 20px;
      border-bottom: 2px solid #8b5cf6;
      margin-bottom: 24px;
    }

    .brand-title {
      font-family: 'Outfit', sans-serif;
      font-size: 24px;
      font-weight: 800;
      color: #ffffff;
    }

    .domain-pill {
      font-size: 13px;
      color: #94a3b8;
      margin-top: 4px;
    }

    .scores-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 10px;
      margin-bottom: 28px;
    }

    .score-card {
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 10px;
      padding: 12px 6px;
      text-align: center;
    }

    .score-card-title {
      font-size: 10px;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
    }

    .score-card-val {
      font-family: 'Outfit', sans-serif;
      font-size: 22px;
      font-weight: 800;
      color: #38bdf8;
      margin-top: 4px;
    }

    .overall-card {
      background: linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(124, 58, 237, 0.1) 100%);
      border-color: #8b5cf6;
    }

    .overall-card .score-card-val {
      color: #c4b5fd;
    }

    .section-title {
      font-family: 'Outfit', sans-serif;
      font-size: 16px;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 14px;
      padding-bottom: 6px;
      border-bottom: 1px solid #334155;
    }

    .issue-card {
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 10px;
      padding: 14px;
      margin-bottom: 12px;
      page-break-inside: avoid;
    }

    .issue-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }

    .badge {
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
    }

    .badge-critical { background: rgba(239, 68, 68, 0.2); color: #fca5a5; border: 1px solid #ef4444; }
    .badge-warning { background: rgba(245, 158, 11, 0.2); color: #fcd34d; border: 1px solid #f59e0b; }
    .badge-info { background: rgba(139, 92, 246, 0.2); color: #c4b5fd; border: 1px solid #8b5cf6; }

    .issue-cat { font-size: 11px; color: #94a3b8; font-weight: 600; }
    .issue-title { font-size: 14px; font-weight: 700; color: #f8fafc; margin-bottom: 4px; }
    .issue-desc { font-size: 12px; color: #cbd5e1; margin-bottom: 8px; }

    .issue-meta {
      font-size: 11px;
      color: #94a3b8;
      background: rgba(255, 255, 255, 0.02);
      border-left: 3px solid #8b5cf6;
      padding: 8px 12px;
      margin-top: 6px;
      border-radius: 4px;
    }

    .issue-code { margin-top: 8px; }
    code {
      font-family: monospace;
      font-size: 10px;
      color: #38bdf8;
      background: #020617;
      padding: 4px 8px;
      border-radius: 4px;
      display: inline-block;
      word-break: break-all;
    }

    .no-print {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-bottom: 20px;
    }

    .btn-print {
      background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
      color: #ffffff;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(139, 92, 246, 0.4);
    }

    @media print {
      body { background: #ffffff; color: #0f172a; padding: 0; }
      .report-container { background: #ffffff; border: none; box-shadow: none; padding: 0; max-width: 100%; }
      .header-bar { border-bottom-color: #7c3aed; }
      .brand-title { color: #0f172a; }
      .domain-pill { color: #475569; }
      .score-card { background: #f8fafc; border-color: #cbd5e1; }
      .score-card-title { color: #475569; }
      .score-card-val { color: #0284c7; }
      .overall-card { background: #f3e8ff; border-color: #7c3aed; }
      .overall-card .score-card-val { color: #6d28d9; }
      .section-title { color: #0f172a; border-bottom-color: #cbd5e1; }
      .issue-card { background: #f8fafc; border-color: #cbd5e1; }
      .issue-title { color: #0f172a; }
      .issue-desc { color: #334155; }
      .issue-meta { background: #f1f5f9; border-left-color: #7c3aed; color: #334155; }
      code { background: #e2e8f0; color: #0369a1; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div className="no-print">
    <button className="btn-print" onclick="window.print()">
      🖨️ Save as PDF / Print
    </button>
  </div>

  <div className="report-container">
    <div className="header-bar">
      <div>
        <div className="brand-title">WebLens OS Audit Report</div>
        <div className="domain-pill">Target Domain: ${domain} | Scanned: ${dateStr}</div>
      </div>
      <div>
        <a href="${url}" target="_blank" style="color: #38bdf8; font-size: 11px; text-decoration: none;">${url}</a>
      </div>
    </div>

    <!-- Score Breakdown Bar -->
    <div className="scores-grid">
      <div className="score-card overall-card">
        <div className="score-card-title">Overall</div>
        <div className="score-card-val">${scores.overall}</div>
      </div>
      <div className="score-card">
        <div className="score-card-title">ACC</div>
        <div className="score-card-val">${scores.accessibility}</div>
      </div>
      <div className="score-card">
        <div className="score-card-title">PRIV</div>
        <div className="score-card-val">${scores.privacy}</div>
      </div>
      <div className="score-card">
        <div className="score-card-title">SEC</div>
        <div className="score-card-val">${scores.security}</div>
      </div>
      <div className="score-card">
        <div className="score-card-title">SEO</div>
        <div className="score-card-val">${scores.seo}</div>
      </div>
      <div className="score-card">
        <div className="score-card-title">UX</div>
        <div className="score-card-val">${scores.ux}</div>
      </div>
    </div>

    <!-- Active Findings -->
    <div className="section-title">Active Violations & Findings (${session.issues.length})</div>
    ${issuesHtml}

    <div style="margin-top: 24px; font-size: 10px; color: #94a3b8; text-align: center; border-top: 1px solid #334155; padding-top: 12px;">
      Generated locally by WebLens OS Browser Extension. Zero user data is transmitted outside your device.
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 300);
    };
  </script>
</body>
</html>`;
    } catch (err: any) {
      throw new ExportError(`Failed to compile PDF report: ${err.message}`);
    }
  }

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
      md += `*   **User Experience (UX)**: ${session.scores.ux}/100\n`;
      md += `*   **Security**: ${session.scores.security}/100\n`;
      md += `*   **SEO**: ${session.scores.seo}/100\n\n`;

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
        
        if (insights.seoMetadata) {
          const seo = insights.seoMetadata;
          md += `### Technical SEO Metadata\n`;
          md += `*   **Title tag**: "${seo.title || 'N/A'}" (${seo.titleLength} characters)\n`;
          md += `*   **Meta Description**: "${seo.description || 'N/A'}" (${seo.descriptionLength} characters)\n`;
          md += `*   **Canonical URL**: \`${seo.canonical || 'N/A'}\`\n`;
          md += `*   **Robots Directives**: \`${seo.robots || 'N/A'}\`\n`;
          md += `*   **Charset encoding**: \`${seo.charset || 'N/A'}\`\n`;
          md += `*   **Viewport Tag present**: ${seo.hasViewport ? 'Yes' : 'No'}\n`;
          md += `*   **Structured schema blocks count**: ${seo.structuredDataCount} tags found (${seo.structuredDataTypes.join(', ') || 'None'})\n\n`;
        }
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
        md += `*   **UX**: ${comparison.scoreDeltas.ux.before} -> ${comparison.scoreDeltas.ux.after} (${comparison.scoreDeltas.ux.difference >= 0 ? '+' : ''}${comparison.scoreDeltas.ux.difference})\n`;
        md += `*   **Security**: ${comparison.scoreDeltas.security.before} -> ${comparison.scoreDeltas.security.after} (${comparison.scoreDeltas.security.difference >= 0 ? '+' : ''}${comparison.scoreDeltas.security.difference})\n`;
        md += `*   **SEO**: ${comparison.scoreDeltas.seo.before} -> ${comparison.scoreDeltas.seo.after} (${comparison.scoreDeltas.seo.difference >= 0 ? '+' : ''}${comparison.scoreDeltas.seo.difference})\n\n`;

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
          readability: 'UX & Readability',
          security: 'Security',
          seo: 'SEO'
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
