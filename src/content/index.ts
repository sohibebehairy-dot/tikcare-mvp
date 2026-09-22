import { StorageManager } from '../storage';
import { hashPin, generateSalt } from '../crypto';
import { renderChildPanel, removeChildPanel } from '../child/child';
import { DomEnforcer } from './dom-enforcer';
import { evaluateRoute } from './route-enforcer';

console.log('TikCare content script loaded.');

// Only activate on TikTok Web
const isTikTok = window.location.hostname.includes('tiktok.com');

if (isTikTok) {
  console.log('Initializing TikCare on TikTok Web.');
  document.documentElement.classList.add('tikcare-evaluating');

  let lockOverlay: HTMLDivElement | null = null;
  let dashboardOpened = false;
  let childModeActive = false;
  
  // Rate limiting & UI refs
  let failedPinAttempts = 0;
  let pinLockoutUntil = 0;
  let domEnforcer: DomEnforcer | null = null;
  let lockTamperObserver: MutationObserver | null = null;
  let routeBlockOverlay: HTMLDivElement | null = null;

  // ── Lock Screen ────────────────────────────────────────────────────────

  async function renderLockScreen(isConfigured: boolean) {
    if (lockOverlay) lockOverlay.remove();

    lockOverlay = document.createElement('div');
    lockOverlay.id = 'tikcare-lock-overlay';

    const container = document.createElement('div');
    container.className = 'tikcare-lock-container';

    const title = document.createElement('h1');
    title.textContent = 'TikCare';

    const subtitle = document.createElement('p');
    subtitle.textContent = isConfigured ? 'TikTok is protected.' : 'Set up TikCare';

    const form = document.createElement('form');
    form.className = 'tikcare-auth-form';

    const pinInput = document.createElement('input');
    pinInput.type = 'password';
    pinInput.id = 'tikcare-pin-input';
    pinInput.placeholder = isConfigured ? 'Enter Parent PIN' : 'Create Parent PIN';
    pinInput.maxLength = 12;
    pinInput.minLength = 4; // F-11
    pinInput.required = true;
    pinInput.autocomplete = 'off';

    const errorMsg = document.createElement('p');
    errorMsg.className = 'tikcare-error';
    errorMsg.setAttribute('role', 'alert');
    errorMsg.style.display = 'none';

    const submitBtn = document.createElement('button');
    submitBtn.type = 'submit';
    submitBtn.innerHTML = isConfigured ? '🔒 Parent Access' : 'Create PIN';

    form.appendChild(pinInput);
    form.appendChild(errorMsg);
    form.appendChild(submitBtn);
    container.appendChild(title);
    container.appendChild(subtitle);
    container.appendChild(form);
    lockOverlay.appendChild(container);
    document.body.appendChild(lockOverlay);

    setTimeout(() => pinInput.focus(), 50);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const now = Date.now();
      if (now < pinLockoutUntil) {
        errorMsg.textContent = `Too many attempts. Try again in ${Math.ceil((pinLockoutUntil - now) / 1000)} seconds.`;
        errorMsg.style.display = 'block';
        return;
      }
      
      const pin = pinInput.value;
      if (pin.length < 4) {
        errorMsg.textContent = 'PIN must be at least 4 characters.';
        errorMsg.style.display = 'block';
        return;
      }

      submitBtn.disabled = true;
      const state = await StorageManager.loadState();

      if (!isConfigured) {
        const salt = generateSalt();
        const pinHash = await hashPin(pin, salt);
        await StorageManager.setupPin(pinHash, salt);
        await StorageManager.setMode('PARENT_DASHBOARD');
      } else {
        const hashAttempt = await hashPin(pin, state.auth.salt);
        const isValid = await StorageManager.verifyPin(hashAttempt);

        if (isValid) {
          failedPinAttempts = 0;
          errorMsg.style.display = 'none';
          await StorageManager.setMode('PARENT_DASHBOARD');
        } else {
          failedPinAttempts++;
          if (failedPinAttempts >= 5) {
            pinLockoutUntil = Date.now() + 5 * 60 * 1000;
            errorMsg.textContent = 'Too many attempts. Locked out for 5 minutes.';
          } else if (failedPinAttempts >= 3) {
            pinLockoutUntil = Date.now() + 30 * 1000;
            errorMsg.textContent = 'Too many attempts. Locked out for 30 seconds.';
          } else {
            errorMsg.textContent = 'Incorrect PIN. Please try again.';
          }
          errorMsg.style.display = 'block';
          pinInput.value = '';
          pinInput.focus();
          submitBtn.disabled = false;
        }
      }
    });
  }

  // ── State evaluation ──────────────────────────────────────────────────

  async function checkState() {
    const state = await StorageManager.loadState();

    // ── PARENT_DASHBOARD ───────────────────────────────────────────────
    if (state.mode === 'PARENT_DASHBOARD') {
      if (!dashboardOpened) {
        dashboardOpened = true;
        chrome.runtime.sendMessage({ action: 'OPEN_DASHBOARD' });
      }
      // Keep TikTok behind lock while parent configures in the other tab
      document.documentElement.classList.add('tikcare-locked');
      removeChildPanel();
      childModeActive = false;
      if (domEnforcer) domEnforcer.stop();
      if (routeBlockOverlay) { routeBlockOverlay.remove(); routeBlockOverlay = null; }

      if (!lockOverlay) {
        const msg = document.createElement('div');
        msg.id = 'tikcare-lock-overlay';
        const box = document.createElement('div');
        box.className = 'tikcare-lock-container';
        box.innerHTML = '<h1>TikCare</h1><p>Parent dashboard is open in another tab.</p>';
        msg.appendChild(box);
        document.body?.appendChild(msg);
        lockOverlay = msg as HTMLDivElement;
      }
      return;
    }

    // ── LOCKED / not configured ────────────────────────────────────────
    if (state.mode === 'LOCKED' || !state.setupComplete) {
      dashboardOpened = false;
      childModeActive = false;
      removeChildPanel();
      if (domEnforcer) domEnforcer.stop();
      if (routeBlockOverlay) { routeBlockOverlay.remove(); routeBlockOverlay = null; }
      document.documentElement.classList.add('tikcare-locked');

      if (document.body) {
        await renderLockScreen(state.auth.isConfigured);
      } else {
        window.addEventListener('DOMContentLoaded', () => renderLockScreen(state.auth.isConfigured));
      }

      // F-07: Tamper handling for lock screen
      if (!lockTamperObserver) {
        lockTamperObserver = new MutationObserver(() => {
          if (!document.documentElement.classList.contains('tikcare-locked')) {
            document.documentElement.classList.add('tikcare-locked');
          }
          if (document.body && !document.getElementById('tikcare-lock-overlay')) {
            renderLockScreen(state.auth.isConfigured);
          }
        });
        lockTamperObserver.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
      }
      return;
    }

    // ── CHILD_MODE ─────────────────────────────────────────────────────
    dashboardOpened = false;
    
    if (lockTamperObserver) {
      lockTamperObserver.disconnect();
      lockTamperObserver = null;
    }

    // Remove lock overlay
    if (lockOverlay) {
      lockOverlay.remove();
      lockOverlay = null;
    }

    // F-01: Route Enforcement
    const routeDecision = evaluateRoute(window.location.href, state);
    if (routeDecision === 'BLOCK') {
      document.documentElement.classList.add('tikcare-evaluating');
      removeChildPanel();
      if (domEnforcer) domEnforcer.stop();
      
      if (!routeBlockOverlay) {
        routeBlockOverlay = document.createElement('div');
        routeBlockOverlay.id = 'tikcare-lock-overlay'; // use same styles as lock
        routeBlockOverlay.innerHTML = `
          <div class="tikcare-lock-container">
            <h1>TikCare</h1>
            <p>This content isn't available under the current parent settings.</p>
            <button id="tc-back-btn" style="margin-top: 20px; padding: 12px; font-size: 1.1rem; font-weight: bold; border: none; border-radius: 6px; background: #fe2c55; color: #fff; cursor: pointer;">Back to Safety</button>
          </div>
        `;
        document.body?.appendChild(routeBlockOverlay);
        document.getElementById('tc-back-btn')?.addEventListener('click', () => {
          window.history.back();
          setTimeout(() => { if (window.location.href === window.location.href) window.location.href = '/'; }, 100);
        });
      }
      return;
    }

    // Route ALLOWED:
    if (routeBlockOverlay) {
      routeBlockOverlay.remove();
      routeBlockOverlay = null;
    }

    // Remove the TikTok content blackout so the page continues to load
    document.documentElement.classList.remove('tikcare-evaluating');
    document.documentElement.classList.remove('tikcare-locked');

    // Render child panel
    childModeActive = true;
    await renderChildPanel();

    // Start dynamic DOM enforcement
    if (!domEnforcer) domEnforcer = new DomEnforcer();
    domEnforcer.updateState(state);
    domEnforcer.start();
  }

  // F-02: SPA Navigation Interception
  let urlChangeTimeout: ReturnType<typeof setTimeout> | null = null;
  const onUrlChange = () => {
    document.documentElement.classList.add('tikcare-evaluating');
    if (urlChangeTimeout) clearTimeout(urlChangeTimeout);
    urlChangeTimeout = setTimeout(() => checkState(), 50);
  };

  const origPushState = history.pushState.bind(history);
  history.pushState = function(...args) {
    origPushState(...args);
    onUrlChange();
  };

  const origReplaceState = history.replaceState.bind(history);
  history.replaceState = function(...args) {
    origReplaceState(...args);
    onUrlChange();
  };

  window.addEventListener('popstate', onUrlChange);

  // Initial check
  checkState();

  // Re-evaluate on any state change (covers: parent locks, dashboard closes, etc.)
  StorageManager.onChange(() => {
    checkState();
  });
}
