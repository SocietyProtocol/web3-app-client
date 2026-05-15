"use client";

import { useState } from "react";
import { Box, ButtonBase, Stack, Typography } from "@mui/material";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

const distribution = [
  { label: "Affiliates", value: 25, color: "#A5D8DC" },
  { label: "Core Team", value: 7, color: "#8AABD8" },
  { label: "Treasury", value: 27, color: "#B8A4D9" },
  { label: "ICO", value: 31, color: "#9587C7" },
  { label: "Liquidity Providers", value: 5, color: "#A5C99B" },
  { label: "Retroactive Rewards", value: 5, color: "#DDA1B5" },
];

export const SpecTokenDistributionChart = () => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const active = activeIndex !== null ? distribution[activeIndex] : null;

  return (
    <Box
      sx={{
        mt: 4,
        mb: 2,
        p: { xs: 3, md: 4 },
        borderRadius: 3,
        border: (theme) => `1px solid ${theme.palette.border.area}`,
        backgroundColor: (theme) => theme.palette.background.paper,
      }}
    >
      <Stack spacing={1} sx={{ mb: 3 }}>
        <Typography
          variant="h6"
          component="h3"
          sx={{
            color: (theme) => theme.palette.primary[100],
            fontWeight: 500,
          }}
        >
          SPEC Token Distribution
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: (theme) => theme.palette.primary.main,
            fontWeight: 500,
          }}
        >
          Total Supply: 10,000,000,000 SPEC
        </Typography>
      </Stack>

      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={{ xs: 3, md: 4 }}
        alignItems="center"
        justifyContent="center"
      >
        <Box
          sx={{
            width: { xs: 240, sm: 280, md: 320 },
            height: { xs: 240, sm: 280, md: 320 },
            flexShrink: 0,
            position: "relative",
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={distribution}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius="60%"
                outerRadius="92%"
                paddingAngle={2}
                isAnimationActive={false}
                onClick={(_, index) =>
                  setActiveIndex((prev) => (prev === index ? null : index))
                }
              >
                {distribution.map((entry, index) => {
                  const isActive = activeIndex === index;
                  const isDimmed = activeIndex !== null && !isActive;
                  return (
                    <Cell
                      key={entry.label}
                      fill={entry.color}
                      fillOpacity={isDimmed ? 0.2 : 1}
                      stroke={isActive ? "#FFFFFF" : "none"}
                      strokeWidth={isActive ? 2 : 0}
                      style={{
                        cursor: "pointer",
                        transition: "fill-opacity 0.2s",
                      }}
                    />
                  );
                })}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
              textAlign: "center",
              px: 2,
            }}
          >
            {active ? (
              <>
                <Typography
                  variant="caption"
                  sx={{
                    color: active.color,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    fontWeight: 600,
                  }}
                >
                  {active.label}
                </Typography>
                <Typography
                  sx={{
                    color: "#FFFFFF",
                    fontWeight: 700,
                    fontSize: { xs: "3rem", md: "3.5rem" },
                    lineHeight: 1,
                    mt: 0.5,
                  }}
                >
                  {active.value}%
                </Typography>
              </>
            ) : (
              <>
                <Typography
                  variant="caption"
                  sx={{
                    color: (theme) => theme.palette.text.secondary,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  Total Supply
                </Typography>
                <Typography
                  sx={{
                    color: "#FFFFFF",
                    fontWeight: 700,
                    fontSize: { xs: "2.25rem", md: "2.75rem" },
                    lineHeight: 1,
                    mt: 0.5,
                  }}
                >
                  10B
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: (theme) => theme.palette.text.secondary,
                    letterSpacing: "0.08em",
                    mt: 0.5,
                  }}
                >
                  SPEC
                </Typography>
              </>
            )}
          </Box>
        </Box>

        <Box
          component="ul"
          sx={{
            listStyle: "none",
            p: 0,
            m: 0,
            display: "grid",
            gridTemplateColumns: { xs: "1fr 1fr", sm: "1fr" },
            gap: 1,
            minWidth: { md: 260 },
            width: { xs: "100%", md: "auto" },
          }}
        >
          {distribution.map(({ label, value, color }, index) => {
            const isActive = activeIndex === index;
            const isDimmed = activeIndex !== null && !isActive;

            return (
              <Box key={label} component="li">
                <ButtonBase
                  onClick={() =>
                    setActiveIndex((prev) => (prev === index ? null : index))
                  }
                  sx={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    px: 1.5,
                    py: 1,
                    borderRadius: 2,
                    textAlign: "left",
                    transition: "background-color 0.15s, opacity 0.15s",
                    opacity: isDimmed ? 0.45 : 1,
                    backgroundColor: isActive
                      ? "rgba(255, 255, 255, 0.06)"
                      : "transparent",
                    border: (theme) =>
                      `1px solid ${
                        isActive ? color : "transparent"
                      }`,
                    "&:hover": {
                      backgroundColor: "rgba(255, 255, 255, 0.04)",
                    },
                  }}
                >
                  <Box
                    aria-hidden
                    sx={{
                      width: 14,
                      height: 14,
                      borderRadius: "3px",
                      backgroundColor: color,
                      flexShrink: 0,
                      boxShadow: isActive
                        ? `0 0 0 3px ${color}33`
                        : "none",
                    }}
                  />
                  <Typography
                    variant="body2"
                    sx={{
                      color: (theme) => theme.palette.primary.main,
                      flex: 1,
                      fontWeight: isActive ? 600 : 400,
                    }}
                  >
                    {label}
                  </Typography>
                  <Typography
                    sx={{
                      color: isActive
                        ? "#FFFFFF"
                        : (theme) => theme.palette.primary.main,
                      fontVariantNumeric: "tabular-nums",
                      minWidth: 40,
                      textAlign: "right",
                      fontWeight: 700,
                      fontSize: "1.05rem",
                    }}
                  >
                    {value}%
                  </Typography>
                </ButtonBase>
              </Box>
            );
          })}
        </Box>
      </Stack>
    </Box>
  );
};
