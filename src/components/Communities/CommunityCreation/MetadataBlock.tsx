import { formatJson } from "@/utils/string";
import { useMemo } from "react";
import { MonoBlock } from "./MonoBlock";

export interface MetadataBlockProps {
  label: string;
  metadata?: string | null;
}

export const MetadataBlock = ({ label, metadata }: MetadataBlockProps) => {
  const formatted = useMemo(() => {
    if (!metadata) return null;

    try {
      return formatJson(metadata);
    } catch (err) {
      console.warn("MetadataBlock: failed to parse JSON", err);
      return metadata;
    }
  }, [metadata]);

  return <MonoBlock label={label} value={formatted} />;
};
