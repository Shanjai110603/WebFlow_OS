# WebLens OS — Security Hardening Specification

This document details the security model, threat boundaries, validation gates, and privacy guarantees implemented in WebLens OS.

---

## 🔒 Security Guarantees & Non-Goals

WebLens OS is designed to be **safe-by-design** and run 100% locally.

1.  **Zero CDNs / Remote Scripts**: All logic is bundled locally at compile time. No external CDNs or dynamic scripts can be loaded.
2.  **No Dynamic Code Execution**: The extension blocks `eval`, `new Function`, and `unsafe-eval` CSP parameters.
3.  **No Telemetry / Exfiltration**: Genuinely zero tracking. No data is collected, logged, or exfiltrated. WebLens does not contain any analytic tracking tools.
4.  **Least-Privilege Permissions**: WebLens requests permissions (`activeTab`, `storage`, `sidePanel`, `scripting`) dynamically to avoid warning prompts on installation.

---

## ⚡ Threat Model Analysis

### 1. Trust Boundaries
```
[ Browser Internal APIs (Safe) ]
             ▲
             │ Trust Boundary
             ▼
[ Active Tab DOM (Untrusted Content) ] ──► [ Scraper parser ] ──► [ Background Zod Validation ] ──► [ Side Panel React UI ]
```

*   **Browser Internals**: Trusted context.
*   **Active Tab DOM**: Untrusted context. Webpage DOM content is treated as insecure. Any string extracted from target pages is validated before output.

### 2. Attack Surfaces & Mitigations

#### Cross-Site Scripting (XSS) in UI Dashboard Panels
*   **Threat**: Malicious target pages containing scripting attacks inside elements (e.g. `<div alt="<script>alert(1)</script>">`) could trigger scripting injections in the Side Panel UI.
*   **Mitigation**: The Side Panel is written in React, using standard JSX text nodes to output values. We avoid `dangerouslySetInnerHTML` in UI components. Dynamic attribute strings are parsed via `node.textContent` instead of markup properties.

#### Dynamic DOM Overlay Injections
*   **Threat**: Highlight frames injected into the target page could style-clash or trigger layout modifications.
*   **Mitigation**: Highlight frames are drawn within isolated DOM elements using explicit styling priorities (`!important`) to prevent style leaks.

#### Persistence Storage Tampering
*   **Threat**: Malformed settings payloads or corrupted JSON data in storage could trigger extension failures or crashes.
*   **Mitigation**: All data read from `chrome.storage.local` is validated at runtime using Zod validation schemas. Corrupted entries are deleted and reset to standard defaults automatically.

---

## 🛡️ Vulnerability Disclosures
Please do not report security issues in public GitHub tickets. Email disclosures to the maintainers or follow standard secure disclosure routes.
