"use client";

import { SafeImage } from "@/components/SafeImage/SafeImage";
import { CSSProperties } from "react";

export interface TokenIconProps {
  symbol: string;
  size?: number;
  style?: CSSProperties;
}

/**
 * Displays a token icon based on the token symbol.
 * Automatically resolves the path to the token icon.
 */
export const TokenIcon = ({ symbol, size = 24, style }: TokenIconProps) => {
  return (
    <SafeImage
      src={`/tokens/${symbol.toLowerCase()}.svg`}
      alt={symbol}
      width={size}
      height={size}
      style={style}
    />
  );
};
