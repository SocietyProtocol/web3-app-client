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

    return formatJson(metadata);
  }, [metadata]);

  return (
    <MonoBlock label={label} value={formatted ?? "No additional metadata"} />
  );
};
