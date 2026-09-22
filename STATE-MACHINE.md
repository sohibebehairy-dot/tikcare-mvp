# State Machine

The extension operates across several primary states to ensure security and proper access control.

## States

1. **UNINITIALIZED**: The extension is newly installed. No parent PIN is set.
2. **LOCKED**: The default state when TikTok is opened. The lock overlay obscures all content.
3. **AUTH_REQUIRED**: The parent has initiated access and must enter their PIN.
4. **PARENT_DASHBOARD**: Authentication successful. The parent can modify settings, review creators, and manage the allowlist.
5. **CHILD_MODE**: The parent has finished configuration and explicitly activated child mode. The lock screen is removed, and the Policy Engine enforces restrictions.

## Transitions

- **UNINITIALIZED -> PARENT_DASHBOARD**: Upon first launch, prompt for PIN creation, then transition to dashboard.
- **LOCKED -> AUTH_REQUIRED**: Parent clicks "Parent Access" on the lock screen.
- **AUTH_REQUIRED -> PARENT_DASHBOARD**: Parent enters the correct PIN.
- **AUTH_REQUIRED -> LOCKED**: Parent cancels authentication or fails multiple times.
- **PARENT_DASHBOARD -> CHILD_MODE**: Parent clicks "LOCK" / "Enable Child Mode".
- **CHILD_MODE -> LOCKED**: Triggered by a session timeout, explicit lock command, or browser restart.

## Enforcement State Machine (Per Navigation)

When in `CHILD_MODE`, every SPA navigation triggers an evaluation state machine:

1. **EVALUATING**: A route change is detected. Content is temporarily hidden or blurred.
2. **RESOLVED_ALLOW**: The Policy Engine determines the route/creator is permitted. Content is revealed; DOM hiding rules are applied to restricted features (e.g., comments).
3. **RESOLVED_BLOCK**: The Policy Engine determines the route/creator is explicitly denied or not in the allowlist. The route is blocked (e.g., redirected to a safe internal page or the lock screen overlay is re-applied with a "Blocked" message).
