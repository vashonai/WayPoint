/**
 * Country Configuration System — Proposal §2.8.
 *
 * Jamaica is the testing market, not a permanent limitation. Every market
 * difference lives in a CountryConfig row; nothing in the app tree may
 * hardcode a currency symbol, an emergency number, a document requirement,
 * or a hazard label.
 *
 * This type existing in Phase 1 is what makes Phase 4 configuration rather
 * than a rewrite.
 */

export type CountryCode = 'JM' | 'TT' | 'BB' | 'BS' | 'GY' | 'LC';

export type FieldSpec =
  | { kind: 'text'; name: string; label: string; placeholder?: string; required: boolean; maxLength?: number }
  | { kind: 'date'; name: string; label: string; required: boolean }
  | { kind: 'select'; name: string; label: string; required: boolean; options: { value: string; label: string }[] }
  | { kind: 'photo'; name: string; label: string; required: boolean; hint?: string };

export type DocumentSpec = {
  /** URL segment: /(onboarding)/documents/police-record */
  slug: string;
  label: string;
  helpText: string;
  /** Drives the dynamic form renderer. Adding a market adds rows, not screens. */
  fields: FieldSpec[];
  expires: boolean;
  /** Phase 3 expiry tracking. Days before expiry to start reminding. */
  renewalNoticeDays: number;
};

export type PaymentMethod = 'card' | 'cash' | 'mobile_money';

export type PhotoSlot = 'front' | 'rear' | 'left' | 'right' | 'interior' | 'plate';

export type CountryConfig = {
  code: CountryCode;
  name: string;
  currency: { code: string; symbol: string; decimals: number };
  /**
   * Local emergency services. The panic button's guaranteed fallback path
   * dials this number — it must never be a constant in the safety code.
   */
  emergency: { police: string; ambulance: string; label: string };
  driverDocuments: DocumentSpec[];
  vehicleRules: { maxAgeYears: number; requiredPhotos: PhotoSlot[] };
  /**
   * Regulator-reviewed hazard labels. The enforcement label in particular is
   * legally sensitive — Proposal §2.2 requires neutral framing, so the string
   * is supplied per market and never written in a component.
   */
  hazardLabels: Record<string, string>;
  payments: PaymentMethod[];
  locale: string;
  /**
   * Where the map opens before a GPS fix, and what place search is biased
   * towards. Search is also restricted to `code` — a Kingston passenger typing
   * "Half Way Tree" should never see a result in another country.
   */
  map: {
    center: [lng: number, lat: number];
    searchRadiusMeters: number;
  };
};
