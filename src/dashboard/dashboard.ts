import { StorageManager } from '../storage';
import { TikCareState, FeatureToggles } from '../types';
import { DemoAccountSource, InterestSignal, SignalStrength } from '../data/interest-sources';
import CATALOG from '../data/creators.json';

// ── Types ────────────────────────────────────────────────────────────────

interface InterestMeta {
  id: string;
  label: string;
  icon: string;
  desc: string;
}

interface ControlMeta {
  key: string;
  label: string;
  desc: string;
  warning?: string;
}

interface ControlGroup {
  group: string;
  controls: ControlMeta[];
}

interface CreatorEvidence {
  profileReviewed: boolean;
  recentContentReviewed: boolean;
  externalLinksReviewed: boolean;
  reviewerNotes: string;
  contentSample: string;
  redFlagsFound: boolean;
}

interface CatalogCreator {
  id: string;
  username: string;
  displayName: string;
  category: string;
  description: string;
  reviewStatus: 'APPROVED' | 'PENDING' | 'REJECTED';
  reviewDate: string;
  evidence: CreatorEvidence;
  sourceProfile: string;
  demoData: boolean;
}

// ── Static data ──────────────────────────────────────────────────────────

const INTERESTS: InterestMeta[] = [
  { id: 'sports',     label: 'Sports',        icon: '⚽', desc: 'Athletics, fitness & team sports' },
  { id: 'gaming',     label: 'Gaming',         icon: '🎮', desc: 'Video games & esports' },
  { id: 'technology', label: 'Technology',     icon: '💻', desc: 'Tech reviews, gadgets & innovation' },
  { id: 'stem',       label: 'STEM',           icon: '🔬', desc: 'Science, technology, engineering & maths' },
  { id: 'science',    label: 'Science',        icon: '🧪', desc: 'Experiments, nature & discovery' },
  { id: 'education',  label: 'Education',      icon: '📚', desc: 'Learning, history & knowledge' },
  { id: 'coding',     label: 'Coding',         icon: '🖥',  desc: 'Programming tutorials & projects' },
  { id: 'robotics',   label: 'Robotics',       icon: '🤖', desc: 'Robotics, electronics & making' },
  { id: 'music',      label: 'Music',          icon: '🎵', desc: 'Music creation, covers & instruments' },
  { id: 'art',        label: 'Art & Design',   icon: '🎨', desc: 'Drawing, animation & visual arts' },
  { id: 'style',      label: 'Style & Beauty', icon: '✨', desc: 'Fashion, self-care & style inspiration' },
];

const CONTROL_GROUPS: ControlGroup[] = [
  {
    group: 'Discovery',
    controls: [
      { key: 'discovery.forYou',            label: 'For You (FYP)',      desc: 'The main TikTok feed of algorithmically suggested videos.',        warning: 'Disabling the FYP hides the page but does not block the underlying algorithm.' },
      { key: 'discovery.search',            label: 'Search',              desc: 'Allows searching for content, creators, hashtags or sounds.' },
      { key: 'discovery.explore',           label: 'Explore',             desc: 'Browse trending content and discover new creators.' },
      { key: 'discovery.suggestedCreators', label: 'Suggested Creators',  desc: 'Profiles TikTok recommends below or alongside videos.' },
      { key: 'discovery.hashtags',          label: 'Hashtags',            desc: 'Clickable hashtag links that lead to topic pages.' },
      { key: 'discovery.sounds',            label: 'Sounds & Music',      desc: 'Access to sound pages and audio-based discovery.' },
    ]
  },
  {
    group: 'Social',
    controls: [
      { key: 'social.comments',       label: 'Comments',        desc: 'Viewing and posting comments on videos.' },
      { key: 'social.directMessages', label: 'Direct Messages', desc: 'Private messaging with other TikTok users.' },
      { key: 'social.following',      label: 'Following',       desc: 'Ability to follow new creators.' },
      { key: 'social.followers',      label: 'Followers',       desc: 'Viewing follower lists on profiles.' },
      { key: 'social.likes',          label: 'Likes',           desc: 'Liking videos and viewing like counts.' },
      { key: 'social.reposts',        label: 'Reposts',         desc: 'Re-sharing videos to the child\'s followers.' },
    ]
  },
  {
    group: 'LIVE',
    controls: [
      { key: 'live.liveStreams',    label: 'LIVE Streams',   desc: 'Accessing and watching TikTok LIVE broadcasts.',  warning: 'LIVE content is unmoderated and real-time. Disabling is strongly recommended.' },
      { key: 'live.liveDiscovery', label: 'LIVE Discovery', desc: 'The LIVE tab and LIVE sections in the feed.' },
    ]
  },
  {
    group: 'Profile',
    controls: [
      { key: 'profile.profilePictures', label: 'Profile Pictures', desc: 'Displaying profile images on creator pages and comments.' },
      { key: 'profile.externalLinks',   label: 'External Links',   desc: 'Links in creator bios that navigate away from TikTok.', warning: 'External links can lead to unreviewed content outside TikCare\'s controls.' },
    ]
  },
];

const CREATORS = CATALOG as CatalogCreator[];

// ── Helpers ──────────────────────────────────────────────────────────────

function getNestedValue(obj: FeatureToggles, path: string): boolean {
  const [top, sub] = path.split('.');
  const group = obj[top as keyof FeatureToggles] as Record<string, boolean>;
  return group[sub] ?? false;
}

function setNestedValue(obj: FeatureToggles, path: string, value: boolean): FeatureToggles {
  const [top, sub] = path.split('.');
  return {
    ...obj,
    [top]: { ...(obj[top as keyof FeatureToggles] as Record<string, boolean>), [sub]: value }
  } as FeatureToggles;
}

function interestLabel(id: string): string {
  return INTERESTS.find(i => i.id === id)?.label ?? id;
}

function signalBadgeHtml(strength: SignalStrength): string {
  const map: Record<SignalStrength, { cls: string; label: string }> = {
    STRONG:   { cls: 'tc-signal--strong',   label: 'Strong signal'   },
    MODERATE: { cls: 'tc-signal--moderate', label: 'Moderate signal' },
    WEAK:     { cls: 'tc-signal--weak',     label: 'Weak signal'     },
  };
  const { cls, label } = map[strength];
  return `<span class="tc-signal-badge ${cls}">${label}</span>`;
}

function reviewStatusHtml(status: 'APPROVED' | 'PENDING' | 'REJECTED'): string {
  if (status === 'APPROVED') return `<span class="tc-creator-status tc-creator-status--approved">✓ TikCare Reviewed</span>`;
  if (status === 'PENDING')  return `<span class="tc-creator-status tc-creator-status--pending">⏳ Review Pending</span>`;
  return `<span class="tc-creator-status tc-creator-status--rejected">✕ Rejected</span>`;
}

// ── Dashboard controller ──────────────────────────────────────────────────

class Dashboard {
  private state!: TikCareState;
  private saveMsg!: HTMLElement;
  private saveTimeout: ReturnType<typeof setTimeout> | null = null;

  // Interests section state
  private demoSignals: InterestSignal[] = [];
  private demoImported = false;

  // Evidence drawer state
  private drawerOpen = false;
  private currentEvidenceCreator: CatalogCreator | null = null;

  async init() {
    this.state = await StorageManager.loadState();
    if (this.state.mode !== 'PARENT_DASHBOARD') { window.close(); return; }

    this.saveMsg = document.getElementById('tc-save-msg')!;

    this.setupNav();
    this.setupLockButtons();
    this.renderInterests();
    this.renderControls();
    this.renderCreators();
    this.setupEvidenceDrawer();
    this.setupSaveButton();

    StorageManager.onChange((newState) => {
      this.state = newState;
      if (newState.mode !== 'PARENT_DASHBOARD') { window.close(); }
    });
  }

  // ── Navigation ─────────────────────────────────────────────────────────

  private setupNav() {
    const items = document.querySelectorAll<HTMLButtonElement>('.tc-nav-item');
    items.forEach(btn => {
      btn.addEventListener('click', () => {
        items.forEach(b => { b.classList.remove('active'); b.removeAttribute('aria-current'); });
        btn.classList.add('active');
        btn.setAttribute('aria-current', 'page');
        this.activateSection(btn.dataset.section!);
      });
    });
  }

  private activateSection(id: string) {
    document.querySelectorAll<HTMLElement>('.tc-section').forEach(s => s.classList.remove('active'));
    document.getElementById(`section-${id}`)?.classList.add('active');
  }

  // ── Lock ───────────────────────────────────────────────────────────────

  private setupLockButtons() {
    document.querySelectorAll<HTMLButtonElement>('.tc-lock-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        await StorageManager.setMode('CHILD_MODE');
        window.close();
      });
    });
  }

  // ── Interests ──────────────────────────────────────────────────────────

  private renderInterests() {
    this.renderInterestGrid();
    this.setupDemoImportButton();
  }

  private renderInterestGrid() {
    const grid = document.getElementById('interests-grid')!;
    grid.innerHTML = '';
    const selected = new Set(this.state.interests.selectedCategories);

    INTERESTS.forEach(interest => {
      const signal = this.demoSignals.find(s => s.interestId === interest.id);
      const isSelected = selected.has(interest.id);

      const card = document.createElement('button');
      card.className = 'tc-interest-card' + (isSelected ? ' selected' : '');
      card.setAttribute('type', 'button');
      card.setAttribute('aria-pressed', String(isSelected));
      card.setAttribute('aria-label', `${interest.label}: ${interest.desc}`);
      card.dataset.id = interest.id;

      card.innerHTML = `
        <span class="tc-interest-icon" aria-hidden="true">${interest.icon}</span>
        <span class="tc-interest-name">${interest.label}</span>
        <span class="tc-interest-desc">${interest.desc}</span>
        ${signal ? signalBadgeHtml(signal.strength) : ''}
        <span class="tc-interest-check" aria-hidden="true">✓</span>
      `;

      card.addEventListener('click', () => {
        const nowSelected = card.classList.toggle('selected');
        card.setAttribute('aria-pressed', String(nowSelected));
        if (nowSelected) selected.add(interest.id); else selected.delete(interest.id);
        this.state = { ...this.state, interests: { selectedCategories: Array.from(selected) } };
        this.autosave();
        // Re-render the creators list filtered by new selection
        this.renderCreators();
      });

      grid.appendChild(card);
    });
  }

  private setupDemoImportButton() {
    const btn = document.getElementById('btn-import-demo');
    if (!btn) return;
    btn.addEventListener('click', async () => {
      btn.setAttribute('disabled', 'true');
      btn.textContent = 'Loading…';
      const source = new DemoAccountSource();
      const result = await source.fetchSignals();
      this.demoSignals = result.signals;
      this.demoImported = true;

      // Show the suggested panel
      const panel = document.getElementById('suggested-interests-panel')!;
      const list  = document.getElementById('suggested-list')!;
      panel.style.display = 'block';
      list.innerHTML = '';

      result.signals.forEach(sig => {
        const row = document.createElement('div');
        row.className = 'tc-suggested-row';
        row.innerHTML = `
          <span class="tc-suggested-name">${interestLabel(sig.interestId)}</span>
          ${signalBadgeHtml(sig.strength)}
        `;
        list.appendChild(row);
      });

      btn.textContent = 'Signals loaded';
      // Re-render grid to show signal badges on cards
      this.renderInterestGrid();
    });
  }

  // ── Controls ───────────────────────────────────────────────────────────

  private renderControls() {
    const card = document.getElementById('controls-card')!;
    card.innerHTML = '';

    CONTROL_GROUPS.forEach(group => {
      const label = document.createElement('div');
      label.className = 'tc-group-label';
      label.textContent = group.group;
      card.appendChild(label);

      group.controls.forEach(ctrl => {
        const row = document.createElement('div');
        row.className = 'tc-control-row';
        const val = getNestedValue(this.state.features, ctrl.key);
        const id  = `toggle-${ctrl.key.replace('.', '-')}`;

        row.innerHTML = `
          <div class="tc-control-info">
            <label class="tc-control-label" for="${id}">${ctrl.label}</label>
            <div class="tc-control-desc">${ctrl.desc}</div>
            ${ctrl.warning ? `<div class="tc-control-warning" role="note">⚠ ${ctrl.warning}</div>` : ''}
          </div>
          <div class="tc-toggle-wrap">
            <label class="tc-toggle" aria-label="${ctrl.label}">
              <input type="checkbox" id="${id}" ${val ? 'checked' : ''} role="switch" aria-checked="${val}">
              <span class="tc-toggle-track"></span>
            </label>
          </div>
        `;

        const cb = row.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
        cb.addEventListener('change', () => {
          this.state = { ...this.state, features: setNestedValue(this.state.features, ctrl.key, cb.checked) };
          cb.setAttribute('aria-checked', String(cb.checked));
          this.autosave();
        });

        card.appendChild(row);
      });
    });
  }

  // ── Creators ───────────────────────────────────────────────────────────

  private renderCreators() {
    const container = document.getElementById('creators-container')!;
    container.innerHTML = '';
    const approved = new Set(this.state.creators.approvedCreatorUsernames);
    const selectedInterests = this.state.interests.selectedCategories;

    // Determine which creators to show: filtered by selected interests if any are chosen
    const filtered = selectedInterests.length > 0
      ? CREATORS.filter(c => selectedInterests.includes(c.category))
      : CREATORS;

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="tc-creators-empty">
          <div class="tc-coming-soon-icon" aria-hidden="true">🔍</div>
          <p>Select at least one interest in the <strong>Interests</strong> tab to see matching creators.</p>
        </div>
      `;
      return;
    }

    // Approved creators section
    const approvedCreators = filtered.filter(c => approved.has(c.username));
    // Candidate creators (not yet approved)
    const candidates = filtered.filter(c => !approved.has(c.username));

    if (approvedCreators.length > 0) {
      const hdr = document.createElement('div');
      hdr.className = 'tc-creators-section-header';
      hdr.innerHTML = `<span class="tc-creators-section-title">Approved Creators</span><span class="tc-creators-count">${approvedCreators.length}</span>`;
      container.appendChild(hdr);
      approvedCreators.forEach(c => container.appendChild(this.buildCreatorCard(c, true)));
    }

    if (candidates.length > 0) {
      const hdr = document.createElement('div');
      hdr.className = 'tc-creators-section-header';
      hdr.innerHTML = `<span class="tc-creators-section-title">Available to Approve</span><span class="tc-creators-count">${candidates.length}</span>`;
      container.appendChild(hdr);
      candidates.forEach(c => container.appendChild(this.buildCreatorCard(c, false)));
    }
  }

  private buildCreatorCard(creator: CatalogCreator, isApproved: boolean): HTMLElement {
    const card = document.createElement('div');
    card.className = 'tc-creator-card' + (isApproved ? ' tc-creator-card--approved' : '');
    card.dataset.username = creator.username;

    const interestMeta = INTERESTS.find(i => i.id === creator.category);
    const categoryLabel = interestMeta ? `${interestMeta.icon} ${interestMeta.label}` : creator.category;

    card.innerHTML = `
      <div class="tc-creator-card-main">
        <div class="tc-creator-avatar" aria-hidden="true">${creator.displayName.charAt(0)}</div>
        <div class="tc-creator-info">
          <div class="tc-creator-name">${creator.displayName}</div>
          <div class="tc-creator-username">@${creator.username}</div>
          <div class="tc-creator-meta">
            <span class="tc-creator-category">${categoryLabel}</span>
            ${reviewStatusHtml(creator.reviewStatus)}
            ${creator.demoData ? '<span class="tc-demo-badge">DEMO DATA</span>' : ''}
          </div>
          <p class="tc-creator-desc">${creator.description}</p>
        </div>
      </div>
      <div class="tc-creator-card-actions">
        <button class="tc-btn-evidence" data-username="${creator.username}" aria-label="View evidence for ${creator.displayName}">
          View Evidence
        </button>
        ${isApproved
          ? `<button class="tc-btn-unapprove tc-btn-danger" data-username="${creator.username}" aria-label="Remove approval for ${creator.displayName}">Remove</button>`
          : `<button class="tc-btn-approve tc-btn-approve-action" data-username="${creator.username}" ${creator.reviewStatus !== 'APPROVED' ? 'disabled title="Only TikCare Reviewed creators can be approved"' : ''} aria-label="Approve ${creator.displayName}">Approve</button>`
        }
      </div>
    `;

    // Evidence button
    card.querySelector<HTMLButtonElement>('.tc-btn-evidence')!.addEventListener('click', () => {
      this.openEvidence(creator);
    });

    // Approve / unapprove
    if (isApproved) {
      card.querySelector<HTMLButtonElement>('.tc-btn-unapprove')!.addEventListener('click', async () => {
        const updated = this.state.creators.approvedCreatorUsernames.filter(u => u !== creator.username);
        this.state = { ...this.state, creators: { approvedCreatorUsernames: updated } };
        await StorageManager.updateApprovedCreators({ approvedCreatorUsernames: updated });
        this.renderCreators();
        this.showSavedMsg('Creator removed');
      });
    } else {
      const approveBtn = card.querySelector<HTMLButtonElement>('.tc-btn-approve-action');
      approveBtn?.addEventListener('click', async () => {
        const updated = [...this.state.creators.approvedCreatorUsernames, creator.username];
        this.state = { ...this.state, creators: { approvedCreatorUsernames: updated } };
        await StorageManager.updateApprovedCreators({ approvedCreatorUsernames: updated });
        this.renderCreators();
        this.showSavedMsg(`${creator.displayName} approved`);
      });
    }

    return card;
  }

  // ── Evidence Drawer ────────────────────────────────────────────────────

  private setupEvidenceDrawer() {
    const overlay = document.getElementById('evidence-overlay')!;
    const closeBtn = document.getElementById('evidence-close-btn')!;

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.closeEvidence();
    });
    closeBtn.addEventListener('click', () => this.closeEvidence());

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.drawerOpen) this.closeEvidence();
    });
  }

  private openEvidence(creator: CatalogCreator) {
    this.currentEvidenceCreator = creator;
    this.drawerOpen = true;

    const overlay = document.getElementById('evidence-overlay')!;
    const drawer  = document.getElementById('evidence-drawer')!;

    // Populate drawer
    document.getElementById('evidence-creator-name')!.textContent   = creator.displayName;
    document.getElementById('evidence-creator-handle')!.textContent = `@${creator.username}`;

    const ev = creator.evidence;
    const approved = this.state.creators.approvedCreatorUsernames.includes(creator.username);
    const interestMeta = INTERESTS.find(i => i.id === creator.category);

    document.getElementById('evidence-body')!.innerHTML = `
      ${creator.demoData ? `<div class="tc-evidence-demo-banner" role="note">⚠ DEMO REVIEW DATA — This is sample data only. No real TikTok profile has been reviewed.</div>` : ''}

      <div class="tc-evidence-section">
        <div class="tc-evidence-row">
          <span class="tc-evidence-label">Review Status</span>
          <span>${reviewStatusHtml(creator.reviewStatus)}</span>
        </div>
        <div class="tc-evidence-row">
          <span class="tc-evidence-label">Review Date</span>
          <span class="tc-evidence-value">${creator.reviewDate}</span>
        </div>
        <div class="tc-evidence-row">
          <span class="tc-evidence-label">Category</span>
          <span class="tc-evidence-value">${interestMeta ? `${interestMeta.icon} ${interestMeta.label}` : creator.category}</span>
        </div>
        <div class="tc-evidence-row">
          <span class="tc-evidence-label">Profile Reviewed</span>
          <span class="tc-evidence-value ${ev.profileReviewed ? 'tc-ev-yes' : 'tc-ev-no'}">${ev.profileReviewed ? '✓ Yes' : '✗ No'}</span>
        </div>
        <div class="tc-evidence-row">
          <span class="tc-evidence-label">Recent Content Reviewed</span>
          <span class="tc-evidence-value ${ev.recentContentReviewed ? 'tc-ev-yes' : 'tc-ev-no'}">${ev.recentContentReviewed ? '✓ Yes' : '✗ Not yet'}</span>
        </div>
        <div class="tc-evidence-row">
          <span class="tc-evidence-label">External Links Reviewed</span>
          <span class="tc-evidence-value ${ev.externalLinksReviewed ? 'tc-ev-yes' : 'tc-ev-no'}">${ev.externalLinksReviewed ? '✓ Yes' : '✗ Not yet'}</span>
        </div>
      </div>

      <div class="tc-evidence-section">
        <div class="tc-evidence-section-title">Reviewer Notes</div>
        <p class="tc-evidence-notes">${ev.reviewerNotes}</p>
      </div>

      <div class="tc-evidence-section">
        <div class="tc-evidence-section-title">Recent Content Sample</div>
        <p class="tc-evidence-notes">${ev.contentSample}</p>
      </div>

      <div class="tc-evidence-section tc-evidence-disclaimer">
        <p>TikCare Reviewed means a human reviewer assessed this creator's publicly visible profile and recent content at the stated review date. It does not mean the creator is guaranteed to be safe, free from all risk, or appropriate for every child. Content on TikTok changes frequently. Review this information alongside your own judgement.</p>
      </div>
    `;

    // Approve/unapprove action inside drawer
    const actionArea = document.getElementById('evidence-action')!;
    actionArea.innerHTML = '';
    if (creator.reviewStatus === 'APPROVED') {
      if (approved) {
        const btn = document.createElement('button');
        btn.className = 'tc-btn tc-btn--danger';
        btn.textContent = 'Remove Approval';
        btn.addEventListener('click', async () => {
          const updated = this.state.creators.approvedCreatorUsernames.filter(u => u !== creator.username);
          this.state = { ...this.state, creators: { approvedCreatorUsernames: updated } };
          await StorageManager.updateApprovedCreators({ approvedCreatorUsernames: updated });
          this.renderCreators();
          this.closeEvidence();
          this.showSavedMsg('Creator removed');
        });
        actionArea.appendChild(btn);
      } else {
        const btn = document.createElement('button');
        btn.className = 'tc-btn tc-btn--primary';
        btn.textContent = 'Approve Creator';
        btn.addEventListener('click', async () => {
          const updated = [...this.state.creators.approvedCreatorUsernames, creator.username];
          this.state = { ...this.state, creators: { approvedCreatorUsernames: updated } };
          await StorageManager.updateApprovedCreators({ approvedCreatorUsernames: updated });
          this.renderCreators();
          this.closeEvidence();
          this.showSavedMsg(`${creator.displayName} approved`);
        });
        actionArea.appendChild(btn);
      }
    }

    overlay.classList.add('active');
    document.getElementById('evidence-close-btn')!.focus();
  }

  private closeEvidence() {
    this.drawerOpen = false;
    this.currentEvidenceCreator = null;
    document.getElementById('evidence-overlay')!.classList.remove('active');
  }

  // ── Save ───────────────────────────────────────────────────────────────

  private setupSaveButton() {
    document.getElementById('tc-save-btn')!.addEventListener('click', () => this.saveNow());
  }

  private async autosave() {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveMsg.textContent = 'Unsaved changes…';
    this.saveMsg.classList.remove('saved');
    this.saveTimeout = setTimeout(() => this.saveNow(), 1200);
  }

  private async saveNow() {
    if (this.saveTimeout) { clearTimeout(this.saveTimeout); this.saveTimeout = null; }
    await StorageManager.saveState({ features: this.state.features, interests: this.state.interests });
    this.showSavedMsg('Settings saved');
  }

  private showSavedMsg(msg: string) {
    this.saveMsg.textContent = `✓ ${msg}`;
    this.saveMsg.classList.add('saved');
    setTimeout(() => {
      this.saveMsg.textContent = 'Changes are saved automatically.';
      this.saveMsg.classList.remove('saved');
    }, 3000);
  }
}

// ── Boot ─────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  new Dashboard().init();
});
