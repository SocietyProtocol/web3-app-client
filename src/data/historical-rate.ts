/**
 * Mock historical rate data for the last 30 days with hourly granularity
 * Generates realistic price chart data using random walk with drift
 */
export const mockHistoricalRate = (() => {
  const data: Array<{ time: number; rate: number }> = [];
  const now = Date.now();
  const totalHours = 30 * 24;

  let currentRate = 1.5; // Starting price
  const drift = 0.0002; // Slight upward drift per hour
  const volatility = 0.015; // Base volatility (1.5%)

  for (let i = 0; i < totalHours; i++) {
    const hoursAgo = totalHours - 1 - i;
    const timestamp = Math.floor((now - hoursAgo * 60 * 60 * 1000) / 1000);

    // Random walk: each step is normally distributed
    // Using Box-Muller transform for normal distribution
    const u1 = Math.random();
    const u2 = Math.random();
    const normalRandom =
      Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

    // Occasional volatility spikes (10% chance)
    const volatilityMultiplier = Math.random() < 0.1 ? 2.5 : 1;

    // Calculate price change
    const change = drift + volatility * volatilityMultiplier * normalRandom;
    currentRate = currentRate * (1 + change);

    // Keep price in reasonable range (1.0 to 2.5)
    currentRate = Math.max(1.0, Math.min(2.5, currentRate));

    data.push({
      time: timestamp,
      rate: Number(currentRate.toFixed(4)),
    });
  }

  return data;
})();
