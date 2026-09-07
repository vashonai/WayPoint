import { JM, TT } from '../src/features/country/configs';
import { presentFare, presentQuote, type FinalFare, type Quote } from '../src/features/fare/presentFare';

const quote: Quote = { low: 850, high: 1050, currencyCode: 'JMD' };

const withinFare: FinalFare = {
  total: 980,
  currencyCode: 'JMD',
  components: [
    { kind: 'base', label: 'Base fare', amount: 300 },
    { kind: 'distance', label: 'Distance', amount: 480 },
    { kind: 'time', label: 'Travel time', amount: 200 },
  ],
};

const overFare: FinalFare = {
  total: 1180,
  currencyCode: 'JMD',
  components: [
    { kind: 'base', label: 'Base fare', amount: 300 },
    { kind: 'distance', label: 'Distance', amount: 520 },
    { kind: 'time', label: 'Travel time', amount: 220 },
    {
      kind: 'traffic',
      label: 'Traffic delay',
      amount: 140,
      reason: '14 minutes of heavy traffic on Half Way Tree Road',
      verified: true,
    },
  ],
};

describe('presentFare', () => {
  it('renders the total the server sent, unmodified', () => {
    // The client must never derive a fare. If this drifts, so has the fairness claim.
    expect(presentFare(quote, withinFare, JM).total).toBe('J$980');
  });

  it('adds no explanation when the fare lands inside the estimate', () => {
    const result = presentFare(quote, withinFare, JM);
    expect(result.withinEstimate).toBe(true);
    expect(result.explanation).toBeNull();
    expect(result.overageAmount).toBe(0);
  });

  it('always explains a fare that exceeds the estimate', () => {
    // Proposal §2.4: "Passengers are never surprised without an explanation."
    const result = presentFare(quote, overFare, JM);
    expect(result.withinEstimate).toBe(false);
    expect(result.explanation).toContain('14 minutes of heavy traffic');
    expect(result.overageAmount).toBe(130);
  });

  it('still explains an overage when the server sent no reasons', () => {
    const unexplained: FinalFare = { ...overFare, components: [{ kind: 'base', label: 'Fare', amount: 1180 }] };
    const result = presentFare(quote, unexplained, JM);
    // We never invent a reason; we say so honestly and offer a review.
    expect(result.explanation).toContain('above the estimate');
    expect(result.explanation).toContain('review');
  });

  it('joins multiple reasons readably', () => {
    const multi: FinalFare = {
      ...overFare,
      components: [
        { kind: 'traffic', label: 'Traffic', amount: 100, reason: 'heavy traffic on Constant Spring Road' },
        { kind: 'wait', label: 'Waiting', amount: 60, reason: '6 minutes of waiting at pickup' },
      ],
    };
    const result = presentFare(quote, multi, JM);
    expect(result.explanation).toContain(' and ');
  });

  it('degrades to a total-only receipt rather than blocking the passenger', () => {
    const malformed = { total: 900, currencyCode: 'JMD' } as FinalFare;
    const result = presentFare(quote, malformed, JM);
    expect(result.lines).toEqual([]);
    expect(result.total).toBe('J$900');
  });

  /**
   * Two country fixtures, from day one.
   *
   * A suite that only ever exercises JM will not catch the hardcoded "J$" that
   * breaks expansion, and Phase 4 is the most expensive time to find it.
   */
  describe('across markets', () => {
    it('formats Jamaican dollars with no decimals', () => {
      expect(presentQuote(quote, JM)).toBe('J$850 – J$1,050');
    });

    it('formats Trinidadian dollars with two decimals', () => {
      const ttQuote: Quote = { low: 40, high: 55, currencyCode: 'TTD' };
      expect(presentQuote(ttQuote, TT)).toBe('TT$40.00 – TT$55.00');
    });

    it('never leaks one market’s symbol into another', () => {
      const rendered = presentFare(quote, withinFare, TT).total;
      expect(rendered).toContain('TT$');
      expect(rendered.startsWith('J$')).toBe(false);
    });
  });
});
