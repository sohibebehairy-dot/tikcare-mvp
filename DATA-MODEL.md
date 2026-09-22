# Data Model

This document outlines the data structures stored in `chrome.storage.local`.

## Global State

```typescript
interface TikCareState {
  auth: AuthState;
  features: FeatureToggles;
  interests: InterestConfiguration;
  creators: CreatorAllowlist;
  mode: Mode;
}

type Mode = 'LOCKED' | 'PARENT_DASHBOARD' | 'CHILD_MODE';
```

## Authentication

```typescript
interface AuthState {
  isConfigured: boolean; // Has the parent set up a PIN?
  pinHash: string;       // SHA-256 hash of the PIN
  salt: string;          // Cryptographic salt
}
```

## Feature Toggles

```typescript
interface FeatureToggles {
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
```

## Interests

```typescript
interface InterestConfiguration {
  selectedCategories: string[]; // e.g., ['STEM', 'Education', 'Art & Design']
}
```

## Creator Model

```typescript
interface Creator {
  id: string;
  username: string;
  displayName: string;
  category: string;
  description: string;
  reviewStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewDate: string; // ISO 8601
  evidence: string;
  sourceProfile: string; // URL to profile
}

interface CreatorAllowlist {
  approvedCreatorUsernames: string[]; // List of explicitly allowed usernames
}
```
