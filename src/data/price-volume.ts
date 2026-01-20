interface Bid {
  id: string;
  timestamp: number;
  bidder: string;
  amount: number;
  price: number;
}

interface PriceVolumeDataPoint {
  timestamp: number;
  price: number;
  volume: number;
  cumulativeVolume: number;
}

// Generate mock bids for a Dutch auction
export const mockBids: Bid[] = (() => {
  const now = Date.now();
  const minuteInMs = 60 * 1000;
  const startPrice = 12.5;
  const endPrice = 1.8;
  const auctionStart = now - 72 * 60 * minuteInMs; // Started 72 hours ago
  const duration = 72 * 60; // 72 hours in minutes

  const bids: Bid[] = [];
  let bidIdCounter = 1;

  // Mock addresses
  const addresses = [
    "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
    "0x5A0b54D5dc17e0AadC383d2db43B0a0D3E029c4c",
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
    "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
    "0x976EA74026E726554dB657fA54763abd0C3a0aa9",
    "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955",
    "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f",
    "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720",
  ];

  // Seed for consistent "random" values
  let seed = 42;
  const seededRandom = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  const getRandomAddress = () =>
    addresses[Math.floor(seededRandom() * addresses.length)];

  // Generate bids with realistic patterns
  for (let minute = 1; minute < duration; minute++) {
    const progress = minute / duration;
    const currentPrice =
      startPrice - (startPrice - endPrice) * Math.pow(progress, 0.85);

    // Probability of bids increases as price drops
    let bidProbability = 0;
    let avgBidSize = 0;
    let maxBidsPerMinute = 0;

    // Early period: few bids, some whales
    if (progress < 0.15) {
      bidProbability = 0.08;
      avgBidSize = 35;
      maxBidsPerMinute = 2;
    }
    // Growing interest
    else if (progress < 0.35) {
      bidProbability = 0.15;
      avgBidSize = 45;
      maxBidsPerMinute = 3;
    }
    // Active trading
    else if (progress < 0.6) {
      bidProbability = 0.3;
      avgBidSize = 60;
      maxBidsPerMinute = 5;
    }
    // FOMO phase
    else if (progress < 0.85) {
      bidProbability = 0.5;
      avgBidSize = 75;
      maxBidsPerMinute = 8;
    }
    // Final rush
    else {
      bidProbability = 0.7;
      avgBidSize = 90;
      maxBidsPerMinute = 12;
    }

    if (seededRandom() < bidProbability) {
      const numBids = Math.ceil(seededRandom() * maxBidsPerMinute);

      for (let b = 0; b < numBids; b++) {
        const secondOffset = Math.floor(seededRandom() * 60);
        const timestamp =
          auctionStart + minute * minuteInMs + secondOffset * 1000;

        // Bid amount with variation
        let amount = avgBidSize * (0.5 + seededRandom() * 1.0);

        // Occasional whale bids
        if (seededRandom() < 0.05) {
          amount *= 3 + seededRandom() * 5;
        }

        // Small bids occasionally
        if (seededRandom() < 0.15) {
          amount *= 0.3;
        }

        bids.push({
          id: `bid_${bidIdCounter++}`,
          timestamp,
          bidder: getRandomAddress(),
          amount: parseFloat(amount.toFixed(2)),
          price: parseFloat(currentPrice.toFixed(6)),
        });
      }
    }
  }

  return bids.sort((a, b) => a.timestamp - b.timestamp);
})();

// Generate price/volume data from bids
export const mockPriceVolumeData: PriceVolumeDataPoint[] = (() => {
  const now = Date.now();
  const minuteInMs = 60 * 1000;
  const startPrice = 12.5;
  const endPrice = 1.8;
  const duration = 72 * 60; // 72 hours in minutes
  const intervalMinutes = 15;

  const data: PriceVolumeDataPoint[] = [];
  let cumulativeVolume = 0;

  for (let i = 0; i <= duration; i += intervalMinutes) {
    const timestamp = now - (duration - i) * minuteInMs;
    const progress = i / duration;

    // Current price based on Dutch auction curve
    const price =
      startPrice - (startPrice - endPrice) * Math.pow(progress, 0.85);

    // Calculate volume from bids in this interval
    const intervalStart = timestamp - intervalMinutes * minuteInMs;
    const intervalEnd = timestamp;

    const bidsInInterval = mockBids.filter(
      (bid) => bid.timestamp > intervalStart && bid.timestamp <= intervalEnd
    );

    const volume = bidsInInterval.reduce((sum, bid) => sum + bid.amount, 0);
    cumulativeVolume += volume;

    data.push({
      timestamp,
      price: parseFloat(price.toFixed(6)),
      volume: parseFloat(volume.toFixed(2)),
      cumulativeVolume: parseFloat(cumulativeVolume.toFixed(2)),
    });
  }

  return data;
})();
