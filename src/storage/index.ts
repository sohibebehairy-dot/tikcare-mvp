import { TikCareState, Mode, FeatureToggles, InterestConfiguration, CreatorAllowlist } from '../types';

const STORAGE_KEY = 'tikcare_state';

const defaultState: TikCareState = {
  setupComplete: false,
  mode: 'UNINITIALIZED', // Mapped to UNINITIALIZED logically before first setup
  auth: {
    isConfigured: false,
    pinHash: '',
    salt: ''
  },
  features: {
    discovery: { forYou: false, search: false, explore: false, suggestedCreators: false, hashtags: false, sounds: false },
    social: { comments: false, directMessages: false, following: false, followers: false, likes: false, reposts: false },
    live: { liveStreams: false, liveDiscovery: false },
    profile: { profilePictures: false, externalLinks: false }
  },
  interests: {
    selectedCategories: []
  },
  creators: {
    approvedCreatorUsernames: []
  }
};

export class StorageManager {
  
  static async loadState(): Promise<TikCareState> {
    const data = await chrome.storage.local.get(STORAGE_KEY);
    if (!data[STORAGE_KEY]) {
      return { ...defaultState };
    }
    return data[STORAGE_KEY] as TikCareState;
  }

  static async saveState(state: Partial<TikCareState>): Promise<void> {
    const currentState = await this.loadState();
    const newState = { ...currentState, ...state };
    await chrome.storage.local.set({ [STORAGE_KEY]: newState });
  }

  static async setupPin(pinHash: string, salt: string): Promise<void> {
    const state = await this.loadState();
    await this.saveState({
      setupComplete: true,
      auth: { isConfigured: true, pinHash, salt }
    });
  }

  static async verifyPin(pinHashAttempt: string): Promise<boolean> {
    const state = await this.loadState();
    if (!state.auth.isConfigured) return false;
    return pinHashAttempt === state.auth.pinHash;
  }


  static async updateControls(features: FeatureToggles): Promise<void> {
    await this.saveState({ features });
  }

  static async updateInterests(interests: InterestConfiguration): Promise<void> {
    await this.saveState({ interests });
  }

  static async updateApprovedCreators(creators: CreatorAllowlist): Promise<void> {
    await this.saveState({ creators });
  }

  static async setMode(mode: Mode): Promise<void> {
    await this.saveState({ mode });
  }

  static async getMode(): Promise<Mode> {
    const state = await this.loadState();
    return state.mode || 'LOCKED';
  }

  static async setLocked(isLocked: boolean): Promise<void> {
    await this.setMode(isLocked ? 'LOCKED' : 'CHILD_MODE');
  }

  static async getLocked(): Promise<boolean> {
    const mode = await this.getMode();
    return mode === 'LOCKED';
  }

  static async resetConfiguration(): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEY]: defaultState });
  }
  
  static onChange(callback: (newState: TikCareState) => void) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local' && changes[STORAGE_KEY]) {
        callback(changes[STORAGE_KEY].newValue as TikCareState);
      }
    });
  }
}
