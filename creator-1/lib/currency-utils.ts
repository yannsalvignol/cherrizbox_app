/**
 * Currency utilities for formatting prices and managing currency symbols
 */

interface CurrencyInfo {
  symbol: string;
  position: 'before' | 'after';
}

/**
 * Get currency information including symbol and position
 */
export const getCurrencyInfo = (currencyCode?: string): CurrencyInfo => {
  const currencyMap: { [key: string]: CurrencyInfo } = {
    'USD': { symbol: '$', position: 'before' },
    'CAD': { symbol: 'C$', position: 'before' },
    'AUD': { symbol: 'A$', position: 'before' },
    'MXN': { symbol: '$', position: 'before' },
    'SGD': { symbol: 'S$', position: 'before' },
    'NZD': { symbol: 'NZ$', position: 'before' },
    'EUR': { symbol: '€', position: 'after' },
    'GBP': { symbol: '£', position: 'before' },
    'JPY': { symbol: '¥', position: 'before' },
    'CHF': { symbol: 'CHF', position: 'before' },
    'CNY': { symbol: '¥', position: 'before' },
    'INR': { symbol: '₹', position: 'before' },
    'BRL': { symbol: 'R$', position: 'before' },
    'SEK': { symbol: 'kr', position: 'after' },
    'NOK': { symbol: 'kr', position: 'after' },
    'DKK': { symbol: 'kr', position: 'after' },
  };
  
  return currencyMap[currencyCode || 'USD'] || { symbol: '$', position: 'before' };
};

/**
 * Format price with currency symbol in correct position
 */
export const formatPrice = (price: number | string | undefined, currencyCode?: string): string => {
  if (price === undefined || price === null) return '--';
  
  const priceStr = parseFloat(price.toString()).toFixed(2);
  const currencyInfo = getCurrencyInfo(currencyCode);
  
  return currencyInfo.position === 'before' 
    ? `${currencyInfo.symbol}${priceStr}`
    : `${priceStr}${currencyInfo.symbol}`;
};

/**
 * Parse price string and return numeric value
 */
export const parsePrice = (priceString: string): number => {
  // Remove currency symbols and parse
  const numericString = priceString.replace(/[^\d.,]/g, '');
  return parseFloat(numericString) || 0;
};

/**
 * Get list of supported currencies
 */
export const getSupportedCurrencies = (): string[] => {
  return [
    'USD', 'CAD', 'AUD', 'MXN', 'SGD', 'NZD',
    'EUR', 'GBP', 'JPY', 'CHF', 'CNY', 'INR',
    'BRL', 'SEK', 'NOK', 'DKK'
  ];
};

/**
 * Check if currency is supported
 */
export const isSupportedCurrency = (currencyCode: string): boolean => {
  return getSupportedCurrencies().includes(currencyCode.toUpperCase());
};