# TikCare V2 — Fix Plan

**Purpose**: Only the changes that must happen before the final demo.  
**Reference**: ARCHITECTURE-AUDIT.md findings F-01 through F-15.  
**Constraint**: The next agent implements these. This document is the spec.

---

## Priority 1 — Must Fix (Demo-Breaking)

These issues prevent the extension from functioning at all or from demonstrating its core value proposition.

---

### Fix 1: DomEnforcer Early Injection Crash (F-03)

**Root cause**: `DomEnforcer` constructor injects a `<style>` into the DOM at `document_start` when `<head>` doesn't exist yet. This breaks TikTok page loading.

**Change**:
- **File**: `src/content/dom-enforcer.ts`
- Remove the `this.injectStyleElement()` call from the constructor.
- Move it to the `start()` method. Guard it: only inject when `document.head` exists. If `document.head` is null, defer with `document.addEventListener('DOMContentLoaded', ...)`.
- Also remove the eager instantiation in `content/index.ts` — create the `DomEnforcer` lazily inside the CHILD_MODE branch of `checkState()`, or just don't call `new DomEnforcer()` at module top level.

**Verification**: Extension enabled + tiktok.com loads without 403.

---

### Fix 2: Lock Button → CHILD_MODE (F-06)

**Root cause**: Dashboard "Lock TikCare" calls `setMode('LOCKED')` instead of `setMode('CHILD_MODE')`.

**Change**:
- **File**: `src/dashboard/dashboard.ts` — `setupLockButtons()` method (L198-205)
- Change `await StorageManager.setMode('LOCKED')` to `await StorageManager.setMode('CHILD_MODE')`.

**Verification**: After parent configures and clicks Lock, child sees the child panel (not the PIN screen).

---

### Fix 3: Remove `web_accessible_resources` (F-05) and `activeTab` (F-14)

**Change**:
- **File**: `src/manifest.json`
- Delete the entire `web_accessible_resources` block (L30-34). The dashboard is opened via `chrome.runtime.getURL()` from extension pages — it doesn't need web accessibility.
- Remove `"activeTab"` from the `permissions` array.

**Verification**: Dashboard still opens from popup. No external page can iframe the dashboard.

---

### Fix 4: Remove Google Fonts `@import` (F-15)

**Change**:
- **File**: `src/child/child.css`
- Delete line 5: `@import url('https://fonts.googleapis.com/css2?family=Inter...')`.
- The font stack already has system fallbacks.

**Verification**: No external network request to Google on TikTok page load.

---

## Priority 2 — Must Fix (Core Security)

These issues mean the extension cannot enforce its stated policy even after it loads.

---

### Fix 5: Implement Route Enforcement (F-01)

**New file**: `src/content/route-enforcer.ts`

**Requirements**:
1. Export a function `evaluateRoute(url: string, state: TikCareState): 'ALLOW' | 'BLOCK'`.
2. Parse the URL path:
   - `/foryou` → check `state.features.discovery.forYou`
   - `/explore` → check `state.features.discovery.explore`
   - `/search` → check `state.features.discovery.search`
   - `/live` → check `state.features.live.liveStreams`
   - `/messages` → check `state.features.social.directMessages`
   - `/@username` → check if `username` is in `state.creators.approvedCreatorUsernames`
   - `/@username/video/*` → same creator check
   - `/tag/*` → check `state.features.discovery.hashtags`
   - `/music/*` → check `state.features.discovery.sounds`
   - Any other path → `BLOCK` (deny-by-default)
3. Default to `BLOCK` for any unrecognized route.

**Integration** in `src/content/index.ts`:
- In the CHILD_MODE branch of `checkState()`, call `evaluateRoute(window.location.href, state)`.
- If `BLOCK`, show a "Content Blocked" overlay (similar to lock overlay but with different messaging).
- If `ALLOW`, proceed normally (render child panel, start DOM enforcer).

**Verification**: Navigate to `tiktok.com/@unapprovedcreator` → blocked. Navigate to `tiktok.com/@approvedcreator` → allowed.

---

### Fix 6: Implement SPA Navigation Interception (F-02)

**Change in**: `src/content/index.ts`

**Requirements**:
1. Override `history.pushState` and `history.replaceState`:
   ```typescript
   const origPushState = history.pushState.bind(history);
   const origReplaceState = history.replaceState.bind(history);
   history.pushState = function(...args) {
     origPushState(...args);
     onUrlChange();
   };
   history.replaceState = function(...args) {
     origReplaceState(...args);
     onUrlChange();
   };
   window.addEventListener('popstate', onUrlChange);
   ```
2. `onUrlChange()` should debounce (100ms) and then call `evaluateRoute()` with the new URL.
3. If the new route is blocked, inject the "Content Blocked" overlay.

**Verification**: In child mode, click an internal TikTok link to `/explore` (disabled) → blocked overlay appears.

---

### Fix 7: Lock Overlay Tamper Resistance (F-07)

**Change in**: `src/content/index.ts`

**Requirements**:
1. When in `LOCKED` mode, start a `MutationObserver` on `document.documentElement` watching for:
   - Removal of `#tikcare-lock-overlay` from the DOM
   - Removal of `tikcare-locked` class from `<html>`
2. If either is detected and mode is still `LOCKED`, immediately re-inject the overlay and re-add the class.

**Verification**: In locked mode, open DevTools, delete `#tikcare-lock-overlay` → it reappears instantly.

---

### Fix 8: PIN Minimum Length (F-11)

**Change in**: `src/content/index.ts` — `renderLockScreen()` function.

- Set `pinInput.minLength = 4`.
- Add client-side validation before submit: if `pin.length < 4`, show error "PIN must be at least 4 characters", prevent submission.

**Verification**: Try creating a 2-character PIN → rejected with error message.

---

## Priority 3 — Should Fix (Hardening)

These improve security but are not strictly demo-blocking.

---

### Fix 9: Add `UNINITIALIZED` to Mode Type (F-09)

- **File**: `src/types/index.ts` — change Mode to `'UNINITIALIZED' | 'LOCKED' | 'PARENT_DASHBOARD' | 'CHILD_MODE'`.
- **File**: `src/storage/index.ts` — remove the `as any` cast on line 7. Use `'UNINITIALIZED'` directly.

---

### Fix 10: PIN Attempt Rate Limiting (F-12)

- **File**: `src/content/index.ts`
- Track failed attempts in a local variable (lost on page reload, which is acceptable for MVP).
- After 3 failures, disable the submit button for 30 seconds. Show countdown.
- After 5 failures, disable for 5 minutes.

---

### Fix 11: Foundation CSS Hardening (F-08)

- **File**: `src/styles/foundation.css`
- Add: `html.tikcare-locked { overflow: hidden !important; }`
- Add to `#tikcare-lock-overlay`: `pointer-events: all;`

---

## Implementation Order

The next agent should implement in this order:

1. **Fix 1** (DomEnforcer crash) — unblocks TikTok loading
2. **Fix 4** (Remove Google Fonts) — removes external request
3. **Fix 3** (Manifest cleanup) — reduces attack surface
4. **Fix 2** (Lock → CHILD_MODE) — makes child mode reachable
5. **Fix 9** (Type fix) — cleans up before new code
6. **Fix 5** (Route enforcement) — core security feature
7. **Fix 6** (SPA interception) — core security feature
8. **Fix 7** (Lock tamper resistance) — security hardening
9. **Fix 8** (PIN min length) — auth hardening
10. **Fix 10** (Rate limiting) — auth hardening
11. **Fix 11** (CSS hardening) — defense in depth

After all fixes, rebuild and test:
```
npm run build
```
Then reload the extension in Chrome and verify each fix against its verification step.
