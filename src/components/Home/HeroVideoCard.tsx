"use client";

import { useState } from "react";
import {
  Box,
  Dialog,
  DialogContent,
  IconButton,
  Typography,
  alpha,
} from "@mui/material";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

export interface HeroVideoCardProps {
  videoUrl: string;
  posterUrl?: string;
  title?: string;
  durationLabel?: string;
}

const DEFAULT_POSTER = "/videos/web3-outpost-poster.jpg";

export const HeroVideoCard = ({
  videoUrl,
  posterUrl = DEFAULT_POSTER,
  title = "Web3 Outpost",
  durationLabel = "3:48",
}: HeroVideoCardProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  return (
    <>
      <Box
        role="button"
        tabIndex={0}
        onClick={open}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            open();
          }
        }}
        aria-label={`Play "${title}" video`}
        sx={{
          position: "relative",
          width: "100%",
          height: "100%",
          minHeight: { xs: 320, md: 380 },
          borderRadius: { xs: 5, md: 6 },
          border: (theme) => `1px solid ${theme.palette.border.bubble}`,
          overflow: "hidden",
          cursor: "pointer",
          backgroundColor: "background.page",
          backgroundImage: `url(${posterUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "transform 200ms ease",
          "&:hover .hero-video-play, &:focus-visible .hero-video-play": {
            transform: "scale(1.06)",
          },
          "&:focus-visible": {
            outline: (theme) => `2px solid ${theme.palette.primary.main}`,
            outlineOffset: 2,
          },
        }}
      >
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            background: (theme) =>
              `linear-gradient(180deg, ${alpha(theme.palette.common.black, 0.2)} 0%, ${alpha(theme.palette.common.black, 0.55)} 100%)`,
          }}
        />

        <Box
          className="hero-video-play"
          sx={{
            position: "relative",
            width: { xs: 68, md: 84 },
            height: { xs: 68, md: 84 },
            borderRadius: "50%",
            backgroundColor: (theme) =>
              alpha(theme.palette.common.white, 0.92),
            color: (theme) => theme.palette.common.black,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: (theme) =>
              `0 8px 32px ${alpha(theme.palette.common.black, 0.35)}`,
            transition: "transform 200ms ease",
          }}
        >
          <PlayArrowRoundedIcon sx={{ fontSize: { xs: 40, md: 52 }, ml: 0.5 }} />
        </Box>

        <Box
          sx={{
            position: "absolute",
            left: { xs: 20, md: 28 },
            bottom: { xs: 20, md: 28 },
            right: { xs: 20, md: 28 },
            display: "flex",
            flexDirection: "column",
            gap: 0.5,
            color: "common.white",
          }}
        >
          <Typography
            sx={{
              fontFamily:
                "var(--font-pptelegraf), var(--font-space-grotesk), sans-serif",
              fontSize: { xs: "0.75rem", md: "0.8125rem" },
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              opacity: 0.85,
            }}
          >
            Watch · {durationLabel}
          </Typography>
          <Typography
            variant="h4"
            component="h2"
            sx={{
              fontSize: { xs: "1.75rem", md: "2.25rem" },
              lineHeight: 1.1,
            }}
          >
            {title}
          </Typography>
        </Box>
      </Box>

      <Dialog
        open={isOpen}
        onClose={close}
        maxWidth="lg"
        fullWidth
        aria-label={`${title} video`}
        slotProps={{
          paper: {
            sx: {
              backgroundColor: "background.page",
              borderRadius: { xs: 2, md: 3 },
              overflow: "hidden",
            },
          },
        }}
      >
        <DialogContent
          sx={{
            p: 0,
            position: "relative",
            backgroundColor: "common.black",
          }}
        >
          <IconButton
            onClick={close}
            aria-label="Close video"
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              zIndex: 2,
              backgroundColor: (theme) =>
                alpha(theme.palette.common.black, 0.55),
              color: "common.white",
              "&:hover": {
                backgroundColor: (theme) =>
                  alpha(theme.palette.common.black, 0.75),
              },
            }}
          >
            <CloseRoundedIcon />
          </IconButton>
          {isOpen && (
            <Box
              component="video"
              src={videoUrl}
              poster={posterUrl}
              controls
              autoPlay
              playsInline
              preload="metadata"
              sx={{
                display: "block",
                width: "100%",
                height: "auto",
                maxHeight: "80vh",
                backgroundColor: "common.black",
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
