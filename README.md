# WebLens OS

WebLens OS is a production-ready, local-first, privacy-respecting browser extension designed to help users understand, clean up, and audit websites. It runs entirely on-device, demanding zero external API configurations and incurring zero operating costs for the maintainer.

## 👁️ Features Snapshot

*   **Visitor Mode**: Real-time visual fixer adjustments. Apply dark theme overrides, adjust typography font size, line height, letter spacing, select OpenDyslexic typography, and toggle dynamic sticky banner hiding.
*   **Audit Mode**: Deterministic accessibility, privacy, and UX rules scans.
    *   *Accessibility*: Validates color contrast limits (WCAG AA compliant), missing alt attributes, labels, button tags text, heading sequences, and active focus outline deactivations.
    *   *Privacy*: Sniffs third-party resources logs from content pages programmatically, checks secure origin HTTPS connections, and identifies cookie consent dark patterns.
    *   *UX & Readability*: Analyzes font sizes, line heights, fixed overlay areas, and text density blocks.
*   **Local History & Comparison**: Saves audit sessions locally (FIFO limits capped at 50, pinned elements protected) and delta-compares score reports.
*   **Offline Data Compilation**: Compiles and exports reports to Markdown or JSON formats locally.

---

## 🏗️ Architecture Layers

WebLens OS follows a domain-driven design structure:

```
[UI Layer (Popup / Side Panel React)]
               │
               ▼
   [Domain Layer (Scanners / Fixer / scoring-engine)]
               │
               ▼
[Platform Layer (chrome-messaging / chrome-storage)]
               │
               ▼
[Shared Layer (types / schemas / utils / errors)]
```

*   **Least-Privilege Injections**: We do not inject content scripts globally. When the user interacts, the Background Worker programmatically injects the content script. This ensures a clean installation warnings-free profile.
*   **Heuristics Page Fixer**: Instead of blunt CSS deactivations, fixed clutter is evaluated using the `StickyCandidate` algorithm to prevent page layout breakages.

---

## 🛠️ Local Setup & Build

### Requirements
*   Node.js v20+
*   npm v10+

### Steps
1.  **Clone the Repository** and navigate to the project directory:
    ```bash
    cd "c:\Users\shanj\OneDrive\Desktop\WebLens Os"
    ```
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Compile the extension**:
    ```bash
    npm run build
    ```
    This script programmatically runs three builds (UI bundles, background ES modules, content scripts IIFEs) and copies the Manifest V3 settings, placing all assets into `dist/`.

---

## 🔌 Load in Chrome

1.  Open Google Chrome and navigate to `chrome://extensions`.
2.  Toggle **Developer mode** in the top right corner.
3.  Click **Load unpacked** in the top left corner.
4.  Select the `dist/` directory generated inside the workspace.

---

## 🧪 Testing

WebLens OS has a comprehensive verification pipeline:

```bash
# Run unit testing suite (Vitest)
npm run test
```
The test suite validates color contrast limits, tracker sniffers, scoring weights, history delta calculations, and Zod schemas.
