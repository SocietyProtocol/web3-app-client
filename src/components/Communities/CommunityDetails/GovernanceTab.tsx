import { Box, IconButton, Stack, Typography } from "@mui/material";
import { BubbleBase } from "@/components/Bubbles/BubbleBase";
import { URLS } from "@/consts/urls";
import XIcon from "@mui/icons-material/X";
import Image from "next/image";

export function GovernanceTab() {
  return (
    <Box sx={{ display: "flex", justifyContent: "center" }}>
      <BubbleBase
        sx={{
          minWidth: 500,
        }}
        actions={
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            justifyContent="space-between"
            sx={{ width: "100%" }}
          >
            <Typography
              variant="h6"
              sx={{ fontSize: "1.125rem" }}
              color="text.secondary"
            >
              Stay tuned for updates
            </Typography>
            <Stack direction="row" spacing={1}>
              <IconButton
                component="a"
                href={URLS.TWITTER}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Follow Society Protocol on X"
                size="large"
              >
                <XIcon />
              </IconButton>
              <IconButton
                component="a"
                href={URLS.DISCORD}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Join Society Protocol on Discord"
                size="large"
              >
                <Image
                  src="/icons/discord.svg"
                  alt="Discord"
                  width={24}
                  height={24}
                />
              </IconButton>
            </Stack>
          </Stack>
        }
      >
        <Typography
          variant="h5"
          gutterBottom
          sx={{ fontSize: "2.375rem" }}
          color="text.primary"
        >
          Coming soon
        </Typography>
      </BubbleBase>
    </Box>
  );
}
