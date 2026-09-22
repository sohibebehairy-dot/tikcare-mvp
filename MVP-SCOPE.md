# MVP Scope (12-Hour Target)

## In Scope (MUST BUILD)

- **Extension Framework**: Chrome/Edge Manifest V3 setup.
- **Environment Detection**: Identifying TikTok Web domain and context.
- **Immediate Lock Screen**: Obscuring content immediately upon load.
- **Parent Authentication**: Basic PIN setup and validation (hashed).
- **Parent Dashboard**: Polished, intuitive UI for configuration.
- **Feature Toggles**: ON/OFF states for Discovery, Social, LIVE, and Profile features.
- **Interest Categories**: Selection UI for predefined topics.
- **Creator Catalog**: A hardcoded, local JSON array of ~10-20 sample reviewed creators.
- **Creator Approval Flow**: UI to view evidence and explicitly add creators to the allowlist.
- **Policy Engine**: Core logic implementing the deny-by-default rule.
- **Route Blocking**: Preventing access via direct URL manipulation.
- **DOM Enforcement**: CSS/MutationObserver to hide disabled UI elements.
- **Navigation Detection**: Handling SPA routing robustly.
- **State Management**: Using `chrome.storage.local`.
- **Child Mode**: The operational state enforcing the rules.

## Out of Scope (DO NOT BUILD)

- Backend infrastructure or cloud databases.
- Subscription, payment, or licensing systems.
- Native mobile applications (iOS/Android).
- AI integration within the extension itself.
- AI video moderation or on-the-fly content analysis.
- Integration with private or public TikTok APIs.
- Analytics or telemetry.
- Child browsing history tracking/server reporting.
- Complex OAuth or remote authentication infrastructure.
