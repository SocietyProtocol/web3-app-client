"use client";

import { Paper, Stack, useTheme, Box } from "@mui/material";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useResponsiveValue } from "@/hooks/useResponsiveValue";

export interface HistoricalRateProps {
  series: Array<{ price: number; volume: number }>;
}

export const PriceVolumeChart = ({ series }: HistoricalRateProps) => {
  const theme = useTheme();
  const nTicks = useResponsiveValue({ xs: 3, sm: 5, md: 6, lg: 7 });

  const xTicks = useMemo(() => {
    if (series.length === 0) return [];

    const prices = series.map((item) => item.price).sort((a, b) => a - b);
    const tickCount = nTicks;
    const step = Math.floor(prices.length / (tickCount - 1));

    const ticks = [prices[0]];

    for (let i = step; i < prices.length - 1; i += step) {
      ticks.push(prices[i]);
    }

    ticks.push(prices[prices.length - 1]);

    return ticks;
  }, [series, nTicks]);

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
        <Box sx={{ width: "100%", height: { xs: 300, sm: 350, md: 400 } }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={series}
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
                    stopOpacity={0.5}
                  />
                  <stop
                    offset="100%"
                    stopColor={theme.palette.chart.fill}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>

              <XAxis
                dataKey="price"
                stroke={theme.palette.primary.main}
                ticks={xTicks}
                interval="preserveStartEnd"
                label={{
                  value: "Price (USDC)",
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
                  value: "Volume (SPEC)",
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
                labelFormatter={(label) => [`Price: ${label.toFixed(4)} USDC`]}
                formatter={(value: number | undefined) => [
                  `${value?.toFixed(2)} SPEC`,
                  "Volume",
                ]}
              />
              <Area
                type="monotone"
                dataKey="volume"
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
