export interface ConversionResult {
  amount: string;
  from: string;
  to: string;
  result: string;
  rate: string;
}

class CurrencyService {
  private cache: Map<string, { data: ConversionResult; timestamp: number }> = new Map();
  private CACHE_TTL = 1000 * 60 * 5; // 5 minutes

  async convert(query: string): Promise<ConversionResult | null> {
    const cleaned = query.toLowerCase().trim();
    const regex = /^(\d+(?:\.\d+)?)\s*([a-z]{3})\s*(?:to|in)?\s*([a-z]{3})$/i;
    const match = cleaned.match(regex);

    if (!match) return null;

    const amount = match[1];
    const from = match[2].toUpperCase();
    const to = match[3].toUpperCase();
    const cacheKey = `${amount}_${from}_${to}`;

    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    try {
      const response = await fetch(`https://api.frankfurter.app/latest?amount=${amount}&from=${from}&to=${to}`);
      const data = await response.json();

      if (data.rates && data.rates[to]) {
        const resultValue = data.rates[to].toFixed(2);
        const rate = (data.rates[to] / parseFloat(amount)).toFixed(4);
        
        const result: ConversionResult = {
          amount,
          from,
          to,
          result: resultValue,
          rate
        };

        this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
        return result;
      }
    } catch (err) {
      console.warn('[CurrencyService] fetch failed', err);
    }

    return null;
  }
}

export const currencyService = new CurrencyService();
