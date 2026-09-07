/**
 * The trip phase machine.
 *
 * A local mirror of the server's trip phase, so the UI can respond instantly
 * to a tap instead of waiting on a round trip. The server is always
 * authoritative: `reconcile()` exists so a Realtime patch or a refetch can
 * overwrite local optimism without the UI ever getting stuck.
 *
 * Pure — no React, no network. Fully unit tested.
 */

export type TripPhase =
  | 'idle'
  | 'quoting'
  | 'matching'
  | 'driver_assigned'
  | 'driver_arriving'
  | 'driver_waiting'
  | 'in_progress'
  | 'arrived'
  | 'completed'
  | 'cancelled';

export type TripEvent =
  | { type: 'REQUEST_QUOTE' }
  | { type: 'QUOTE_READY' }
  | { type: 'CONFIRM_RIDE' }
  | { type: 'DRIVER_MATCHED' }
  | { type: 'DRIVER_EN_ROUTE' }
  | { type: 'DRIVER_ARRIVED' }
  | { type: 'TRIP_STARTED' }
  | { type: 'DESTINATION_REACHED' }
  | { type: 'FARE_SETTLED' }
  | { type: 'CANCEL' }
  | { type: 'DRIVER_DROPPED' }
  | { type: 'FAILED' };

/**
 * Allowed transitions. Anything not listed is ignored rather than throwing —
 * a duplicate Realtime event or an out-of-order broadcast must not crash a
 * screen a passenger is mid-trip on.
 */
const TRANSITIONS: Record<TripPhase, Partial<Record<TripEvent['type'], TripPhase>>> = {
  idle: {
    REQUEST_QUOTE: 'quoting',
  },
  quoting: {
    QUOTE_READY: 'quoting',
    CONFIRM_RIDE: 'matching',
    CANCEL: 'idle',
    FAILED: 'idle',
  },
  matching: {
    DRIVER_MATCHED: 'driver_assigned',
    CANCEL: 'cancelled',
    FAILED: 'idle',
  },
  driver_assigned: {
    DRIVER_EN_ROUTE: 'driver_arriving',
    DRIVER_ARRIVED: 'driver_waiting',
    CANCEL: 'cancelled',
    /** A driver dropping before pickup returns the passenger to matching. */
    DRIVER_DROPPED: 'matching',
  },
  driver_arriving: {
    DRIVER_ARRIVED: 'driver_waiting',
    TRIP_STARTED: 'in_progress',
    CANCEL: 'cancelled',
    DRIVER_DROPPED: 'matching',
  },
  driver_waiting: {
    TRIP_STARTED: 'in_progress',
    CANCEL: 'cancelled',
    DRIVER_DROPPED: 'matching',
  },
  in_progress: {
    DESTINATION_REACHED: 'arrived',
    /**
     * No CANCEL here on purpose. A trip in progress is not cancellable from
     * the client — ending it early is a support and safety flow, not a button.
     */
  },
  arrived: {
    FARE_SETTLED: 'completed',
  },
  completed: {},
  cancelled: {},
};

/** Terminal phases. The trip channel unsubscribes once one is reached. */
export const TERMINAL_PHASES: TripPhase[] = ['completed', 'cancelled'];

export function isTerminal(phase: TripPhase): boolean {
  return TERMINAL_PHASES.includes(phase);
}

/** Applies an event. Returns the same phase when the event does not apply. */
export function transition(phase: TripPhase, event: TripEvent): TripPhase {
  return TRANSITIONS[phase][event.type] ?? phase;
}

export function can(phase: TripPhase, event: TripEvent['type']): boolean {
  return TRANSITIONS[phase][event] !== undefined;
}

/**
 * The server's phase always wins.
 *
 * Local optimism is a rendering convenience; when a broadcast or refetch
 * disagrees, we take the server value unmodified. The one exception is a
 * terminal local phase, which the server cannot walk back.
 */
export function reconcile(local: TripPhase, server: TripPhase): TripPhase {
  if (isTerminal(local) && !isTerminal(server)) return local;
  return server;
}

/** Whether the passenger may still cancel without a fee. */
export function isCancellable(phase: TripPhase): boolean {
  return can(phase, 'CANCEL');
}

/** Whether a live map with a driver puck should be on screen. */
export function showsLiveMap(phase: TripPhase): boolean {
  return (
    phase === 'driver_assigned' ||
    phase === 'driver_arriving' ||
    phase === 'driver_waiting' ||
    phase === 'in_progress'
  );
}

/**
 * Whether the safety controls (panic, Share My Ride) are available.
 * Deliberately broad — Proposal §2.6 treats safety as always-on during a trip.
 */
export function showsSafetyControls(phase: TripPhase): boolean {
  return showsLiveMap(phase) || phase === 'arrived';
}

export const PHASE_COPY: Record<TripPhase, { title: string; detail: string }> = {
  idle: { title: 'Where to?', detail: 'Set your pickup and destination to see a fare estimate.' },
  quoting: { title: 'Getting your estimate', detail: 'Checking distance, traffic and road conditions.' },
  matching: { title: 'Finding your driver', detail: 'Matching you with a verified driver nearby.' },
  driver_assigned: { title: 'Driver assigned', detail: 'Your driver is preparing to head your way.' },
  driver_arriving: { title: 'Driver on the way', detail: 'Track their approach on the map.' },
  driver_waiting: { title: 'Your driver has arrived', detail: 'Check the plate and vehicle before you get in.' },
  in_progress: { title: 'On the way', detail: 'Route verified by Waypoint.' },
  arrived: { title: 'You’ve arrived', detail: 'Confirming your final fare.' },
  completed: { title: 'Trip complete', detail: 'Thanks for riding with Waypoint.' },
  cancelled: { title: 'Trip cancelled', detail: 'No charge has been applied.' },
};
