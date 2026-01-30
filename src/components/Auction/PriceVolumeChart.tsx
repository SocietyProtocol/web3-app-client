"use client";

import { Paper, Stack, useTheme, Box } from "@mui/material";
import {
  Area,
  AreaChart,
  Label,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface PriceVolumeChartProps {
  series?: Array<{ label: number; value: number }>;
  xReferenceLines?: Array<{ value: number; label: string }>;
}

export const PriceVolumeChart = ({
  series = [],
  xReferenceLines = [],
}: PriceVolumeChartProps) => {
  const theme = useTheme();

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
        <Box
          sx={{
            width: "100%",
            height: { xs: 300, sm: 350, md: 400 },
            "& svg:focus": {
              outline: "none",
            },
            "& svg:focus-visible": {
              outline: "none",
            },
          }}
        >
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
                type="number"
                scale="linear"
                reversed
                dataKey="label"
                stroke={theme.palette.primary.main}
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
                domain={["dataMin", "dataMax"]}
                tickFormatter={(v) => Number(v).toFixed(4)}
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
                tickFormatter={(v) => Number(v).toFixed(4)}
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
                type="linear"
                dataKey="value"
                dot={false}
                stroke={theme.palette.chart.stroke}
                strokeWidth={2}
                fill="url(#colorRate)"
              />

              {xReferenceLines.map(({ value, label }) => (
                <ReferenceLine
                  key={value}
                  x={value}
                  stroke="#FF0000"
                  strokeDasharray="3 3"
                >
                  <Label
                    value={`${label}: ${value.toFixed(4)} USDC`}
                    position="top"
                    offset={10}
                    style={{
                      fill: theme.palette.error.main,
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  />
                </ReferenceLine>
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </Box>
      </Paper>
    </Stack>
  );
};
