"use client";

import { Paper, Stack, Typography, useTheme, Box } from "@mui/material";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DateRangeControl } from "./DateRangeControl";
import { useResponsiveValue } from "@/hooks/useResponsiveValue";

export interface HistoricalRateProps {
  series: Array<{ time: number; rate: number }>;
}

const now = Date.now() / 1000;

export const HistoricalRate = ({ series }: HistoricalRateProps) => {
  const theme = useTheme();
  const nTicks = useResponsiveValue({ xs: 3, sm: 5, md: 6, lg: 7 });

  const [dateRange, setDateRange] = useState<string>("7D");

  const filteredData = useMemo(() => {
    let cutoffTime: number;

    switch (dateRange) {
      case "1D":
        cutoffTime = now - 24 * 60 * 60;
        break;
      case "7D":
        cutoffTime = now - 7 * 24 * 60 * 60;
        break;
      case "30D":
        cutoffTime = now - 30 * 24 * 60 * 60;
        break;
    }

    return series.filter((item) => item.time >= cutoffTime);
  }, [series, dateRange]);

  const formatLabel = (timestamp: number) => {
    const date = new Date(timestamp * 1000);

    return date.toLocaleTimeString("en-US", {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);

    if (dateRange === "1D") {
      // For 1 day view, show month, day and hour
      return date.toLocaleString("en-US", {
        month: "short",
        day: "2-digit",
        hour: "2-digit",
      });
    }

    // For 7D and 30D, show month and day
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
    });
  };

  const xTicks = useMemo(() => {
    if (filteredData.length === 0) return [];

    const timestamps = filteredData
      .map((item) => item.time)
      .sort((a, b) => a - b);
    const tickCount = nTicks;
    const step = Math.floor(timestamps.length / (tickCount - 1));

    const ticks = [timestamps[0]];

    for (let i = step; i < timestamps.length - 1; i += step) {
      ticks.push(timestamps[i]);
    }

    ticks.push(timestamps[timestamps.length - 1]);

    return ticks;
  }, [filteredData, nTicks]);

  return (
    <Stack
      sx={{
        flex: 1,
      }}
    >
      <Paper
        elevation={0}
        sx={{
          padding: { xs: 2, sm: 3 },
          backgroundColor: "transparent",
          border: (theme) => `1px solid ${theme.palette.border.area}`,
          borderRadius: "12px",
          display: "flex",
          flexDirection: "column",
          gap: 3,
          flex: 1,
          position: "relative",
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          spacing={{ xs: 1, sm: 0 }}
          sx={{
            position: "absolute",
            top: { xs: 16, sm: 24 },
            left: { xs: 16, sm: 24 },
            right: { xs: 16, sm: 24 },
            zIndex: 1,
          }}
        >
          <Typography
            color="primary.main"
            sx={{
              fontSize: { xs: 16, sm: 18, md: 20 },
              fontWeight: 600,
            }}
          >
            Historical Rate
          </Typography>
          <DateRangeControl
            selectedRange={dateRange}
            onRangeChange={setDateRange}
            ranges={["1D", "7D", "30D"]}
          />
        </Stack>
        <Box sx={{ width: "100%", height: { xs: 300, sm: 350, md: 400 } }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={filteredData}
              margin={{
                top: 60,
                right: 10,
                bottom: 20,
                left: 0,
              }}
            >
              <defs>
                <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={theme.palette.chart.fill}
                    stopOpacity={0.2}
                  />
                  <stop
                    offset="100%"
                    stopColor={theme.palette.chart.fill}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>

              <XAxis
                dataKey="time"
                tickFormatter={formatDate}
                stroke={theme.palette.primary.main}
                ticks={xTicks}
                interval="preserveStartEnd"
                label={{
                  value: "Date",
                  position: "insideBottom",
                  offset: -10,
                  style: { fill: theme.palette.primary.main },
                  fontSize: 12,
                  fontWeight: 400,
                }}
                tickLine={false}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={false}
                label={{
                  value: "Price (USDC per SPEC)",
                  angle: -90,
                  position: "insideLeft",
                  style: { fill: theme.palette.primary.main },
                  fontSize: 12,
                  fontWeight: 400,
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: theme.palette.background.paper,
                  border: `1px solid ${theme.palette.border.bubble}`,
                  borderRadius: "8px",
                }}
                labelStyle={{ color: theme.palette.primary.main }}
                formatter={(value: number | undefined) => [
                  value?.toFixed(2),
                  "Rate",
                ]}
                labelFormatter={formatLabel}
              />
              <Area
                type="monotone"
                dataKey="rate"
                stroke={theme.palette.chart.stroke}
                strokeWidth={2}
                fill="url(#colorRate)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Box>
      </Paper>
    </Stack>
  );
};
