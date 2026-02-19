import { Stack, Typography, Button, Grid, Box, Skeleton } from "@mui/material";
import { useProfile } from "./useProfile";
import { useAccount } from "wagmi";
import { useMemo, useState } from "react";
import { AccountDetailsEdit } from "./AccountDetailsEdit";
import { AccountSkeleton } from "./AccountSkeleton";
import { AccountSetupProvider } from "./AccountSetupContext";
import { AccountStat } from "./AccountStat";
import { UserCard } from "../User/UserCard";
import { ProfileDataCard } from "../ProfileDataCard/ProfileDataCard";
import { ProfileDataCardSkeleton } from "../ProfileDataCard/ProfileDataCardSkeleton";
import { Address } from "viem";
import { BadgeCard } from "../Badges/BadgeCard";
import { BadgesModal } from "../Badges/BadgesModal";
import { truncateAddress } from "@/utils/string";
import { ContentGuard } from "../Bubbles/ContentGuard";
import { parseAsBoolean, useQueryState } from "nuqs";
import { useChainVar } from "@/hooks/useChainVar";
import { tokens } from "@/consts/tokens";
import { useFullBalanceOf } from "@/hooks/erc20/useFullBalance";
import { FormattedNumber } from "../FormattedNumber/FormattedNumber";

interface AccountDetailsProps {
  address?: Address;
  readonly?: boolean;
}

export const AccountDetails = ({ address, readonly }: AccountDetailsProps) => {
  const { address: accountAddress } = useAccount();
  const overrideAddress = address || accountAddress;

  const {
    profileId,
    profileData,
    subgraphData,

    username = overrideAddress
      ? truncateAddress(overrideAddress)
      : "Unknown User",
  } = useProfile(overrideAddress);

  const { data: profile, isLoading } = profileData;

  const tokenAddress = useChainVar(tokens.spec);

  const {
    rawBalance: specRawBalance,
    symbol: specSymbol,
    decimals: specDecimals,
    isLoading: isSpecBalanceLoading,
  } = useFullBalanceOf({
    address: overrideAddress,
    tokenAddress,
  });

  const badgesCount = useMemo(
    () => subgraphData.data?.badges?.length,
    [subgraphData.data],
  );

  const communityCount = useMemo(
    () => subgraphData.data?.badges.filter((b) => b.isCommunity).length,
    [subgraphData.data],
  );

  const [isEditing, setIsEditing] = useQueryState(
    "edit",
    parseAsBoolean.withDefault(false).withOptions({
      history: "push",
    }),
  );

  const [isBadgesModalOpen, setIsBadgesModalOpen] = useState(false);

  const toggleEditing = () => {
    setIsEditing((prev) => !prev);
  };

  const handleOpenBadgesModal = () => {
    setIsBadgesModalOpen(true);
  };

  const handleCloseBadgesModal = () => {
    setIsBadgesModalOpen(false);
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
        <ContentGuard requireNetwork showBackButton>
          <AccountSetupProvider>
            <AccountDetailsEdit
              onCancel={toggleEditing}
              onSave={toggleEditing}
            />
          </AccountSetupProvider>
        </ContentGuard>
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
              {`${username}'s Profile`}
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
            <AccountStat
              label="Total Balance"
              value={
                <FormattedNumber
                  value={specRawBalance.data}
                  symbol={specSymbol.data}
                  scaleDownDecimals={specDecimals.data}
                  component="span"
                  maxDecimals={2}
                  compact
                />
              }
              loading={isSpecBalanceLoading}
              tooltip="Total SPEC token balance."
            />

            <AccountStat
              label="Communities"
              value={
                <FormattedNumber
                  value={communityCount}
                  component="span"
                  maxDecimals={2}
                  compact
                />
              }
              loading={subgraphData.isLoading}
              tooltip="Number of communities you are a member of."
            />

            <AccountStat
              label="Badges"
              value={
                <FormattedNumber
                  value={badgesCount}
                  component="span"
                  maxDecimals={2}
                  compact
                />
              }
              loading={subgraphData.isLoading}
              tooltip="Number of badges you have earned."
            />
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
            <UserCard
              imageUrl={profile?.imageUrl}
              bio={profile?.bio}
              name={username}
              id={overrideAddress}
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
            </UserCard>

            {profileId.isLoading ? (
              <ProfileDataCardSkeleton />
            ) : (
              <ProfileDataCard
                address={overrideAddress}
                profileId={profileId.data == null ? 0 : Number(profileId.data)}
                readonly={readonly}
              />
            )}
          </Grid>

          <Box>
            <Stack direction="row" justifyContent="space-between" mb={2}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Badges held by {username} (
                {subgraphData.isLoading ? (
                  <Skeleton
                    variant="text"
                    width={20}
                    sx={{
                      display: "inline-block",
                    }}
                  />
                ) : (
                  badgesCount
                )}
                )
              </Typography>
              {badgesCount && badgesCount > 6 && (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleOpenBadgesModal}
                >
                  View All Badges
                </Button>
              )}
            </Stack>
            {badgesCount === 0 ? (
              <Stack
                justifyContent="center"
                alignItems="center"
                minHeight={100}
              >
                <Typography variant="body1" color="text.secondary">
                  No badges found
                </Typography>
              </Stack>
            ) : (
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
                {subgraphData.isLoading
                  ? Array.from({ length: 4 }).map((_, index) => (
                      <Grid
                        key={`skeleton-${index}`}
                        size={1}
                        sx={{
                          width: {
                            xs: "100%",
                            sm: "200px",
                          },
                        }}
                      >
                        <BadgeCard loading />
                      </Grid>
                    ))
                  : subgraphData.data?.badges.slice(0, 6).map((badge) => (
                      <Grid
                        key={badge.id}
                        size={1}
                        sx={{
                          width: {
                            xs: "100%",
                            sm: "200px",
                          },
                        }}
                      >
                        <BadgeCard
                          id={badge.id}
                          name={badge.name}
                          imageUrl={badge.imageUrl}
                          isOfficial={badge.isOfficial}
                          creatorAddress={badge.creatorAddress}
                          uri={badge.uri}
                        />
                      </Grid>
                    ))}

                {badgesCount && badgesCount > 6 && (
                  <Grid
                    size={1}
                    sx={{
                      width: {
                        xs: "100%",
                        sm: "200px",
                      },
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Typography
                      variant="body2"
                      color="text.primary"
                      sx={{ textAlign: "center" }}
                    >
                      And {badgesCount - 6} more badges...
                    </Typography>
                  </Grid>
                )}
              </Grid>
            )}
          </Box>

          <BadgesModal
            open={isBadgesModalOpen}
            onClose={handleCloseBadgesModal}
            username={username}
            badges={subgraphData.data?.badges || []}
          />
        </Stack>
      )}
    </Box>
  );
};
