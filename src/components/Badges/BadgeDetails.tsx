"use client";

import {
  Box,
  Stack,
  Avatar,
  Chip,
  Typography,
  Button,
  Skeleton,
  Link,
} from "@mui/material";
import { useAccount } from "wagmi";
import { isEqualCaseInsensitive, truncateAddress } from "@/utils/string";
import { Hex } from "viem";
import { Logo } from "../icons/Logo";
import { useBadge } from "../../data/badges/useBadge";
import { Dispatch, SetStateAction, useMemo } from "react";
import { OfficialChip } from "./OfficialChip";
import { CommunityChip } from "./CommunityChip";
import { UserTag } from "../User/UserTag";
import { BadgePermissions } from "./BadgePermissions";
import { BadgeManagers } from "./BadgeManagers";
import { getBadgePermissions } from "../../data/badges/utils";
import { BadgeActions } from "./BadgeActions";
import { BadgeEditProvider } from "./BadgeEdit/BadgeEditContext";
import { BadgeDetailsEdit } from "./BadgeEdit/BadgeDetailsEdit";
import { ContentGuard } from "../Bubbles/ContentGuard";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { UserList } from "../User/UserList";
import { useUserQuery } from "@/data/users/useUserQuery";
import { useWagmiReady } from "@/atoms/wagmiReady";

export interface BadgeDetailsProps {
  id: string;
  isEditing: boolean;
  setIsEditing: Dispatch<SetStateAction<boolean>>;
}

export const BadgeDetails = ({
  id,
  isEditing,
  setIsEditing,
}: BadgeDetailsProps) => {
  const wagmiReady = useWagmiReady();
  const { address: userAddress } = useAccount();

  const { data, isLoading } = useBadge(id);

  const showLoader = !wagmiReady || isLoading;

  const isManager = useMemo(() => {
    if (!data?.badge?.managers || !userAddress) return false;

    const managers = data?.badge?.managers;

    return managers.some((manager) =>
      isEqualCaseInsensitive(manager.id, userAddress),
    );
  }, [data?.badge?.managers, userAddress]);

  const creatorAddress = data?.badge?.creatorAddress
    ? (data?.badge?.creatorAddress as Hex)
    : undefined;

  const creator = useUserQuery(creatorAddress);

  const { canMint, canBurn, canTransfer } = useMemo(
    () =>
      data?.badge && userAddress
        ? getBadgePermissions(data?.badge, userAddress)
        : { canMint: false, canBurn: false, canTransfer: false },
    [data?.badge, userAddress],
  );

  const toggleEditing = () => {
    setIsEditing((prev) => !prev);
  };

  const handleSaveEdit = async () => {
    toggleEditing();
  };

  if (isEditing && isManager) {
    return (
      <Box
        sx={{
          p: { xs: 2, sm: 3 },
          width: "100%",
          overflow: "hidden",
        }}
      >
        <ContentGuard requireNetwork showBackButton>
          <BadgeEditProvider badgeId={id}>
            <BadgeDetailsEdit
              onCancel={toggleEditing}
              onSave={handleSaveEdit}
            />
          </BadgeEditProvider>
        </ContentGuard>
      </Box>
    );
  }

  return (
    <Stack
      spacing={{ xs: 3, md: 4 }}
      sx={{
        py: { xs: 2, md: 3 },
        px: { xs: 2, sm: 0 },
        width: "100%",
        alignItems: "center",
        position: "relative",
      }}
    >
      {/* Badge Image */}
      <Box sx={{ mt: { xs: 2, md: 5 } }}>
        {showLoader ? (
          <Skeleton
            variant="circular"
            sx={{
              width: { xs: 80, sm: 100, md: 120 },
              height: { xs: 80, sm: 100, md: 120 },
              flexShrink: 0,
            }}
          />
        ) : (
          <Avatar
            src={
              data?.badge?.imageUrl ??
              (data?.badge?.isOfficial ? "/official-badge.svg" : "/badge.svg")
            }
            alt={data?.badge?.name ?? "Badge Image"}
            sx={{
              width: { xs: 80, sm: 100, md: 120 },
              height: { xs: 80, sm: 100, md: 120 },
            }}
          />
        )}
      </Box>

      {/* Badge ID, Official/Community Label */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="center"
        spacing={{ xs: 2, sm: 3, md: 4 }}
        flexWrap="wrap"
        sx={{ gap: { xs: 1, sm: 2 } }}
      >
        <Chip
          color={data?.badge?.isOfficial ? "gold" : "default"}
          label={`ID: #${id}`}
          size="medium"
          sx={{
            height: { xs: 20, sm: 24 },
            fontSize: { xs: "0.7rem", sm: "0.8125rem" },
          }}
        />

        {data?.badge?.isOfficial && (
          <>
            <Logo
              sx={{
                fontSize: { xs: "0.875rem", sm: "1.25rem" },
                color: "text.primary",
              }}
            />
            <OfficialChip size="medium" />
          </>
        )}
        {data?.badge?.isCommunity && <CommunityChip size="medium" />}
      </Stack>

      {/* Badge Name */}
      <Typography
        component="h1"
        variant="h4"
        sx={{
          fontSize: { xs: "1.5rem", sm: "2rem" },
          fontWeight: 700,
          color: "primary.main",
          textAlign: "center",
          px: 2,
          wordBreak: "break-word",
          overflow: "hidden",
          textOverflow: "ellipsis",

          maxWidth: {
            xs: "100%",
            sm: "80%",
            md: 600,
            lg: 800,
            xl: 1000,
          },
        }}
      >
        {showLoader ? <Skeleton width={150} /> : data?.badge?.name}
      </Typography>

      {/* Badge Description */}
      {(showLoader || data?.badge?.description) && (
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{
            textAlign: "center",
            px: 2,
            maxWidth: { xs: "100%", sm: "80%", md: 600 },
            wordBreak: "break-word",
          }}
        >
          {showLoader ? <Skeleton width={280} /> : data?.badge?.description}
        </Typography>
      )}

      {/* IPFS Metadata Link */}
      {data?.badge?.uri && (
        <Link
          href={data.badge.uri}
          target="_blank"
          rel="noopener noreferrer"
          variant="body2"
          color="text.primary"
          sx={{
            mt: -1,
            display: "inline-flex",
            alignItems: "center",
            gap: 0.5,
          }}
        >
          View Metadata <OpenInNewIcon sx={{ fontSize: 16 }} />
        </Link>
      )}

      {/* Creator Handle and Manage Button */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={{ xs: 2, sm: 5 }}
        alignItems="center"
        justifyContent="center"
      >
        {data?.badge?.creatorAddress && (
          <UserTag
            id={creatorAddress}
            loading={showLoader || creator.isLoading}
            name={
              creator.data?.name ??
              (creatorAddress ? truncateAddress(creatorAddress) : "")
            }
            imageUrl={creator.data?.imageUrl}
            bio={creator.data?.bio}
            link
          />
        )}
        {isManager && (
          <Button
            variant="outlined"
            color="primary"
            size="small"
            onClick={() => setIsEditing(true)}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              width: { xs: "100%", sm: 160 },
              maxWidth: { xs: 300, sm: 160 },
            }}
          >
            Manage
          </Button>
        )}
      </Stack>

      {/* Permissions */}
      <Stack
        spacing={1}
        sx={{
          width: {
            xs: "100%",
            sm: "90%",
            md: 560,
          },
          maxWidth: 560,
        }}
      >
        <BadgePermissions
          label="Who can Mint:"
          tooltip="Holders of this badge have permission to mint new badges."
          isLoading={showLoader}
          permissionBadges={data?.badge?.minters}
        />
        <BadgePermissions
          label="Who can Burn:"
          tooltip="Holders of this badge have permission to burn badges."
          isLoading={showLoader}
          permissionBadges={data?.badge?.burners}
        />
        <BadgePermissions
          label="Who can Transfer:"
          tooltip="Holders of this badge have permission to transfer badges."
          isLoading={showLoader}
          permissionBadges={data?.badge?.transferers}
        />
        <BadgeManagers
          label="Who can Manage:"
          tooltip="Managers can mint and burn this badge, and update its settings."
          loading={showLoader}
          managers={data?.badge?.managers}
        />
        <Box paddingTop={4}>
          <BadgeActions
            id={id}
            loading={showLoader}
            canMint={canMint}
            canBurn={canBurn}
            canTransfer={canTransfer}
          />
        </Box>
      </Stack>

      {/* Holders Section */}
      <UserList
        title="Holders"
        modalTitle={`Holders of ${data?.badge?.name ?? "Badge"}`}
        users={data?.badge?.holders || []}
        loading={showLoader}
        noUsersFoundText="No holders found"
        viewAllButtonText="View All Holders"
        andMoreText="And {count} more holders..."
      />
    </Stack>
  );
};
