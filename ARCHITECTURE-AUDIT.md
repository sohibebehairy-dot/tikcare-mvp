# TikCare V2 — Architecture Audit

**Auditor**: Independent principal engineer (fresh eyes, treating all prior AI code as untrusted)  
**Date**: 2026-09-22  
**Scope**: All source files in `src/`, compiled `dist/`, architecture docs, and the compiled manifest.

---

## Executive Summary

The codebase has a solid **storage abstraction**, a **reasonable auth flow** (PBKDF2 hashing), and a **well-structured parent dashboard**. However, the claim that "parent-defined policy controls the TikTok Web environment" is **not currently supported** by the implementation. The most critical gaps are:

1. **No route enforcement exists.** The architecture docs describe a "Route Parser" and "Policy Engine" that block navigation to unapproved URLs — but neither has been implemented.
2. **No SPA navigation interception exists.** The docs describe `pushState`/`replaceState` overrides — none are implemented.
3. **The 403 error** the user encountered is caused by the `DomEnforcer` injecting a `<style>` element into `document.documentElement` before `<head>` exists, at `document_start`.
4. **DOM enforcement is cosmetic only** — it hides UI elements with CSS but provides no enforcement that a child couldn't trivially bypass.

---

## Findings

---

### F-01 · CRITICAL · No Route Enforcement Implemented

| Field | Value |
|---|---|
| **Severity** | CRITICAL |
| **Files** | All of `src/content/`, `src/background/` — the route guard described in SECURITY-MODEL.md and STATE-MACHINE.md does not exist |
| **Problem** | The architecture documents describe a "Policy Engine" and "Route Parser" that evaluate every URL against parent config and block unapproved destinations. **Neither component exists in the codebase.** There is no code anywhere that reads the current URL and decides whether to allow or block it. |
| **Why it matters** | A child can type `tiktok.com/@anyunapprovedcreator` directly into the address bar and land on their page. The DOM enforcer only hides `<a>` tags pointing to unapproved creators — it does nothing about direct URL navigation. This is the single largest gap between the claimed security model and reality. |
| **Reproduction** | 1. Set up TikCare, approve zero creators. 2. Enter child mode. 3. Type `tiktok.com/@charlidamelio` in the address bar. 4. The page loads normally. |
| **Fix** | Implement a route evaluator in the content script that runs on every page load and SPA navigation. If the current URL doesn't match an approved route/creator, show a "Blocked" overlay instead of the page content. |

---

### F-02 · CRITICAL · No SPA Navigation Interception

| Field | Value |
|---|---|
| **Severity** | CRITICAL |
| **Files** | `src/background/index.ts` L17-21, `src/content/index.ts` |
| **Problem** | The background script logs SPA navigations but does nothing with them (`// Future: notify content script to re-evaluate policy`). The content script never intercepts `history.pushState` or `history.replaceState`. TikTok is a React SPA — clicking any link doesn't trigger a page reload, so the content script's `checkState()` only runs once on initial load. |
| **Why it matters** | After initial page load in child mode, clicking any internal TikTok link (even to blocked features like `/explore` or `/live`) will succeed because the content script never re-evaluates. |
| **Reproduction** | 1. Enter child mode. 2. Click any link within TikTok (e.g., navigate from home to Explore). 3. The page changes — no re-evaluation occurs. |
| **Fix** | Override `history.pushState` and `history.replaceState` in the content script. Listen for `popstate`. On any URL change, re-run route evaluation. |

---

### F-03 · CRITICAL · DomEnforcer Constructor Runs Before `<head>` Exists

| Field | Value |
|---|---|
| **Severity** | CRITICAL |
| **Files** | `src/content/dom-enforcer.ts` L10-12, L74-79 |
| **Problem** | The `DomEnforcer` constructor calls `this.injectStyleElement()` which does `(document.head || document.documentElement).appendChild(this.styleElement)`. The content script runs at `document_start`, which means `document.head` is `null`. Appending a `<style>` to `document.documentElement` before `<head>` exists will cause TikTok's page load to fail or the element to be discarded when the real `<head>` is parsed. **This is the likely cause of the user's 403/blank page bug.** |
| **Why it matters** | This directly caused the user's bug: "it works when I close the extension." |
| **Reproduction** | 1. Load extension. 2. Navigate to tiktok.com. 3. Observe 403 or blank page. 4. Disable extension. 5. Page loads. |
| **Fix** | Defer `injectStyleElement()` until `document.head` actually exists (use a `DOMContentLoaded` listener or lazy initialization on first `start()` call). Don't instantiate `DomEnforcer` in the constructor — initialize on `start()`. |

---

### F-04 · HIGH · Dashboard Accessible Without Authentication

| Field | Value |
|---|---|
| **Severity** | HIGH |
| **Files** | `src/popup/index.ts` L16-19, `src/dashboard/dashboard.ts` L159 |
| **Problem** | The popup's "Open Parent Dashboard" button directly opens `dashboard.html` via `chrome.tabs.create()` **without checking if the user is authenticated**. The dashboard itself checks `if (this.state.mode !== 'PARENT_DASHBOARD') { window.close(); return; }` — but this is a race condition. More importantly, **any page can navigate to `chrome-extension://[id]/dashboard.html`** because it's listed in `web_accessible_resources`. |
| **Why it matters** | A child who knows the extension ID can type the dashboard URL directly and potentially access it if the mode happens to be `PARENT_DASHBOARD` (e.g., parent forgot to lock). |
| **Reproduction** | 1. Parent opens dashboard but doesn't lock. 2. Child opens a new tab. 3. Child navigates to `chrome-extension://[extension-id]/dashboard.html`. 4. Dashboard loads with full parent controls. |
| **Fix** | (a) Remove `dashboard.html` from `web_accessible_resources`. (b) Add PIN re-verification in the dashboard's `init()` before rendering. (c) The popup should set mode to `PARENT_DASHBOARD` only after PIN verification succeeds. |

---

### F-05 · HIGH · `web_accessible_resources` Exposes Dashboard to All Origins

| Field | Value |
|---|---|
| **Severity** | HIGH |
| **Files** | `src/manifest.json` L30-34 |
| **Problem** | `"matches": ["<all_urls>"]` makes `dashboard.html`, `dashboard.css`, and `dashboard.js` accessible to any website. This is unnecessary and a security anti-pattern. |
| **Why it matters** | Any web page can iframe or link to the dashboard. Combined with F-04, this expands the attack surface. |
| **Fix** | Remove the `web_accessible_resources` block entirely. The dashboard is opened via `chrome.runtime.getURL()` from extension context — it doesn't need to be web-accessible. |

---

### F-06 · HIGH · Lock Button Sets Mode to `LOCKED` But Should Set `CHILD_MODE`

| Field | Value |
|---|---|
| **Severity** | HIGH |
| **Files** | `src/dashboard/dashboard.ts` L198-205 |
| **Problem** | The "Lock TikCare" button calls `StorageManager.setMode('LOCKED')`. According to STATE-MACHINE.md, the transition from `PARENT_DASHBOARD` should go to `CHILD_MODE`. `LOCKED` means the full lock overlay with PIN prompt appears — meaning after a parent configures everything and hits "Lock", the child sees a PIN prompt instead of the child-friendly interface. |
| **Why it matters** | The child mode UI (approved topics/creators) is never actually reachable. The parent locks → mode goes to `LOCKED` → lock screen appears → child is stuck at PIN prompt. The entire child UI is dead code in the current flow. |
| **Reproduction** | 1. Set up PIN. 2. Open dashboard. 3. Configure interests/creators. 4. Click "Lock TikCare". 5. Go to tiktok.com. 6. See lock screen with PIN prompt, not child mode. |
| **Fix** | "Lock TikCare" should call `StorageManager.setMode('CHILD_MODE')`. Add a separate "Full Lock" option if needed. |

---

### F-07 · HIGH · No MutationObserver to Re-inject Lock Overlay

| Field | Value |
|---|---|
| **Severity** | HIGH |
| **Files** | `src/content/index.ts`, SECURITY-MODEL.md L22 |
| **Problem** | The security model claims: "If the lock overlay is removed from the DOM while the state is LOCKED, it is immediately re-injected." **No such MutationObserver exists.** A child can open DevTools, delete `#tikcare-lock-overlay`, and interact with TikTok freely. |
| **Why it matters** | The security doc makes a promise the code doesn't keep. |
| **Reproduction** | 1. TikTok shows lock screen. 2. Open DevTools (F12). 3. Delete `#tikcare-lock-overlay`. 4. Remove `tikcare-locked` class from `<html>`. 5. TikTok content is visible. |
| **Fix** | Add a MutationObserver watching `document.body` and `document.documentElement`. If `#tikcare-lock-overlay` is removed or `tikcare-locked` class is removed while `mode === 'LOCKED'`, immediately re-inject. |

---

### F-08 · HIGH · `foundation.css` Only Hides Direct Children of `<body>`

| Field | Value |
|---|---|
| **Severity** | HIGH |
| **Files** | `src/styles/foundation.css` L4, L9 |
| **Problem** | The CSS rule `html.tikcare-locked body > *:not(#tikcare-lock-overlay)` only hides direct children of `<body>`. TikTok overlays (cookie banners, login prompts, modals) rendered as portals may appear on top of the lock screen. |
| **Why it matters** | Edge case: TikTok modals could render above or beside the lock screen. |
| **Fix** | Also add `html.tikcare-locked { overflow: hidden !important; }` and ensure the lock overlay captures all pointer events with `pointer-events: all`. |

---

### F-09 · MEDIUM · `UNINITIALIZED` State Not in Type System

| Field | Value |
|---|---|
| **Severity** | MEDIUM |
| **Files** | `src/types/index.ts` L3, `src/storage/index.ts` L7 |
| **Problem** | `Mode` is typed as `'LOCKED' | 'PARENT_DASHBOARD' | 'CHILD_MODE'`. But the default state uses `'UNINITIALIZED' as any`. The STATE-MACHINE.md describes 5 states but only 3 are in the type system. |
| **Why it matters** | TypeScript's type safety is defeated. The `checkState()` function works by accident due to the `!state.setupComplete` guard, but the type lie is fragile. |
| **Fix** | Add `'UNINITIALIZED'` to the `Mode` type. Remove the `as any` cast. |

---

### F-10 · MEDIUM · `saveState()` Does Shallow Merge Only

| Field | Value |
|---|---|
| **Severity** | MEDIUM |
| **Files** | `src/storage/index.ts` L37-41 |
| **Problem** | `saveState` uses `{ ...currentState, ...state }` — a shallow merge. Any caller that passes a partial nested object will silently delete keys. Currently works by accident because all callers pass complete sub-objects. |
| **Why it matters** | Latent bug — any future caller that passes a partial nested object will corrupt state. |
| **Fix** | Use deep merge for known nested objects, or document the invariant. |

---

### F-11 · MEDIUM · No PIN Length/Complexity Validation

| Field | Value |
|---|---|
| **Severity** | MEDIUM |
| **Files** | `src/content/index.ts` L75-78 |
| **Problem** | The PIN creation form has `maxLength: 12` but no `minLength`. A parent can create a 1-character PIN. No confirmation step. |
| **Why it matters** | A trivially short PIN defeats the purpose of the auth gate. |
| **Fix** | Add `minLength: 4`. Add a confirmation step. Show validation errors. |

---

### F-12 · MEDIUM · No Rate Limiting on PIN Attempts

| Field | Value |
|---|---|
| **Severity** | MEDIUM |
| **Files** | `src/content/index.ts` L66-95 |
| **Problem** | Unlimited PIN attempts with no delay, lockout, or backoff. |
| **Why it matters** | Combined with F-11, a short PIN is brute-forceable in seconds. |
| **Fix** | Add exponential backoff after 3 failed attempts. Store attempt count in storage. |

---

### F-13 · MEDIUM · DOM Enforcer Hides Creator Links But Not Their Content

| Field | Value |
|---|---|
| **Severity** | MEDIUM |
| **Files** | `src/content/dom-enforcer.ts` L130-160 |
| **Problem** | The creator allowlist enforcement finds links and hides them, but doesn't block access to the actual content from unapproved creators if navigated to directly. |
| **Why it matters** | DOM enforcement is cosmetic without route enforcement. |
| **Fix** | Subordinate to F-01. Route enforcement is the real fix. |

---

### F-14 · LOW · `activeTab` Permission Is Unnecessary

| Field | Value |
|---|---|
| **Severity** | LOW |
| **Files** | `src/manifest.json` L8 |
| **Problem** | `activeTab` is requested but never used. Redundant with `host_permissions`. |
| **Fix** | Remove `"activeTab"` from permissions. |

---

### F-15 · LOW · `child.css` Fetches Google Fonts on Every TikTok Page Load

| Field | Value |
|---|---|
| **Severity** | LOW |
| **Files** | `src/child/child.css` L5 |
| **Problem** | `@import url(...)` for Google Fonts runs on every TikTok page load even when child panel isn't rendered. Privacy concern (Google sees every TikTok visit). May cause CSP conflicts. |
| **Fix** | Remove the `@import`. Use system fonts which are already declared as fallbacks. |

---

## Verdict

### Can the current implementation reliably enforce parent-defined policy?

# PARTIALLY

### Evidence

| Capability | Status | Evidence |
|---|---|---|
| PIN-protected parent access | ✅ Working | PBKDF2 hashing, salt, proper verification flow |
| Storage single source of truth | ✅ Working | Centralized `StorageManager`, `chrome.storage.local` |
| Lock screen on startup | ✅ Working | `document_start` injection, CSS-based content hiding |
| Parent dashboard (config UI) | ✅ Working | Full interest/creator/control management |
| Child-friendly UI | ⚠️ Unreachable | Lock button goes to `LOCKED` not `CHILD_MODE` (F-06) |
| Route enforcement | ❌ Missing | No route parser, no policy engine (F-01) |
| SPA navigation interception | ❌ Missing | No pushState/replaceState override (F-02) |
| DOM element hiding | ⚠️ Cosmetic only | CSS hiding works but is trivially bypassable (F-13) |
| Lock overlay tamper resistance | ❌ Missing | No MutationObserver re-injection (F-07) |
| Creator allowlist enforcement | ❌ Ineffective | Only hides links, doesn't block navigation (F-01, F-13) |

**The extension successfully gates access to parent settings behind a PIN and provides a solid configuration UI. However, once in "child mode" (if reachable), it provides essentially zero enforcement of parent-defined policy. A child can navigate to any TikTok URL directly, and the DOM enforcer only hides cosmetic elements without blocking actual content access.**
