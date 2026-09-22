// Data models defined in DATA-MODEL.md

export type Mode = 'UNINITIALIZED' | 'LOCKED' | 'PARENT_DASHBOARD' | 'CHILD_MODE';
export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface AuthState {
  isConfigured: boolean; // Has the parent set up a PIN?
  pinHash: string;       // SHA-256 hash of the PIN
  salt: string;          // Cryptographic salt
}

export interface FeatureToggles {
  discovery: {
    forYou: boolean;
    search: boolean;
    explore: boolean;
    suggestedCreators: boolean;
    hashtags: boolean;
    sounds: boolean;
  };
  social: {
    comments: boolean;
    directMessages: boolean;
    following: boolean;
    followers: boolean;
    likes: boolean;
    reposts: boolean;
  };
  live: {
    liveStreams: boolean;
    liveDiscovery: boolean;
  };
  profile: {
    profilePictures: boolean;
    externalLinks: boolean;
  };
}

export interface InterestConfiguration {
  selectedCategories: string[]; // e.g., ['STEM', 'Education', 'Art & Design']
}

export interface Creator {
  id: string;
  username: string;
  displayName: string;
  category: string;
  description: string;
  reviewStatus: ReviewStatus;
  reviewDate: string; // ISO 8601
  evidence: string;
  sourceProfile: string; // URL to profile
}

export interface CreatorAllowlist {
  approvedCreatorUsernames: string[]; // List of explicitly allowed usernames
}

export interface TikCareState {
  setupComplete: boolean;
  mode: Mode;
  auth: AuthState;
  features: FeatureToggles;
  interests: InterestConfiguration;
  creators: CreatorAllowlist;
}
