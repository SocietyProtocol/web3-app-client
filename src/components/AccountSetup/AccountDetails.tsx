import {
  Paper,
  Stack,
  Typography,
  Button,
  Grid,
  Skeleton,
} from "@mui/material";
import { useProfile } from "./useProfile";
import { useAccount } from "wagmi";
import { useState } from "react";
import { AccountDetailsEdit } from "./AccountDetailsEdit";
import { AccountSkeleton } from "./AccountSkeleton";
import { AccountSetupProvider } from "./AccountSetupContext";
import { AccountStat } from "./AccountStat";
import { ProfileCard } from "../ProfileCard/ProfileCard";
import { ProfileDataCard } from "../ProfileDataCard/ProfileDataCard";
import { ProfileDataCardSkeleton } from "../ProfileDataCard/ProfileDataCardSkeleton";
import { Hex } from "viem";

interface AccountDetailsProps {
  address?: Hex;
  readonly?: boolean;
}

export const AccountDetails = ({ address, readonly }: AccountDetailsProps) => {
  const { address: accountAddress } = useAccount();
  const overrideAddress = address || accountAddress;

  const { profileId, profileData, username } = useProfile(overrideAddress);
  const { data: profile, isLoading } = profileData;

  const [isEditing, setIsEditing] = useState(false);

  const toggleEditing = () => {
    setIsEditing((prev) => !prev);
  };

  if (!overrideAddress) {
    return null;
  }

  if (!profile && isLoading) {
    return <AccountSkeleton />;
  }

  return (
    <Paper
      elevation={1}
      sx={{
        p: { xs: 2, sm: 3 },
        borderRadius: 2,
        boxShadow: "none",
        overflow: "hidden",
        backgroundColor: "background.paper",
        backgroundImage: "none",
      }}
    >
      {isEditing ? (
        <AccountSetupProvider>
          <AccountDetailsEdit onCancel={toggleEditing} onSave={toggleEditing} />
        </AccountSetupProvider>
      ) : (
        <Stack spacing={{ xs: 2, sm: 5.5 }}>
          {/* Header with Edit Button */}
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "stretch", sm: "center" }}
            spacing={{ xs: 1.5, sm: 0 }}
          >
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {`${username}'s Profile` || <Skeleton width={100} />}
            </Typography>
          </Stack>

          <Grid
            container
            columns={{
              xs: 2,
              md: 4,
            }}
            spacing={{ xs: 2, sm: 3 }}
            overflow="hidden"
          >
            <AccountStat
              label="Total Balance"
              value="0 SPEC"
              tooltip="Your total SPEC token balance."
            />
            <AccountStat
              label="Communities"
              value={2}
              tooltip="Number of communities you are a member of."
            />
            <AccountStat
              label="Badges"
              value={10}
              tooltip="Number of badges you have earned."
            />
            <AccountStat
              label="Reputation Score"
              value={1200}
              tooltip="Your overall reputation score on the platform."
            />
          </Grid>

          <Grid
            container
            columns={{
              xs: 1,
              sm: 2,
            }}
            spacing={{
              xs: 2,
              sm: 3,
            }}
            overflow="hidden"
          >
            <ProfileCard
              avatar={profile?.avatar || null}
              bio={profile?.bio || ""}
              name={username}
              address={overrideAddress}
            >
              {readonly ? null : (
                <Button
                  onClick={toggleEditing}
                  variant="outlined"
                  size="small"
                  sx={{ width: { xs: "100%", sm: "auto" } }}
                >
                  Edit
                </Button>
              )}
            </ProfileCard>

            {profileId.isLoading ? (
              <ProfileDataCardSkeleton />
            ) : (
              <ProfileDataCard
                address={overrideAddress}
                profileId={Number(profileId.data)}
              />
            )}
          </Grid>
        </Stack>
      )}
    </Paper>
  );
};
