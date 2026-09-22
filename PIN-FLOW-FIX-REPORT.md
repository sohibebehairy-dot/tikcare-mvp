# TikCare V2 — PIN Flow Fix Report

## 1. Root Cause
The `ERR_BLOCKED_BY_CLIENT` error during PIN submission was caused by the content script attempting to directly navigate the TikTok webpage to an internal extension URL using `window.open(chrome.runtime.getURL('dashboard.html'), '_blank')`.

Because `dashboard.html` was explicitly (and correctly) removed from `web_accessible_resources` in `manifest.json` (to prevent unauthorized external access to the dashboard), Chrome actively blocks the unprivileged TikTok webpage context from loading the restricted extension resource.

## 2. Files Changed
- `src/content/index.ts`
- `src/background/index.ts`

## 3. The Fix
To maintain strict security without exposing the dashboard as a web-accessible resource, I decoupled the navigation:
- **Content Script (`src/content/index.ts`)**: Replaced `window.open()` with `chrome.runtime.sendMessage({ action: 'OPEN_DASHBOARD' })`. The content script now simply signals the extension background context to handle the navigation.
- **Service Worker (`src/background/index.ts`)**: Added an `onMessage` listener that intercepts `OPEN_DASHBOARD` and securely opens the setup page using `chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') })`.

Since `chrome.tabs.create` runs within the privileged extension context, it can freely open extension pages without triggering the client block, while completely keeping the dashboard invisible and inaccessible to ordinary webpage scripts on TikTok.

## 4. Tests and Build
- **Build Status**: The automated build via `npm run build` could not be executed in the current environment due to system permission constraints.
- **Static Verification**: The applied changes are syntactically valid TypeScript. The `chrome.tabs.create` message-passing pattern is the standard, architecturally secure solution for this specific `ERR_BLOCKED_BY_CLIENT` issue in Manifest V3.

## 5. Regression Check & Unverified Behavior
Because these changes were evaluated using static analysis, the following core features are logically sound but formally marked **UNVERIFIED** in a live browser context:
1. Verify PIN creation succeeds without throwing `ERR_BLOCKED_BY_CLIENT`.
2. Verify parent setup/dashboard opens smoothly in a new tab.
3. Verify the Lock overlay remains active on TikTok while the dashboard is open.
4. Verify that TikTok route protection (FYP, Explore, Search, LIVE, unapproved creators) still functions properly when Child Mode is resumed.
5. Confirm extension pages are inherently exempt from the content script route parser (since the script only injects into `*://*.tiktok.com/*` and `*://tiktok.com/*`).
