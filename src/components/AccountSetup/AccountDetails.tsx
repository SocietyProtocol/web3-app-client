import { Stack, Typography, Button, Grid, Box } from "@mui/material";
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
import { Address } from "viem";
import { mockAccountStats } from "./accountStats";
import { mockBadgesData } from "./badges";
import { BadgeCard } from "../BadgeCard/BadgeCard";

interface AccountDetailsProps {
  address?: Address;
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
    <Box
      sx={{
        p: { xs: 2, sm: 3 },
        overflow: "hidden",
      }}
    >
      {isEditing ? (
        <AccountSetupProvider>
          <AccountDetailsEdit onCancel={toggleEditing} onSave={toggleEditing} />
        </AccountSetupProvider>
      ) : (
        <Stack spacing={{ xs: 2, sm: 5 }}>
          {/* Header with Edit Button */}
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "stretch", sm: "center" }}
            spacing={{ xs: 1.5, sm: 0 }}
          >
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {username ? `${username}'s Profile` : "Unkpnown User's Profile"}
            </Typography>
          </Stack>
          {/* Stats and Profile Cards */}
          <Grid
            container
            columns={{
              xs: 2,
              md: 4,
            }}
            spacing={{ xs: 2, sm: 3 }}
            overflow="hidden"
          >
            {mockAccountStats.map((stat) => (
              <AccountStat
                key={stat.label}
                label={stat.label}
                value={stat.value}
                tooltip={stat.tooltip}
              />
            ))}
          </Grid>
          {/* Profile and Data Cards */}
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
              avatar={profile?.avatar}
              bio={profile?.bio}
              name={username ?? "Unknown User"}
              address={overrideAddress}
            >
              {!readonly && (
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

          <Grid
            container
            columns={{
              xs: 1,
              sm: 2,
              md: 4,
            }}
            spacing={{
              xs: 2,
              sm: 3,
            }}
          >
            {mockBadgesData.map((badge) => (
              <BadgeCard
                key={badge.id}
                id={badge.id}
                title={badge.title}
                badgeImageUrl={badge.badgeImageUrl}
                isOfficial={badge.isOfficial}
                createdBy={badge.createdBy}
                numberOfHolders={badge.numberOfHolders}
                metadata={badge.metadata}
              />
            ))}
          </Grid>
        </Stack>
      )}
    </Box>
  );
};
