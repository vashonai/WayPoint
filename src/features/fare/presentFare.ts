import { formatCurrency } from '../country/CountryProvider';
import type { CountryConfig } from '../country/types';

/**
 * Fare PRESENTATION. Not fare calculation.
 *
 * Proposal §2.4 requires that traffic charges rely on GPS data, Waypoint's own
 * traffic intelligence and community reports — "never simply the driver's
 * word". That guarantee only holds if the client cannot produce a number of
 * its own, so nothing in this file multiplies a rate by a distance.
 *
 * The server sends components with reasons already attached. Our job is to
 * turn them into a sentence a passenger accepts, because the proposal is
 * explicit: "Passengers are never surprised without an explanation."
 */

export type FareComponentKind = 'base' | 'distance' | 'time' | 'traffic' | 'wait' | 'adjustment';

/** One line of a server-computed fare. `amount` is authoritative. */
export type FareComponent = {
  kind: FareComponentKind;
  /** Server-supplied label, already localised. */
  label: string;
  amount: number;
  /**
   * Why this line exists, in plain language, from the server.
   * e.g. "14 min of verified traffic on Half Way Tree Rd"
   */
  reason?: string;
  /** True when the charge was verified against GPS + community data (§2.4). */
  verified?: boolean;
};

/** The pre-booking estimate range shown to a passenger (§2.4). */
export type Quote = {
  low: number;
  high: number;
  currencyCode: string;
};

/** The settled fare the server computed at trip end. */
export type FinalFare = {
  total: number;
  components: FareComponent[];
  currencyCode: string;
};

export type FareLine = {
  kind: FareComponentKind;
  label: string;
  amount: string;
  reason?: string;
  verified: boolean;
};

export type PresentedFare = {
  total: string;
  estimateRange: string;
  lines: FareLine[];
  /**
   * Null when the final fare landed inside the estimate. Non-null means the
   * receipt MUST show this text — an unexplained increase is the exact
   * surprise §2.4 forbids.
   */
  explanation: string | null;
  withinEstimate: boolean;
  /** Positive when the fare exceeded the top of the estimate. */
  overageAmount: number;
};

/**
 * Builds the passenger-facing receipt from a server quote and a server fare.
 *
 * @throws never — a malformed component list degrades to a total-only receipt
 *         rather than blocking a passenger from leaving the vehicle.
 */
export function presentFare(
  quote: Quote,
  final: FinalFare,
  config: CountryConfig,
): PresentedFare {
  const overage = final.total - quote.high;
  const withinEstimate = overage <= 0;

  const lines: FareLine[] = (final.components ?? []).map((c) => ({
    kind: c.kind,
    label: c.label,
    amount: formatCurrency(c.amount, config),
    reason: c.reason,
    verified: c.verified ?? false,
  }));

  return {
    total: formatCurrency(final.total, config),
    estimateRange: `${formatCurrency(quote.low, config)} – ${formatCurrency(quote.high, config)}`,
    lines,
    explanation: withinEstimate ? null : buildExplanation(final.components ?? [], config),
    withinEstimate,
    overageAmount: Math.max(0, overage),
  };
}

/**
 * Assembles the plain-language reason a fare exceeded its estimate.
 *
 * Only components that carry a server-supplied `reason` are used. We never
 * invent an explanation — an unexplained overage says so honestly and routes
 * the passenger to support, which is the correct outcome and the one the
 * fairness policy in §2.7 depends on.
 */
export function buildExplanation(
  components: FareComponent[],
  _config: CountryConfig,
): string {
  const reasons = components
    .filter((c) => c.reason && c.amount > 0)
    .map((c) => c.reason as string);

  if (reasons.length === 0) {
    return 'This fare came in above the estimate. Tap below if you’d like us to review it.';
  }

  const joined =
    reasons.length === 1
      ? reasons[0]
      : `${reasons.slice(0, -1).join(', ')} and ${reasons[reasons.length - 1]}`;

  return `Your fare came in above the estimate because of ${joined}.`;
}

/** Formats the pre-booking estimate range for the quote screen. */
export function presentQuote(quote: Quote, config: CountryConfig): string {
  return `${formatCurrency(quote.low, config)} – ${formatCurrency(quote.high, config)}`;
}
