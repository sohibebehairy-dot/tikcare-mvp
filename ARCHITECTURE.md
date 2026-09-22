# Architecture for TikCare V2

## Overview
TikCare V2 is a Chrome/Edge Manifest V3 extension designed to enforce a deny-by-default, parent-controlled environment on TikTok Web.

## Module Definitions

1. **Bootstrap**
   - **Responsibility**: Initializes the extension as early as possible. Injects necessary content scripts, checks initial authentication state, and sets up the immediate lock screen overlay before TikTok renders.

2. **Lock Overlay**
   - **Responsibility**: A full-screen, high z-index DOM element that obscures TikTok content. It is the default state until child mode is explicitly activated or parent authentication succeeds.

3. **Authentication**
   - **Responsibility**: Handles parent PIN/password validation. Uses Web Crypto API for local hashing/verification. Guards access to the Parent Dashboard.

4. **Storage**
   - **Responsibility**: Wraps `chrome.storage.local`. Serves as the single source of truth for all configurations, including feature toggles, approved creators, and authentication state.

5. **Policy Engine**
   - **Responsibility**: The core decision-maker. Evaluates the current TikTok state against the parent's configuration to determine if a route, feature, or creator should be allowed, blocked, hidden, or limited.

6. **Route Parser**
   - **Responsibility**: Analyzes the current URL to determine the context (e.g., `/explore`, `/@username`, `/search`). Feeds this context to the Policy Engine.

7. **Creator Allowlist**
   - **Responsibility**: Manages the list of explicitly approved creators. Queries the Storage module to verify if a given creator is accessible.

8. **DOM Enforcement**
   - **Responsibility**: Uses `MutationObserver` and injected CSS to hide restricted features (e.g., comments, search bars) and visually enforce the Policy Engine's decisions.

9. **Navigation Detection**
   - **Responsibility**: Monitors SPA (Single Page Application) route changes in TikTok without full page reloads using the History API (pushState/replaceState) and `popstate` events. Triggers re-evaluation by the Policy Engine on every navigation.

10. **Parent Dashboard**
    - **Responsibility**: A polished UI (rendered in an extension page or injected shadow DOM) where the parent configures toggles, interests, and reviews creators.

11. **Interest Selector**
    - **Responsibility**: UI component within the dashboard for selecting relevant categories (e.g., STEM, Education).

12. **Creator Catalog**
    - **Responsibility**: A local hardcoded or bundled JSON catalog of reviewed creators available for the parent to review and approve.

13. **Creator Evidence**
    - **Responsibility**: UI component displaying rationale, categories, and descriptions for creators in the catalog to help parents make informed approval decisions.

14. **Child Mode**
    - **Responsibility**: The operational state where the lock overlay is lifted, but the Policy Engine and DOM Enforcement actively restrict the TikTok experience according to the approved configuration.

## Communication Between Contexts
- **Content Scripts**: Run in the context of TikTok Web. Handle Bootstrap, Lock Overlay, DOM Enforcement, Navigation Detection, and Route Parsing. Communicate with the Service Worker for policy decisions and state updates.
- **Service Worker (Background)**: Acts as the central hub. Listens for navigation events, handles storage access, and runs the Policy Engine (or coordinates it).
- **Extension Pages (Dashboard)**: Run in a separate tab or popup. Modify `chrome.storage.local` directly.
- **Message Passing**: Uses `chrome.runtime.sendMessage` and `chrome.runtime.onMessage` to sync state changes between the Dashboard, Service Worker, and Content Scripts.

## Source of Truth
The absolute source of truth is `chrome.storage.local`. All modules react to state changes originating from this storage (using `chrome.storage.onChanged`).

## Policy Flow
1. **TikTok state change**: A navigation event or DOM mutation occurs.
2. **Route evaluation**: Route Parser identifies the requested resource (e.g., a specific creator profile).
3. **Creator evaluation**: Policy Engine checks if the creator is in the Allowlist.
4. **Feature evaluation**: Policy Engine checks feature toggles (e.g., are comments allowed?).
5. **Enforcement**: Policy Engine returns a decision (`ALLOW`, `BLOCK`, `HIDE`, `LIMITED`).
6. **Action**: DOM Enforcement applies CSS/DOM changes, or Lock Overlay is triggered if blocked.
