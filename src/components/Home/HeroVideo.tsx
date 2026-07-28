"use client";

import { Box, IconButton, Stack, Typography } from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { useRef, useState } from "react";

const VIDEO_URL =
  "https://media.societyprotocol.io/game-theory-video-final.mp4#t=1";

export const HeroVideo = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    video.play().catch(() => undefined);
    setIsPlaying(true);
  };

  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        aspectRatio: { xs: "16 / 11", md: "16 / 9" },
        borderRadius: { xs: 5, md: 6 },
        overflow: "hidden",
        backgroundColor: "background.bubble",
        border: (theme) => `1px solid ${theme.palette.border.bubble}`,
        cursor: isPlaying ? "default" : "pointer",
      }}
      onClick={!isPlaying ? handlePlay : undefined}
    >
      <video
        ref={videoRef}
        src={VIDEO_URL}
        playsInline
        controls={isPlaying}
        preload="metadata"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />

      {!isPlaying && (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: { xs: 2.5, md: 3.5 },
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.1) 35%, rgba(0,0,0,0.75) 100%)",
            pointerEvents: "none",
          }}
        >
          <Typography
            sx={{
              color: "primary.main",
              fontFamily:
                "var(--font-pptelegraf), var(--font-space-grotesk), sans-serif",
              fontSize: { xs: "0.75rem", md: "0.8125rem" },
              letterSpacing: "0.15em",
              opacity: 0.85,
            }}
          >
            GAME THEORY 101
          </Typography>

          <Stack spacing={1.5}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <IconButton
                size="small"
                sx={{
                  backgroundColor: "rgba(255,255,255,0.92)",
                  color: "common.black",
                  width: 32,
                  height: 32,
                  "&:hover": { backgroundColor: "common.white" },
                  pointerEvents: "auto",
                }}
                onClick={(event) => {
                  event.stopPropagation();
                  handlePlay();
                }}
                aria-label="Play video"
              >
                <PlayArrowIcon sx={{ fontSize: 20 }} />
              </IconButton>
              <Typography
                sx={{
                  color: "primary.main",
                  fontSize: "0.9375rem",
                  fontWeight: 500,
                }}
              >
                Watch Video
              </Typography>
            </Stack>

            <Typography
              variant="h5"
              component="h2"
              sx={{
                color: "primary.main",
                fontSize: { xs: "1.375rem", md: "1.75rem" },
                lineHeight: 1.2,
              }}
            >
              How Society Protocol Works
            </Typography>
          </Stack>
        </Box>
      )}
    </Box>
  );
};
