import { Stack, Button, Grid, Skeleton } from "@mui/material";
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
import { CardRow } from "../Cards/CardRow";
import { Page } from "../Page/Page";

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
    <Page title={`${username}'s Profile`}>
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
                  suffix={specSymbol.data}
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

          <CardRow
            title={
              <>
                Badges held by {username} (
                {subgraphData.isLoading ? (
                  <Skeleton
                    variant="text"
                    width={20}
                    sx={{ display: "inline-block" }}
                  />
                ) : (
                  badgesCount
                )}
                )
              </>
            }
            loading={subgraphData.isLoading}
            items={subgraphData.data?.badges}
            renderItem={(badge) => (
              <BadgeCard
                id={badge.id}
                name={badge.name}
                imageUrl={badge.imageUrl}
                isOfficial={badge.isOfficial}
                isCommunity={badge.isCommunity}
                creatorAddress={badge.creatorAddress}
                uri={badge.uri}
                loading={badge.loading}
              />
            )}
            noneFoundText="No badges found"
            andMoreText="And {count} more badges..."
            viewAllText="View All Badges"
            viewAllOnClick={handleOpenBadgesModal}
          />

          <BadgesModal
            open={isBadgesModalOpen}
            onClose={handleCloseBadgesModal}
            username={username}
            badges={subgraphData.data?.badges || []}
          />
        </Stack>
      )}
    </Page>
  );
};
