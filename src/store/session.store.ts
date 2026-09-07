import { create } from 'zustand';

/**
 * Session and persona.
 *
 * `mode` is deliberately a MODE, not an account type. Drivers take rides too,
 * and the Phase 3 dispute view needs both sides of a trip in one record —
 * modelling driver as a separate account would force a double sign-up and
 * split trip history permanently.
 */

export type AppMode = 'passenger' | 'driver';

export type Session = {
  userId: string;
  displayName: string;
  phone: string;
};

type SessionState = {
  session: Session | null;
  mode: AppMode;
  /** Layers 1-3 of driver verification are complete and approved (§2.5). */
  isDriverVerified: boolean;
  /** True until the session has been restored from storage. Holds the splash. */
  isHydrating: boolean;

  signIn: (session: Session) => void;
  signOut: () => void;
  setMode: (mode: AppMode) => void;
  setDriverVerified: (verified: boolean) => void;
  finishHydrating: () => void;
};

export const useSessionStore = create<SessionState>((set) => ({
  session: null,
  mode: 'passenger',
  isDriverVerified: false,
  isHydrating: true,

  signIn: (session) => set({ session }),
  signOut: () => set({ session: null, mode: 'passenger', isDriverVerified: false }),
  setMode: (mode) => set({ mode }),
  setDriverVerified: (isDriverVerified) => set({ isDriverVerified }),
  finishHydrating: () => set({ isHydrating: false }),
}));
