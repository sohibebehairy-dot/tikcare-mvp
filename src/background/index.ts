import { StorageManager } from '../storage';

console.log('TikCare background service worker initializing.');

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    console.log('Extension installed, initializing default state.');
    // Init state if it doesn't exist
    const state = await StorageManager.loadState();
    if (!state.setupComplete) {
      await StorageManager.setMode('LOCKED');
    }
  }
});

// Listener to handle navigation state (basic setup for now, expanded in Prompt 3)
chrome.webNavigation?.onHistoryStateUpdated?.addListener((details) => {
  if (details.url.includes('tiktok.com')) {
    console.log('SPA navigation detected via History State:', details.url);
    // Future: notify content script to re-evaluate policy
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'OPEN_DASHBOARD') {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
  }
});
