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
   * Compiles audit session details into a high-contrast executive PDF HTML document with print auto-trigger.
   */
  public static compilePDF(session: AuditSession, _comparison?: ComparisonReport): string {
    try {
      const dateStr = new Date(session.completedAt).toLocaleString();
      const domain = session.page.domain;
      const url = session.page.url;
      const scores = session.scores;
      const insights = session.insights;

      let statusColor = '#f59e0b';
      let statusText = 'Needs Fix';
      if (scores.overall >= 80) {
        statusColor = '#10b981';
        statusText = 'Optimal';
      } else if (scores.overall < 50) {
        statusColor = '#ef4444';
        statusText = 'Critical';
      }

      let issuesHtml = '';
      if (session.issues.length === 0) {
        issuesHtml = `<div style="padding: 20px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; color: #166534; font-weight: 600; text-align: center; margin-top: 10px;">
          🎉 Outstanding! Zero compliance violations or technical security issues were detected on this page.
        </div>`;
      } else {
        issuesHtml = session.issues
          .map((issue, idx) => {
            const badgeClass =
              issue.severity === 'critical' ? 'badge-critical' : issue.severity === 'warning' ? 'badge-warning' : 'badge-info';
            return `
              <div className="issue-card" style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 10px; padding: 16px; margin-bottom: 14px; page-break-inside: avoid; box-shadow: 0 2px 6px rgba(0,0,0,0.03);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span className="badge ${badgeClass}">${issue.severity.toUpperCase()}</span>
                    <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">${issue.category} &bull; ${issue.subcategory}</span>
                  </div>
                  ${issue.confidence ? `<span style="font-size: 10px; color: #64748b; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-weight: 600;">Confidence: ${issue.confidence}</span>` : ''}
                </div>

                <h4 style="font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 6px;">${idx + 1}. ${issue.title}</h4>
                <p style="font-size: 13px; color: #334155; margin-bottom: 10px; line-height: 1.5;">${issue.description}</p>

                ${issue.whyItMatters ? `
                  <div style="background: #f8fafc; border-left: 4px solid #f59e0b; padding: 10px 12px; border-radius: 0 6px 6px 0; margin-bottom: 8px; font-size: 12px; color: #475569;">
                    <strong style="color: #b45309;">Why it matters:</strong> ${issue.whyItMatters}
                  </div>
                ` : ''}

                ${issue.remediation ? `
                  <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 10px 12px; border-radius: 0 6px 6px 0; margin-bottom: 8px; font-size: 12px; color: #166534;">
                    <strong style="color: #15803d;">Remediation:</strong> ${issue.remediation}
                  </div>
                ` : ''}

                ${issue.locator?.primarySelector ? `
                  <div style="margin-top: 8px;">
                    <span style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 2px;">Element Locator:</span>
                    <code style="font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 11px; background: #0f172a; color: #38bdf8; padding: 6px 10px; border-radius: 6px; display: block; word-break: break-all;">${issue.locator.primarySelector}</code>
                  </div>
                ` : ''}
              </div>
            `;
          })
          .join('');
      }

      return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>WebLens OS Executive Audit Report - ${domain}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Outfit:wght@600;700;800&display=swap');

    @page {
      size: A4 portrait;
      margin: 12mm;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      padding: 24px;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }

    .report-paper {
      max-width: 880px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 36px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
    }

    /* Top Banner Header */
    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 20px;
      border-bottom: 3px solid #7c3aed;
      margin-bottom: 24px;
    }

    .brand-logo {
      font-family: 'Outfit', sans-serif;
      font-size: 26px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
    }

    .brand-tagline {
      font-size: 12px;
      color: #64748b;
      margin-top: 2px;
      font-weight: 500;
    }

    .meta-box {
      text-align: right;
      font-size: 12px;
      color: #475569;
    }

    .meta-domain {
      font-weight: 700;
      color: #0f172a;
      font-size: 14px;
    }

    /* Executive Score Grid */
    .hero-score-box {
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      border: 1px solid #cbd5e1;
      border-radius: 14px;
      padding: 20px;
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
    }

    .overall-dial-container {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .score-badge-circle {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: #ffffff;
      border: 4px solid ${statusColor};
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Outfit', sans-serif;
      font-size: 26px;
      font-weight: 800;
      color: #0f172a;
      box-shadow: 0 4px 12px rgba(0,0,0,0.06);
    }

    .scores-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 10px;
      flex: 1;
    }

    .score-chip {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 10px;
      text-align: center;
    }

    .score-chip-title {
      font-size: 10px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
    }

    .score-chip-val {
      font-family: 'Outfit', sans-serif;
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
      margin-top: 2px;
    }

    .section-heading {
      font-family: 'Outfit', sans-serif;
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
      margin-top: 28px;
      margin-bottom: 14px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e2e8f0;
    }

    /* Badges */
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.4px;
    }

    .badge-critical { background: #fee2e2; color: #991b1b; border: 1px solid #f87171; }
    .badge-warning { background: #fef3c7; color: #92400e; border: 1px solid #fbbf24; }
    .badge-info { background: #e0e7ff; color: #3730a3; border: 1px solid #818cf8; }

    /* Print Controls Bar */
    .print-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      max-width: 880px;
      margin: 0 auto 16px auto;
      padding: 12px 18px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    }

    .btn-pdf {
      background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
      color: #ffffff;
      border: none;
      padding: 10px 22px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(124, 58, 237, 0.35);
      transition: all 0.2s ease;
    }
    .btn-pdf:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(124, 58, 237, 0.45); }

    @media print {
      body { background: #ffffff; color: #000000; padding: 0; }
      .report-paper { border: none; box-shadow: none; padding: 0; max-width: 100%; }
      .print-bar { display: none !important; }
    }
  </style>
</head>
<body>
  <!-- Print Controls Floating Bar -->
  <div className="print-bar">
    <div style="font-size: 13px; font-weight: 600; color: #334155;">
      📄 Executive PDF Audit Report Ready
    </div>
    <button className="btn-pdf" onclick="window.print()">
      🖨️ Save as PDF / Print Document
    </button>
  </div>

  <div className="report-paper">
    {/* Header */}
    <div className="header-bar">
      <div>
        <div className="brand-logo">WebLens OS Audit Report</div>
        <div className="brand-tagline">Automated Privacy, Accessibility, Security & SEO Engineering Spec</div>
      </div>
      <div className="meta-box">
        <div className="meta-domain">${domain}</div>
        <div style="font-size: 11px; color: #64748b; margin-top: 1px;">${url}</div>
        <div>Scanned: ${dateStr}</div>
        ${session.scanProfile ? `<div style="font-size: 10px; color: #7c3aed; font-weight: 700; text-transform: uppercase; margin-top: 2px;">Profile: ${session.scanProfile}</div>` : ''}
      </div>
    </div>

    {/* Executive Score Hero Box */}
    <div className="hero-score-box">
      <div className="overall-dial-container">
        <div className="score-badge-circle">${scores.overall}</div>
        <div>
          <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Overall Health</div>
          <div style="font-family: 'Outfit', sans-serif; font-size: 16px; font-weight: 800; color: ${statusColor}; text-transform: uppercase;">
            ${statusText}
          </div>
        </div>
      </div>

      <div className="scores-grid">
        <div className="score-chip">
          <div className="score-chip-title">ACC</div>
          <div className="score-chip-val" style="color: ${scores.accessibility >= 80 ? '#059669' : '#d97706'};">${scores.accessibility}</div>
        </div>
        <div className="score-chip">
          <div className="score-chip-title">PRIV</div>
          <div className="score-chip-val" style="color: ${scores.privacy >= 80 ? '#059669' : '#d97706'};">${scores.privacy}</div>
        </div>
        <div className="score-chip">
          <div className="score-chip-title">SEC</div>
          <div className="score-chip-val" style="color: ${scores.security >= 80 ? '#059669' : '#d97706'};">${scores.security}</div>
        </div>
        <div className="score-chip">
          <div className="score-chip-title">SEO</div>
          <div className="score-chip-val" style="color: ${scores.seo >= 80 ? '#059669' : '#d97706'};">${scores.seo}</div>
        </div>
        <div className="score-chip">
          <div className="score-chip-title">UX</div>
          <div className="score-chip-val" style="color: ${scores.ux >= 80 ? '#059669' : '#d97706'};">${scores.ux}</div>
        </div>
      </div>
    </div>

    ${insights ? `
      <div className="section-heading">Structural Page Metrics</div>
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px;">
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; text-align: center;">
          <div style="font-size: 18px; font-weight: 800; color: #7c3aed;">${insights.imagesCount.total}</div>
          <div style="font-size: 10px; color: #64748b;">Images (${insights.imagesCount.missingAlt} no alt)</div>
        </div>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; text-align: center;">
          <div style="font-size: 18px; font-weight: 800; color: #0284c7;">${insights.formsCount.total}</div>
          <div style="font-size: 10px; color: #64748b;">Form Elements (${insights.formsCount.unlabeled} unlabeled)</div>
        </div>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; text-align: center;">
          <div style="font-size: 18px; font-weight: 800; color: #d97706;">${insights.trackersSummary.total}</div>
          <div style="font-size: 10px; color: #64748b;">Trackers Identified</div>
        </div>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; text-align: center;">
          <div style="font-size: 18px; font-weight: 800; color: #059669;">${insights.resourceSummary.total}</div>
          <div style="font-size: 10px; color: #64748b;">Resource Requests</div>
        </div>
      </div>
    ` : ''}

    <div className="section-heading">Detailed Findings & Compliance Audit (${session.issues.length})</div>
    ${issuesHtml}

    <div style="margin-top: 32px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 16px;">
      Generated by WebLens OS Browser Extension. Zero audit telemetry is collected or transmitted outside your local environment.
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 400);
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
