import { create } from 'zustand';

import { transition, reconcile, type TripEvent, type TripPhase } from '../features/trip';

/**
 * Ephemeral trip state.
 *
 * The trip RECORD (driver, vehicle, fare) is server-owned and belongs in
 * TanStack Query. Only the local phase mirror and pure UI state live here —
 * the ownership test is "if this phone went into Kingston Harbour, would the
 * server still know it?" No means Zustand.
 */

type TripState = {
  phase: TripPhase;
  activeTripId: string | null;
  /** Which snap point the trip sheet rests at. Pure UI, lost on relaunch. */
  sheetIndex: number;

  send: (event: TripEvent) => void;
  /** Applies an authoritative server phase. The server always wins. */
  syncServerPhase: (serverPhase: TripPhase) => void;
  setActiveTrip: (tripId: string | null) => void;
  setSheetIndex: (index: number) => void;
  reset: () => void;
};

export const useTripStore = create<TripState>((set) => ({
  phase: 'idle',
  activeTripId: null,
  sheetIndex: 1,

  send: (event) => set((s) => ({ phase: transition(s.phase, event) })),
  syncServerPhase: (serverPhase) => set((s) => ({ phase: reconcile(s.phase, serverPhase) })),
  setActiveTrip: (activeTripId) => set({ activeTripId }),
  setSheetIndex: (sheetIndex) => set({ sheetIndex }),
  reset: () => set({ phase: 'idle', activeTripId: null, sheetIndex: 1 }),
}));
