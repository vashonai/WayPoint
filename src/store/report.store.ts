import { create } from 'zustand';

import type { HazardType } from '../theme/tokens';

/**
 * Draft hazard report (Figure 2, left).
 *
 * Not server state until submitted — but it must survive the app being killed
 * mid-report at a roadside, so in production this store is persisted to MMKV.
 * The photo URI must be copied to documentDirectory before it is stored;
 * cache-directory URIs are evicted by iOS before a dead-zone retry completes.
 */

type ReportState = {
  type: HazardType | null;
  photoUri: string | null;
  note: string;
  /**
   * Proposal §2.3 — evidence submission requires the vehicle to be safely
   * stopped. Drivers are never encouraged to take photos while driving.
   */
  vehicleStopped: boolean;

  setType: (type: HazardType | null) => void;
  setPhoto: (uri: string | null) => void;
  setNote: (note: string) => void;
  setVehicleStopped: (stopped: boolean) => void;
  clear: () => void;
};

const EMPTY = { type: null, photoUri: null, note: '', vehicleStopped: false } as const;

export const useReportStore = create<ReportState>((set) => ({
  ...EMPTY,

  setType: (type) => set({ type }),
  setPhoto: (photoUri) => set({ photoUri }),
  setNote: (note) => set({ note }),
  setVehicleStopped: (vehicleStopped) => set({ vehicleStopped }),
  clear: () => set({ ...EMPTY }),
}));

/** A report may only be submitted once a type is chosen and the car is stopped. */
export function canSubmitReport(s: Pick<ReportState, 'type' | 'vehicleStopped'>): boolean {
  return s.type !== null && s.vehicleStopped;
}
