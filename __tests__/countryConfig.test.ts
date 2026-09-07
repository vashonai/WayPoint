import { COUNTRY_CONFIGS, JM, TT } from '../src/features/country/configs';
import { formatCurrency } from '../src/features/country/CountryProvider';
import { HAZARD_PICKER_ORDER } from '../src/features/hazards/taxonomy';

/**
 * The Phase 4 promise, tested in Phase 1.
 *
 * Proposal §2.8 says a new market can be switched on without rebuilding the
 * core app. These tests assert the shape that makes that true.
 */
describe('country configuration', () => {
  const configs = Object.values(COUNTRY_CONFIGS);

  it('gives every market its own currency, emergency number and locale', () => {
    configs.forEach((c) => {
      expect(c.currency.symbol).toBeTruthy();
      expect(c.emergency.police).toMatch(/^\d+$/);
      expect(c.locale).toContain('-');
    });
    expect(JM.emergency.police).not.toBe(TT.emergency.police);
    expect(JM.currency.symbol).not.toBe(TT.currency.symbol);
  });

  it('requires a police record in Jamaica specifically', () => {
    // Proposal §2.5 — a deliberately higher barrier to entry in the launch market.
    const slugs = JM.driverDocuments.map((d) => d.slug);
    expect(slugs).toContain('police-record');
    expect(TT.driverDocuments.map((d) => d.slug)).not.toContain('police-record');
  });

  it('gives every market a label for every hazard the picker can show', () => {
    configs.forEach((c) => {
      HAZARD_PICKER_ORDER.forEach((hazardType) => {
        expect(c.hazardLabels[hazardType]).toBeTruthy();
      });
    });
  });

  it('keeps enforcement wording neutral in every market', () => {
    // Regulator-reviewed. Never "police trap", "speed camera", or similar.
    configs.forEach((c) => {
      const label = (c.hazardLabels.enforcement ?? '').toLowerCase();
      expect(label).toMatch(/reported/);
      expect(label).not.toMatch(/avoid|trap|evade|escape/);
    });
  });

  it('gives every document a renewal window when it expires', () => {
    configs.forEach((c) => {
      c.driverDocuments
        .filter((d) => d.expires)
        .forEach((d) => expect(d.renewalNoticeDays).toBeGreaterThan(0));
    });
  });

  it('gives every form field a label so the dynamic renderer never shows a blank', () => {
    configs.forEach((c) => {
      c.driverDocuments.forEach((doc) => {
        expect(doc.fields.length).toBeGreaterThan(0);
        doc.fields.forEach((f) => {
          expect(f.label).toBeTruthy();
          expect(f.name).toBeTruthy();
        });
      });
    });
  });

  it('formats currency per market', () => {
    expect(formatCurrency(1050, JM)).toBe('J$1,050');
    expect(formatCurrency(1050, TT)).toBe('TT$1,050.00');
  });
});
