import {
  can,
  isCancellable,
  isTerminal,
  reconcile,
  showsSafetyControls,
  transition,
  type TripPhase,
} from '../src/features/trip';

describe('trip machine', () => {
  it('walks the happy path from idle to completed', () => {
    let phase: TripPhase = 'idle';
    phase = transition(phase, { type: 'REQUEST_QUOTE' });
    expect(phase).toBe('quoting');
    phase = transition(phase, { type: 'CONFIRM_RIDE' });
    expect(phase).toBe('matching');
    phase = transition(phase, { type: 'DRIVER_MATCHED' });
    expect(phase).toBe('driver_assigned');
    phase = transition(phase, { type: 'DRIVER_EN_ROUTE' });
    expect(phase).toBe('driver_arriving');
    phase = transition(phase, { type: 'DRIVER_ARRIVED' });
    expect(phase).toBe('driver_waiting');
    phase = transition(phase, { type: 'TRIP_STARTED' });
    expect(phase).toBe('in_progress');
    phase = transition(phase, { type: 'DESTINATION_REACHED' });
    expect(phase).toBe('arrived');
    phase = transition(phase, { type: 'FARE_SETTLED' });
    expect(phase).toBe('completed');
  });

  it('ignores events that do not apply instead of throwing', () => {
    // A duplicate or out-of-order broadcast must never crash a live trip screen.
    expect(transition('idle', { type: 'FARE_SETTLED' })).toBe('idle');
    expect(transition('completed', { type: 'CANCEL' })).toBe('completed');
    expect(transition('in_progress', { type: 'DRIVER_MATCHED' })).toBe('in_progress');
  });

  it('returns a passenger to matching when a driver drops before pickup', () => {
    expect(transition('driver_assigned', { type: 'DRIVER_DROPPED' })).toBe('matching');
    expect(transition('driver_arriving', { type: 'DRIVER_DROPPED' })).toBe('matching');
    expect(transition('driver_waiting', { type: 'DRIVER_DROPPED' })).toBe('matching');
  });

  it('does not let the client cancel a trip already in progress', () => {
    // Ending a trip early is a support and safety flow, not a button.
    expect(can('in_progress', 'CANCEL')).toBe(false);
    expect(isCancellable('in_progress')).toBe(false);
    expect(isCancellable('matching')).toBe(true);
  });

  describe('reconcile', () => {
    it('takes the server phase when local and server disagree', () => {
      expect(reconcile('driver_arriving', 'driver_waiting')).toBe('driver_waiting');
      expect(reconcile('matching', 'cancelled')).toBe('cancelled');
    });

    it('does not let the server walk back a terminal local phase', () => {
      expect(reconcile('completed', 'in_progress')).toBe('completed');
      expect(reconcile('cancelled', 'matching')).toBe('cancelled');
    });

    it('accepts a server terminal phase over a live local one', () => {
      expect(reconcile('in_progress', 'completed')).toBe('completed');
    });
  });

  it('keeps safety controls available for the whole live portion of a trip', () => {
    const live: TripPhase[] = [
      'driver_assigned',
      'driver_arriving',
      'driver_waiting',
      'in_progress',
      'arrived',
    ];
    live.forEach((p) => expect(showsSafetyControls(p)).toBe(true));
    expect(showsSafetyControls('idle')).toBe(false);
  });

  it('marks only completed and cancelled as terminal', () => {
    expect(isTerminal('completed')).toBe(true);
    expect(isTerminal('cancelled')).toBe(true);
    expect(isTerminal('arrived')).toBe(false);
  });
});
