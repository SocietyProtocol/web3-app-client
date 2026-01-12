"use client";

import Image, { ImageProps } from "next/image";
import { useState } from "react";

interface SafeImageProps extends Omit<ImageProps, "onError"> {
  fallback?: React.ReactNode;
}

/**
 * A wrapper around Next.js Image component with built-in error handling.
 * If the image fails to load, it will either hide or show an optional fallback.
 */
export const SafeImage = ({ fallback, ...props }: SafeImageProps) => {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return fallback ? <>{fallback}</> : null;
  }

  return <Image {...props} onError={() => setHasError(true)} />;
};
