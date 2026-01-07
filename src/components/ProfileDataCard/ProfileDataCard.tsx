import { Grid, Paper, Typography } from "@mui/material";
import { AddressDisplay } from "../AddressDisplay/AddressDisplay";
import { DataItem } from "./DataItem";
import { UserHandle } from "../UserHandle/UserHandle";
import { CopyButton } from "../CopyButton/CopyButton";
import { Address } from "viem";
import { ReferralCodeGenerator } from "./ReferralCodeGenerator";
import { readonly } from "zod";

interface ProfileDataCardProps {
  address: Address;
  profileId: number;
  referredBy?: Address;
}

export const ProfileDataCard = ({
  address,
  profileId,
  // This is a placeholder until referral system is implemented
  referredBy = "0xA52bdb9c052ef1365DA10E87a114e42dAa487576",
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
                color: "text.label",
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
                color: "text.label",
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              {profileId === 0 ? "N/A" : `#${profileId}`}
              {profileId !== 0 && (
                <CopyButton
                  textToCopy={`#${profileId}`}
                  tooltipText="Copy profile ID"
                />
              )}
            </Typography>
          </DataItem>
        </Grid>
        <Grid size={1} container direction="column" spacing={4}>
          <DataItem
            label="Referred by"
            tooltip="The user who referred this account."
          >
            <UserHandle address={referredBy} previewCard link />
          </DataItem>

          {!readonly && <ReferralCodeGenerator />}
        </Grid>
      </Grid>
    </Paper>
  );
};
