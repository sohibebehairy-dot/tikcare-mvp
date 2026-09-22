import { StorageManager } from '../storage';
import { TikCareState } from '../types';
import CATALOG from '../data/creators.json';

// ── Types ─────────────────────────────────────────────────────────────────

interface InterestMeta {
  id: string;
  label: string;
  icon: string;
}

interface CatalogCreator {
  id: string;
  username: string;
  displayName: string;
  category: string;
  description: string;
  reviewStatus: string;
  reviewDate: string;
  evidence: unknown;
  sourceProfile: string;
  demoData: boolean;
}

// ── Interest metadata (read-only display, no config exposed) ───────────────

const INTEREST_META: InterestMeta[] = [
  { id: 'sports',     label: 'Sports',        icon: '⚽' },
  { id: 'gaming',     label: 'Gaming',         icon: '🎮' },
  { id: 'technology', label: 'Technology',     icon: '💻' },
  { id: 'stem',       label: 'STEM',           icon: '🔬' },
  { id: 'science',    label: 'Science',        icon: '🧪' },
  { id: 'education',  label: 'Education',      icon: '📚' },
  { id: 'coding',     label: 'Coding',         icon: '🖥' },
  { id: 'robotics',   label: 'Robotics',       icon: '🤖' },
  { id: 'music',      label: 'Music',          icon: '🎵' },
  { id: 'art',        label: 'Art & Design',   icon: '🎨' },
  { id: 'style',      label: 'Style & Beauty', icon: '✨' },
];

const CREATORS = CATALOG as CatalogCreator[];

// ── Module state ──────────────────────────────────────────────────────────

let childPanel: HTMLDivElement | null = null;

// ── Public API ────────────────────────────────────────────────────────────

/** Render the child mode panel using the current stored state. */
export async function renderChildPanel(): Promise<void> {
  removeChildPanel(); // idempotent

  const state = await StorageManager.loadState();
  childPanel = buildPanel(state);

  if (document.body) {
    document.body.appendChild(childPanel);
  } else {
    window.addEventListener('DOMContentLoaded', () => {
      document.body.appendChild(childPanel!);
    });
  }
}

/** Remove the child panel if present (called when switching back to LOCKED). */
export function removeChildPanel(): void {
  if (childPanel) {
    childPanel.remove();
    childPanel = null;
  }
  const existing = document.getElementById('tikcare-child-panel');
  if (existing) existing.remove();
}

// ── Panel construction ────────────────────────────────────────────────────

function buildPanel(state: TikCareState): HTMLDivElement {
  const panel = document.createElement('div');
  panel.id = 'tikcare-child-panel';

  panel.appendChild(buildHeader());
  panel.appendChild(buildBody(state));

  return panel;
}

function buildHeader(): HTMLElement {
  const header = document.createElement('div');
  header.id = 'tikcare-child-header';
  header.innerHTML = `
    <div class="tc-child-logo">
      <div class="tc-child-logo-icon" aria-hidden="true">🛡</div>
      <span class="tc-child-logo-text">TikCare</span>
    </div>
    <span class="tc-child-header-note">Protected mode</span>
  `;
  return header;
}

function buildBody(state: TikCareState): HTMLElement {
  const body = document.createElement('div');
  body.id = 'tikcare-child-body';

  body.appendChild(buildGreeting());
  body.appendChild(buildInterestsSection(state));
  body.appendChild(buildCreatorsSection(state));
  body.appendChild(buildFooter());

  return body;
}

function buildGreeting(): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'tc-child-greeting';
  wrap.innerHTML = `
    <h1 class="tc-child-greeting-title">Approved Content</h1>
    <p class="tc-child-greeting-sub">Browse your approved topics and creators below.</p>
  `;
  return wrap;
}

function buildInterestsSection(state: TikCareState): HTMLElement {
  const section = document.createElement('div');
  section.className = 'tc-child-section';

  const label = document.createElement('div');
  label.className = 'tc-child-section-label';
  label.textContent = 'Approved Topics';
  section.appendChild(label);

  const { selectedCategories } = state.interests;

  if (selectedCategories.length === 0) {
    section.appendChild(emptyState('No topics have been selected yet.'));
    return section;
  }

  const chips = document.createElement('div');
  chips.className = 'tc-child-chips';
  chips.setAttribute('role', 'list');
  chips.setAttribute('aria-label', 'Approved interest topics');

  selectedCategories.forEach(id => {
    const meta = INTEREST_META.find(i => i.id === id);
    if (!meta) return;

    const chip = document.createElement('div');
    chip.className = 'tc-child-chip';
    chip.setAttribute('role', 'listitem');
    chip.innerHTML = `
      <span class="tc-child-chip-icon" aria-hidden="true">${meta.icon}</span>
      <span>${meta.label}</span>
    `;
    chips.appendChild(chip);
  });

  section.appendChild(chips);
  return section;
}

function buildCreatorsSection(state: TikCareState): HTMLElement {
  const section = document.createElement('div');
  section.className = 'tc-child-section';

  const label = document.createElement('div');
  label.className = 'tc-child-section-label';
  label.textContent = 'Approved Creators';
  section.appendChild(label);

  const { approvedCreatorUsernames } = state.creators;

  if (approvedCreatorUsernames.length === 0) {
    section.appendChild(emptyState('No creators have been approved yet.'));
    return section;
  }

  const list = document.createElement('div');
  list.className = 'tc-child-creator-list';
  list.setAttribute('role', 'list');
  list.setAttribute('aria-label', 'Approved creators');

  approvedCreatorUsernames.forEach(username => {
    const creator = CREATORS.find(c => c.username === username);
    if (!creator) return;

    const item = document.createElement('a');
    item.className = 'tc-child-creator-item';
    item.href = creator.sourceProfile;
    item.target = '_blank';
    item.rel = 'noopener noreferrer';
    item.setAttribute('role', 'listitem');
    item.setAttribute('aria-label', `Open ${creator.displayName}'s TikTok profile`);

    item.innerHTML = `
      <div class="tc-child-creator-avatar" aria-hidden="true">${creator.displayName.charAt(0)}</div>
      <div class="tc-child-creator-info">
        <div class="tc-child-creator-name">${creator.displayName}</div>
        <div class="tc-child-creator-handle">@${creator.username}</div>
      </div>
      <span class="tc-child-creator-arrow" aria-hidden="true">↗</span>
    `;

    list.appendChild(item);
  });

  section.appendChild(list);
  return section;
}

function buildFooter(): HTMLElement {
  const footer = document.createElement('p');
  footer.className = 'tc-child-footer-note';
  footer.textContent = 'TikCare is active. Content outside approved topics and creators is restricted.';
  return footer;
}

function emptyState(message: string): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'tc-child-empty';
  const p = document.createElement('p');
  p.className = 'tc-child-empty-text';
  p.textContent = message;
  wrap.appendChild(p);
  return wrap;
}
