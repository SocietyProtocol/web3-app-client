import { Button, Grid, Paper, Typography } from "@mui/material";
import Link from "next/link";
import NorthEastIcon from "@mui/icons-material/NorthEast";
import { AddressDisplay } from "../AddressDisplay/AddressDisplay";
import { DataItem } from "./DataItem";
import { CopyButton } from "../CopyButton/CopyButton";
import { Address } from "viem";
import { ReferredBy } from "./ReferredBy";

interface ProfileDataCardProps {
  address: Address;
  profileId?: string;
  readonly?: boolean;
}

export const ProfileDataCard = ({
  address,
  profileId,
  readonly = false,
}: ProfileDataCardProps) => {
  return (
    <Paper
      elevation={1}
      sx={{
        p: 2,
        borderRadius: 2,
        boxShadow: "none",
        flex: 1,
        overflow: "hidden",
      }}
    >
      <Grid
        container
        spacing={2}
        columns={{
          xs: 1,
          lg: 2,
        }}
        sx={{
          height: "100%",
        }}
      >
        <Grid
          size={1}
          container
          direction="column"
          spacing={4}
          overflow="hidden"
        >
          <DataItem label="Associated address:">
            <AddressDisplay
              address={address}
              sx={{
                color: "text.primary",
              }}
              showCopy
              showLink
            />
          </DataItem>

          <DataItem label="Profile ID:">
            <Typography
              component="div"
              variant="body1"
              sx={{
                fontSize: (theme) => theme.typography.pxToRem(16),
                fontWeight: 500,
                color: "text.primary",
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              {!profileId || profileId === "0" ? "N/A" : `#${profileId}`}
              {profileId && profileId !== "0" && (
                <CopyButton
                  textToCopy={`#${profileId}`}
                  tooltipText="Copy profile ID"
                />
              )}
            </Typography>
          </DataItem>
        </Grid>
        <Grid size={1} container direction="column" spacing={4}>
          <ReferredBy userAddress={address} />
          {!readonly && (
            <Button
              component={Link}
              href="/referrals"
              variant="outlined"
              size="small"
              endIcon={<NorthEastIcon sx={{ fontSize: 16 }} />}
              sx={{ alignSelf: "flex-start" }}
            >
              Manage referrals
            </Button>
          )}
        </Grid>
      </Grid>
    </Paper>
  );
};
