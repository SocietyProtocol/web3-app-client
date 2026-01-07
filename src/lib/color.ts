export const generateColorsFromAddress = (
  address: string
): [string, string] => {
  // Remove '0x' prefix if present and ensure lowercase
  const cleanAddress = address.toLowerCase().replace(/^0x/, "");

  // Parse the entire address as a large number (use multiple parts to avoid overflow)
  let hash = 0;
  for (let i = 0; i < cleanAddress.length; i += 8) {
    const chunk = parseInt(cleanAddress.slice(i, i + 8), 16);
    hash = hash ^ chunk; // XOR all chunks together
  }

  // Generate different seeds using bit manipulation
  const seed1 = hash;
  const seed2 = (hash << 8) ^ (hash >>> 8);
  const seed3 = (hash << 16) ^ (hash >>> 16);
  const seed4 = ~hash; // Bitwise NOT for maximum variation
  const seed5 = (hash ^ (hash << 5)) >>> 3;
  const seed6 = ((hash << 13) ^ (hash >>> 19)) & 0xffffffff;

  // Generate first color with enhanced saturation and brightness
  const hue1 = Math.abs(seed1 % 360);
  const saturation1 = 70 + (Math.abs(seed2) % 25); // 70-95% saturation
  const lightness1 = 50 + (Math.abs(seed3) % 20); // 50-70% lightness

  // Generate second color with complementary hue
  const hueOffset = 60 + (Math.abs(seed4) % 120); // 60-180 degree offset
  const hue2 = (hue1 + hueOffset) % 360;
  const saturation2 = 65 + (Math.abs(seed5) % 30); // 65-95% saturation
  const lightness2 = 45 + (Math.abs(seed6) % 25); // 45-70% lightness

  // Create vibrant HSL colors
  return [
    `hsl(${hue1}, ${saturation1}%, ${lightness1}%)`,
    `hsl(${hue2}, ${saturation2}%, ${lightness2}%)`,
  ];
};
