export type CurrencyInfo = { symbol: string; position: 'before' | 'after' };

// Mapping of (lower-case) ISO currency codes to symbol and placement
const currencyMap: Record<string, CurrencyInfo> = {
  usd: { symbol: '$', position: 'before' },
  cad: { symbol: 'C$', position: 'before' },
  aud: { symbol: 'A$', position: 'before' },
  mxn: { symbol: '$', position: 'before' },
  sgd: { symbol: 'S$', position: 'before' },
  nzd: { symbol: 'NZ$', position: 'before' },
  eur: { symbol: '€', position: 'after' },
  gbp: { symbol: '£', position: 'before' },
  jpy: { symbol: '¥', position: 'before' },
  chf: { symbol: 'CHF', position: 'before' },
  cny: { symbol: '¥', position: 'before' },
  inr: { symbol: '₹', position: 'before' },
  brl: { symbol: 'R$', position: 'before' },
  sek: { symbol: 'kr', position: 'after' },
  nok: { symbol: 'kr', position: 'after' },
  dkk: { symbol: 'kr', position: 'after' },
};

/**
 * Returns the currency symbol and whether it should be placed before or after the amount.
 * Falls back to the upper-case currency code if the currency is unknown.
 */
export const getCurrencyInfo = (currencyCode?: string): CurrencyInfo => {
  if (!currencyCode) return { symbol: '$', position: 'before' }; // default USD
  const info = currencyMap[currencyCode.toLowerCase()];
  return info || { symbol: currencyCode.toUpperCase(), position: 'before' };
};

/**
 * Formats a numeric string with the proper currency symbol placement.
 *   formatPrice("10.00", "eur") → "10.00 €"
 */
export const formatPrice = (amount: string, currencyCode?: string): string => {
  const { symbol, position } = getCurrencyInfo(currencyCode);
  return position === 'before' ? `${symbol} ${amount}` : `${amount} ${symbol}`;
};
