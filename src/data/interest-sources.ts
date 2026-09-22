/**
 * interest-sources.ts
 *
 * Future-ready architecture for interest signal ingestion.
 *
 * In the MVP, only DemoAccountSource is implemented.
 * Future integrations (TikTok Data Portability API, following lists, etc.)
 * should implement the AccountInterestSource interface and be registered here.
 */

// ── Core interface ─────────────────────────────────────────────────────────

/** Signal strength for a suggested interest */
export type SignalStrength = 'STRONG' | 'MODERATE' | 'WEAK';

/** A single interest suggestion produced by a source */
export interface InterestSignal {
  interestId: string;
  strength: SignalStrength;
  sourceLabel: string;  // Human-readable description of why this was inferred
}

/** Result from any interest source */
export interface InterestSourceResult {
  sourceId: string;
  sourceName: string;
  isDemoData: boolean;         // MUST be true for any demo/sample data
  signals: InterestSignal[];
  importedAt: string;          // ISO 8601
}

/**
 * Interface that any future interest source must implement.
 * Examples of future sources:
 *   - TikTokDataPortabilitySource (uses official Data Export API)
 *   - FollowingListSource (parses exported following list)
 *   - SearchHistorySource (uses exported search history)
 *   - FavoriteContentSource (uses exported favourite videos)
 */
export interface AccountInterestSource {
  readonly sourceId: string;
  readonly sourceName: string;
  /**
   * Fetch or compute interest signals.
   * For real sources, this would parse an imported data file.
   * Must NEVER call private/undocumented TikTok APIs.
   */
  fetchSignals(): Promise<InterestSourceResult>;
}

// ── MVP Demo Source ────────────────────────────────────────────────────────

/**
 * DemoAccountSource
 *
 * Returns hardcoded sample signals.
 * Clearly labelled as demo data — does not represent any real TikTok account.
 * Replace or supplement with a real AccountInterestSource implementation in the future.
 */
export class DemoAccountSource implements AccountInterestSource {
  readonly sourceId = 'demo-account-v1';
  readonly sourceName = 'Demo Account Signals';

  async fetchSignals(): Promise<InterestSourceResult> {
    return {
      sourceId:    this.sourceId,
      sourceName:  this.sourceName,
      isDemoData:  true,   // ← ALWAYS true for this source
      importedAt:  new Date().toISOString(),
      signals: [
        { interestId: 'sports',     strength: 'STRONG',   sourceLabel: 'Frequently watched sports content' },
        { interestId: 'gaming',     strength: 'STRONG',   sourceLabel: 'High engagement with gaming creators' },
        { interestId: 'technology', strength: 'MODERATE', sourceLabel: 'Occasional technology video views' },
        { interestId: 'music',      strength: 'WEAK',     sourceLabel: 'Few interactions with music content' },
      ]
    };
  }
}

// ── Placeholder stubs for future sources ─────────────────────────────────

/**
 * Future: TikTok Data Portability API source.
 * Requires user to export their data from TikTok settings and import the file here.
 * NOT implemented in MVP.
 */
export class TikTokDataPortabilitySource implements AccountInterestSource {
  readonly sourceId = 'tiktok-data-portability-v1';
  readonly sourceName = 'TikTok Data Export';

  async fetchSignals(): Promise<InterestSourceResult> {
    throw new Error('TikTokDataPortabilitySource is not implemented in this version.');
  }
}

/**
 * Future: Following list source.
 * Would analyse the creator categories a user follows.
 * NOT implemented in MVP.
 */
export class FollowingListSource implements AccountInterestSource {
  readonly sourceId = 'following-list-v1';
  readonly sourceName = 'Following List Analysis';

  async fetchSignals(): Promise<InterestSourceResult> {
    throw new Error('FollowingListSource is not implemented in this version.');
  }
}
