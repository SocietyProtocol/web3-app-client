"use client";

import { useEffect, useState } from "react";
import { Tooltip, Typography, TypographyProps } from "@mui/material";
import { formatDateTime, formatRelativeTime } from "@/utils/date";
import { useIsMounted } from "@/hooks/useIsMounted";

interface LiveRelativeTimeProps extends TypographyProps {
  /** UNIX timestamp in seconds */
  timestamp: string | bigint | number;
}

function getNextUpdateAt(
  timestampSec: number,
  nowSec: number,
): number | undefined {
  const diff = nowSec - timestampSec;

  // Only schedule a re-render when the displayed relative label is expected to
  // change. Recent timestamps need frequent updates for accuracy, while older
  // timestamps can update less often to avoid unnecessary timers and renders.
  if (diff < 60) {
    // For the first minute, the label is typically "Just now". Update exactly
    // when we cross the 60-second boundary so the UI can switch to minutes.
    return nowSec + (60 - diff);
  }

  if (diff < 600) {
    // Between 1 minute and 10 minutes old, the label changes every minute
    // ("1 min ago", "2 min ago", ...), so refresh on the next minute boundary.
    return timestampSec + (Math.floor(diff / 60) + 1) * 60;
  }

  if (diff < 3_600) {
    // Between 10 minutes and 1 hour old, minute-level updates are usually not
    // needed. Refresh every 10 minutes to keep the label reasonably current
    // while reducing update frequency.
    return timestampSec + (Math.floor(diff / 600) + 1) * 600;
  }

  if (diff < 86_400) {
    // Between 1 hour and 24 hours old, the formatter still shows hour-based
    // relative labels ("1 hour ago", "2 hours ago", ...). Refresh on the next
    // hour boundary so the displayed label continues advancing correctly.
    return timestampSec + (Math.floor(diff / 3_600) + 1) * 3_600;
  }
  // After 24 hours, the formatter switches away from hour-based relative
  // labels, so no further live updates are needed.

  return undefined;
}

export function LiveRelativeTime({
  timestamp,
  ...typographyProps
}: LiveRelativeTimeProps) {
  const timestampSec = Number(timestamp);
  const mounted = useIsMounted();
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const nextUpdateAt = getNextUpdateAt(timestampSec, now);
    if (!nextUpdateAt) return;

    const delay = Math.max(
      0,
      (nextUpdateAt - Math.floor(Date.now() / 1000)) * 1000,
    );
    const id = setTimeout(() => setNow(Math.floor(Date.now() / 1000)), delay);
    return () => clearTimeout(id);
  }, [timestampSec, now]);

  if (!mounted) {
    return (
      <Tooltip title={formatDateTime(timestampSec)} placement="top">
        <Typography component="span" {...typographyProps}>
          {formatDateTime(timestampSec)}
        </Typography>
      </Tooltip>
    );
  }

  return (
    <Tooltip title={formatDateTime(timestampSec)} placement="top">
      <Typography component="span" {...typographyProps}>
        {formatRelativeTime(timestampSec, now * 1000)}
      </Typography>
    </Tooltip>
  );
}
