import { StorageManager } from '../storage';

async function init() {
  const modeBadge = document.getElementById('mode-badge');
  const openBtn   = document.getElementById('open-dashboard-btn');

  if (!modeBadge || !openBtn) return;

  const state = await StorageManager.loadState();
  const mode  = state.mode ?? 'LOCKED';

  modeBadge.textContent = mode === 'LOCKED' ? 'Locked'
                        : mode === 'PARENT_DASHBOARD' ? 'Parent Mode'
                        : 'Child Mode';

  openBtn.addEventListener('click', async () => {
    const dashboardUrl = chrome.runtime.getURL('dashboard.html');
    await chrome.tabs.create({ url: dashboardUrl });
    window.close();
  });
}

document.addEventListener('DOMContentLoaded', init);

