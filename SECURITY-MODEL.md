# Security Model

## Core Principle: Deny-by-Default
TikCare V2 operates on a strict deny-by-default architecture. Nothing is accessible unless explicitly permitted by the parent's configuration.

## Threat Model & Mitigations

### 1. SPA Navigation Bypass
**Threat**: The child clicks a link to an unapproved creator within the TikTok Single Page Application. Since the page doesn't fully reload, standard content script injection on `document_start` might not re-evaluate the page.
**Mitigation**: The Navigation Detection module overrides `pushState` and `replaceState`, and listens to `popstate`. Every internal URL change forces an immediate re-evaluation by the Policy Engine.

### 2. UI Hiding Insufficiency
**Threat**: Hiding the "Search" button via CSS does not prevent a user from manually typing `tiktok.com/search` into the URL bar, or navigating to an unapproved creator via a direct link.
**Mitigation**: Route blocking is the primary defense. The Route Parser analyzes the URL. If the URL matches a blocked feature (e.g., `/search`) or an unapproved creator profile, the Policy Engine blocks the render entirely, regardless of how the user arrived there.

### 3. Early Rendering / Flashing
**Threat**: TikTok content briefly flashes on screen before the extension can load and apply the lock screen.
**Mitigation**: The extension uses a highly optimized, lightweight bootstrap script injected at `document_start`. It applies a global blocking CSS rule (e.g., `html { display: none !important; }`) instantly, only removing it once the policy evaluation is complete and deemed safe.

### 4. DOM Manipulation
**Threat**: The child uses browser developer tools to delete the lock screen overlay.
**Mitigation**: While a sophisticated user with dev tools can bypass client-side extensions, we mitigate casual tampering using a `MutationObserver`. If the lock overlay is removed from the DOM while the state is `LOCKED`, it is immediately re-injected.

### 5. Authentication Storage
**Threat**: Storing the parent PIN in plain text in `chrome.storage.local`.
**Mitigation**: The PIN is hashed using the Web Crypto API (SHA-256 with a unique salt) before storage. Only the hash is compared during authentication.
