import { FeatureToggles } from '../types';

/**
 * Maps FeatureToggles keys to CSS selectors for TikTok Web elements.
 * 
 * IMPORTANT: TikTok's DOM is highly dynamic and subject to frequent changes.
 * These selectors are based on common semantic attributes, data-e2e identifiers,
 * and stable link destinations. They must be manually verified in Chrome.
 */
export const DOM_SELECTORS: Record<
  keyof FeatureToggles,
  Record<string, string[]>
> = {
  discovery: {
    forYou: [
      '[data-e2e="nav-foryou"]',
      'a[href*="/foryou"]'
    ],
    search: [
      'form[action="/search"]',
      '[data-e2e="search-box"]',
      'a[href*="/search"]'
    ],
    explore: [
      '[data-e2e="nav-explore"]',
      'a[href*="/explore"]'
    ],
    suggestedCreators: [
      '[data-e2e="suggest-account"]',
      '[data-e2e="recommend-user"]'
    ],
    hashtags: [
      'a[href*="/tag/"]'
    ],
    sounds: [
      'a[href*="/music/"]'
    ]
  },
  social: {
    comments: [
      '[data-e2e="comment-icon"]',
      '[data-e2e="video-comment"]',
      '[data-e2e="comment-list"]'
    ],
    directMessages: [
      '[data-e2e="nav-message"]',
      'a[href*="/messages"]'
    ],
    following: [
      '[data-e2e="nav-following"]',
      '[data-e2e="follow-button"]',
      'a[href*="/following"]'
    ],
    followers: [
      '[data-e2e="followers-count"]',
      'a[href*="/followers"]'
    ],
    likes: [
      '[data-e2e="like-icon"]',
      '[data-e2e="video-like"]'
    ],
    reposts: [
      '[data-e2e="share-icon"]', // Repost is usually under share
      '[data-e2e="repost-button"]'
    ]
  },
  live: {
    liveStreams: [
      '[data-e2e="nav-live"]',
      'a[href*="/live"]'
    ],
    liveDiscovery: [
      '[data-e2e="live-card"]',
      '[data-e2e="live-badge"]'
    ]
  },
  profile: {
    profilePictures: [
      '[data-e2e="user-avatar"]',
      'img[class*="avatar"]' // Unverified, highly volatile
    ],
    externalLinks: [
      'a[rel~="noopener"][target="_blank"]:not([href*="tiktok.com"])',
      '[data-e2e="user-link"]'
    ]
  }
};
