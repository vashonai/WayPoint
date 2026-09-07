import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { COUNTRY_CONFIGS, DEFAULT_COUNTRY } from './configs';
import type { CountryCode, CountryConfig, DocumentSpec } from './types';

type CountryContextValue = {
  config: CountryConfig;
  setCountry: (code: CountryCode) => void;
};

const CountryContext = createContext<CountryContextValue | null>(null);

/**
 * Resolves the active market once, at launch. The root layout holds the splash
 * screen until this and the session have both settled — guards evaluate before
 * an async gate resolves otherwise, and a flash of the wrong market's currency
 * is the kind of thing a store reviewer notices.
 */
export function CountryProvider({
  children,
  initialCountry = DEFAULT_COUNTRY,
}: {
  children: ReactNode;
  initialCountry?: CountryCode;
}) {
  const [code, setCode] = useState<CountryCode>(initialCountry);

  const value = useMemo<CountryContextValue>(
    () => ({
      config: COUNTRY_CONFIGS[code as keyof typeof COUNTRY_CONFIGS] ?? COUNTRY_CONFIGS.JM,
      setCountry: setCode,
    }),
    [code],
  );

  return <CountryContext.Provider value={value}>{children}</CountryContext.Provider>;
}

export function useCountry(): CountryConfig {
  const ctx = useContext(CountryContext);
  if (!ctx) throw new Error('useCountry must be used inside <CountryProvider>.');
  return ctx.config;
}

export function useSetCountry() {
  const ctx = useContext(CountryContext);
  if (!ctx) throw new Error('useSetCountry must be used inside <CountryProvider>.');
  return ctx.setCountry;
}

/** Looks up one document spec by its route slug. Drives the dynamic form. */
export function useDocumentSpec(slug: string): DocumentSpec | undefined {
  const config = useCountry();
  return config.driverDocuments.find((d) => d.slug === slug);
}

/**
 * Formats money in the active market's currency.
 * Every fare, fee and earnings figure in the app goes through this — there is
 * no other correct way to render an amount.
 */
export function formatCurrency(amount: number, config: CountryConfig): string {
  const { symbol, decimals } = config.currency;
  return `${symbol}${amount.toLocaleString(config.locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}
