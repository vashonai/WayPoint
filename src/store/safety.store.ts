import { create } from 'zustand';

/**
 * Safety state — panic and Share My Ride.
 *
 * Persisted in production. Once panic has fired, the app must relaunch INTO
 * the incident screen: a crash mid-incident that looks like nothing happened
 * is the worst possible failure mode for this feature.
 */

export type ShareDuration = 'this_trip' | 'until_i_stop' | 'time_limit';

export type TrustedContact = {
  id: string;
  name: string;
  relationship: string;
  initials: string;
};

type SafetyState = {
  /** Timestamp panic was fired, or null. Persisted first, before any network. */
  panicFiredAt: number | null;
  panicAcknowledged: boolean;

  /**
   * Proposal §2.1 — OFF BY DEFAULT. This must never be persisted as a user
   * preference that silently re-arms on the next trip. Each trip is a fresh
   * decision unless the passenger explicitly chose 'until_i_stop'.
   */
  isSharing: boolean;
  shareDuration: ShareDuration;
  trustedContact: TrustedContact | null;

  firePanic: () => void;
  acknowledgePanic: () => void;
  clearPanic: () => void;

  startSharing: (contact: TrustedContact, duration: ShareDuration) => void;
  /** Optimistic and immediate — never waits on a round trip to revoke access. */
  stopSharing: () => void;
  setTrustedContact: (contact: TrustedContact | null) => void;
  setShareDuration: (duration: ShareDuration) => void;
  /** Called at trip end. Sharing expires automatically unless 'until_i_stop'. */
  onTripEnded: () => void;
};

export const useSafetyStore = create<SafetyState>((set, get) => ({
  panicFiredAt: null,
  panicAcknowledged: false,
  isSharing: false,
  shareDuration: 'this_trip',
  trustedContact: null,

  firePanic: () => set({ panicFiredAt: Date.now(), panicAcknowledged: false }),
  acknowledgePanic: () => set({ panicAcknowledged: true }),
  clearPanic: () => set({ panicFiredAt: null, panicAcknowledged: false }),

  startSharing: (trustedContact, shareDuration) =>
    set({ isSharing: true, trustedContact, shareDuration }),
  stopSharing: () => set({ isSharing: false }),
  setTrustedContact: (trustedContact) => set({ trustedContact }),
  setShareDuration: (shareDuration) => set({ shareDuration }),

  onTripEnded: () => {
    if (get().shareDuration !== 'until_i_stop') set({ isSharing: false });
  },
}));
