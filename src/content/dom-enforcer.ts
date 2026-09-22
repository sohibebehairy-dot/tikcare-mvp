import { TikCareState, FeatureToggles } from '../types';
import { DOM_SELECTORS } from './selectors';

export class DomEnforcer {
  private styleElement: HTMLStyleElement | null = null;
  private observer: MutationObserver | null = null;
  private currentState: TikCareState | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Initialization deferred to start() to prevent early injection crashes (F-03)
  }

  /**
   * Updates the enforcer with the latest state.
   */
  public updateState(state: TikCareState): void {
    this.currentState = state;
    this.applyFeatureToggles(state.features);
    
    // Trigger an immediate scan when state updates, debounced
    this.scheduleDynamicEnforcement();
  }

  /**
   * Starts the MutationObserver for dynamic DOM elements.
   */
  public start(): void {
    if (this.observer) return;
    this.injectStyleElement();

    this.observer = new MutationObserver((mutations) => {
      // Only schedule a scan if elements were added or attributes changed.
      // We debounce to prevent performance degradation on rapid SPA updates.
      let needsEnforcement = false;
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0 || mutation.type === 'attributes') {
          needsEnforcement = true;
          break;
        }
      }

      if (needsEnforcement) {
        this.scheduleDynamicEnforcement();
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['href', 'src'] // Only care about link/source changes
    });

    this.scheduleDynamicEnforcement();
  }

  /**
   * Stops the MutationObserver and cleans up.
   */
  public stop(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.clearStyles();
  }

  // ── CSS Rule Enforcement (Static/Toggleable UI) ──────────────────────────

  private injectStyleElement(): void {
    if (this.styleElement) return;

    this.styleElement = document.createElement('style');
    this.styleElement.id = 'tikcare-dom-enforcement';
    
    if (document.head) {
      document.head.appendChild(this.styleElement);
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        if (this.styleElement && !this.styleElement.parentNode && document.head) {
          document.head.appendChild(this.styleElement);
        }
      });
    }
  }

  private clearStyles(): void {
    if (this.styleElement) {
      this.styleElement.textContent = '';
    }
  }

  private applyFeatureToggles(features: FeatureToggles): void {
    if (!this.styleElement) return;

    let cssRules = '';
    const hiddenSelectors: string[] = [];

    // Traverse the feature toggles and collect selectors for disabled features
    for (const group of Object.keys(features) as Array<keyof FeatureToggles>) {
      const toggles = features[group];
      for (const key of Object.keys(toggles)) {
        // If a feature is disabled (false), we want to hide it
        if (!(toggles as any)[key]) {
          const selectorsGroup = DOM_SELECTORS[group];
          if (selectorsGroup && (selectorsGroup as any)[key]) {
            hiddenSelectors.push(...(selectorsGroup as any)[key]);
          }
        }
      }
    }

    if (hiddenSelectors.length > 0) {
      // Grouping all selectors to minimize CSS size and improve parsing
      cssRules = `${hiddenSelectors.join(',\n')} { display: none !important; visibility: hidden !important; }`;
    }

    this.styleElement.textContent = cssRules;
  }

  // ── Dynamic Enforcement (e.g., Unapproved Creators) ──────────────────────

  private scheduleDynamicEnforcement(): void {
    if (!this.currentState) return;

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.enforceDynamicRules();
    }, 150); // 150ms debounce
  }

  private enforceDynamicRules(): void {
    if (!this.currentState) return;

    const approvedUsernames = this.currentState.creators.approvedCreatorUsernames.map(u => u.toLowerCase());

    // 1. Enforce Creator Allowlist on Links
    // Find all links that might point to a creator profile (e.g., /@username)
    const profileLinks = document.querySelectorAll<HTMLAnchorElement>('a[href*="/@"]');
    
    profileLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (!href) return;

      const match = href.match(/\/@([a-zA-Z0-9_.-]+)/);
      if (match && match[1]) {
        const username = match[1].toLowerCase();
        
        // If it's a creator profile link and not in the approved list, hide the element
        if (!approvedUsernames.includes(username)) {
          // Hide the link itself
          link.style.setProperty('display', 'none', 'important');
          
          // If this link is inside a typical card/container, we might want to hide the parent
          // Best effort container hiding:
          const container = link.closest('[data-e2e="search-user-card"], [data-e2e="suggest-account"]');
          if (container) {
            (container as HTMLElement).style.setProperty('display', 'none', 'important');
          }
        }
      }
    });

    // 2. Future dynamic enforcements can be added here
  }
}
