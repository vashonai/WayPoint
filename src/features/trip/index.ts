/**
 * The trip feature's public surface.
 *
 * Other features and screens import from here, never from `machine/` or
 * `api/` directly. The `no-restricted-imports` rule in eslint.config.js
 * enforces this — it is what keeps a feature's internals free to change.
 */
export {
  can,
  isCancellable,
  isTerminal,
  reconcile,
  showsLiveMap,
  showsSafetyControls,
  transition,
  PHASE_COPY,
  TERMINAL_PHASES,
  type TripEvent,
  type TripPhase,
} from './machine/tripMachine';
