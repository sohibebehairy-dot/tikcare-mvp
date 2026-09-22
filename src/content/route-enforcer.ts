import { TikCareState } from '../types';

export function evaluateRoute(url: string, state: TikCareState): 'ALLOW' | 'BLOCK' {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname.toLowerCase();

    // Default allowed pages
    if (path === '/' || path === '/foryou') return state.features.discovery.forYou ? 'ALLOW' : 'BLOCK';
    if (path.startsWith('/explore')) return state.features.discovery.explore ? 'ALLOW' : 'BLOCK';
    if (path.startsWith('/search')) return state.features.discovery.search ? 'ALLOW' : 'BLOCK';
    if (path.startsWith('/live')) return state.features.live.liveStreams ? 'ALLOW' : 'BLOCK';
    if (path.startsWith('/messages')) return state.features.social.directMessages ? 'ALLOW' : 'BLOCK';
    if (path.startsWith('/following')) return state.features.social.following ? 'ALLOW' : 'BLOCK';
    if (path.startsWith('/tag/')) return state.features.discovery.hashtags ? 'ALLOW' : 'BLOCK';
    if (path.startsWith('/music/')) return state.features.discovery.sounds ? 'ALLOW' : 'BLOCK';
    
    // Creator profile /@username or video /@username/video/...
    const creatorMatch = path.match(/^\/@([a-zA-Z0-9_.-]+)/);
    if (creatorMatch && creatorMatch[1]) {
      const username = creatorMatch[1].toLowerCase();
      const approvedUsernames = state.creators.approvedCreatorUsernames.map(u => u.toLowerCase());
      if (approvedUsernames.includes(username)) {
        return 'ALLOW';
      }
      return 'BLOCK';
    }

    // Explicitly block any other unknown routes (deny-by-default)
    return 'BLOCK';
  } catch (e) {
    // If URL parsing fails, fail secure
    console.error('TikCare: Failed to parse URL for route evaluation', e);
    return 'BLOCK';
  }
}
