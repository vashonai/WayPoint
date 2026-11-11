import { create } from 'zustand';

import type { Place } from '../features/maps';

/**
 * The ride being put together, before it is a trip.
 *
 * Pickup and destination are the passenger's choices, not server records —
 * they become the trip's when the ride is confirmed, and the server snapshots
 * its own route from them. Until then they live here, and a relaunch starts
 * the search over.
 */
type BookingState = {
  pickup: Place | null;
  destination: Place | null;
  setPickup: (place: Place | null) => void;
  setDestination: (place: Place | null) => void;
  reset: () => void;
};

export const useBookingStore = create<BookingState>((set) => ({
  pickup: null,
  destination: null,
  setPickup: (pickup) => set({ pickup }),
  setDestination: (destination) => set({ destination }),
  reset: () => set({ pickup: null, destination: null }),
}));
