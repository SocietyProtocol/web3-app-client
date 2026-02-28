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
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { isEqualCaseInsensitive, truncateAddress } from "@/utils/string";
import { Hex } from "viem";
import { Logo } from "../icons/Logo";
import { useBadge } from "../../data/badges/useBadge";
import { useMemo, useState, useEffect } from "react";
import { OfficialChip } from "./OfficialChip";
import { CommunityChip } from "./CommunityChip";
import { UserTag } from "../User/UserTag";
import { useProfile } from "../AccountSetup/useProfile";
import { BadgePermissions } from "./BadgePermissions";
import { BadgeManagers } from "./BadgeManagers";
import { HoldersModal } from "./HoldersModal";
import { getBadgePermissions } from "../../data/badges/utils";
import { UserCard } from "../User/UserCard";
import { BadgeActions } from "./BadgeActions";
import { CardRow } from "../Cards/CardRow";
import { parseAsBoolean, useQueryState } from "nuqs";
import { BadgeEditProvider } from "./BadgeEdit/BadgeEditContext";
import { BadgeDetailsEdit } from "./BadgeDetailsEdit";
import { ContentGuard } from "../Bubbles/ContentGuard";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

export interface BadgeDetailsProps {
  id: string;
}

export const BadgeDetails = ({ id }: BadgeDetailsProps) => {
  const router = useRouter();
  const [isHoldersModalOpen, setIsHoldersModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useQueryState(
    "edit",
    parseAsBoolean.withDefault(false).withOptions({
      history: "push",
    }),
  );

  const { address: userAddress } = useAccount();

  const { data, isLoading, refetch } = useBadge(id);

  // Fetch metadata for editing
  const [initialEditData, setInitialEditData] = useState<{
    name: string;
    imageUrl: string | null;
    metadata: string;
    isOfficial: boolean;
    isCommunity: boolean;
  } | null>(null);

  useEffect(() => {
    const fetchMetadata = async () => {
      if (isEditing && data?.badge && !initialEditData) {
        let metadataString = "";
        if (data.badge.uri) {
          try {
            const response = await fetch(data.badge.uri);
            if (response.ok) {
              const metadata = await response.json();
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { imageUrl, ...rest } = metadata;
              if (Object.keys(rest).length > 0) {
                metadataString = JSON.stringify(rest, null, 2);
              }
            }
          } catch (error) {
            console.error("Error fetching metadata from IPFS:", error);
          }
        }

        setInitialEditData({
          name: data.badge.name || "",
          imageUrl: data.badge.imageUrl || null,
          metadata: metadataString,
          isOfficial: data.badge.isOfficial ?? false,
          isCommunity: data.badge.isCommunity ?? false,
        });
      }
    };

    fetchMetadata();
  }, [isEditing, data?.badge, initialEditData]);

  const creatorAddress = data?.badge?.creatorAddress
    ? (data?.badge?.creatorAddress as Hex)
    : undefined;

  const creator = useProfile(creatorAddress);

  const isManager = useMemo(() => {
    if (!data?.badge?.managers || !userAddress) return false;

    const managers = data?.badge?.managers;

    return managers.some((manager) =>
      isEqualCaseInsensitive(manager.id, userAddress),
    );
  }, [data?.badge?.managers, userAddress]);

  const { canMint, canBurn, canTransfer } = useMemo(
    () =>
      data?.badge && userAddress
        ? getBadgePermissions(data?.badge, userAddress)
        : { canMint: false, canBurn: false, canTransfer: false },
    [data?.badge, userAddress],
  );

  const holdersCount = data?.badge?.holders?.length ?? 0;

  const handleOpenHoldersModal = () => {
    setIsHoldersModalOpen(true);
  };

  const handleCloseHoldersModal = () => {
    setIsHoldersModalOpen(false);
  };

  const toggleEditing = () => {
    setIsEditing((prev) => !prev);
    // Reset initial edit data when closing
    if (isEditing) {
      setInitialEditData(null);
    }
  };

  const handleSaveEdit = async () => {
    // Refetch badge data after successful update
    await refetch();
    toggleEditing();
  };

  if (isEditing && initialEditData) {
    return (
      <Box
        sx={{
          py: { xs: 2, md: 3 },
          px: { xs: 2, sm: 0 },
          width: "100%",
        }}
      >
        <ContentGuard requireNetwork showBackButton>
          <BadgeEditProvider badgeId={id} initialData={initialEditData}>
            <BadgeDetailsEdit
              onCancel={toggleEditing}
              onSave={handleSaveEdit}
              badgeName={data?.badge?.name ?? ""}
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
      {/* Back Button */}
      <Box
        sx={{
          alignSelf: "flex-start",
        }}
      >
        <Button
          variant="text"
          onClick={() => router.back()}
          startIcon={<ArrowBackIcon sx={{ fontSize: "14px !important" }} />}
          sx={{
            color: "primary.main",
            fontSize: { xs: "0.875rem", sm: "1rem" },
            textTransform: "none",
            fontWeight: 600,
            minWidth: { xs: "auto", sm: "64px" },
            px: { xs: 1, sm: 2 },
          }}
          aria-label="Go back"
        >
          <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
            Back
          </Box>
        </Button>
      </Box>

      {/* Badge Image */}
      <Box sx={{ mt: { xs: 2, md: 5 } }}>
        {isLoading ? (
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
        variant="h4"
        sx={{
          fontSize: { xs: "1.5rem", sm: "2rem" },
          fontWeight: 700,
          color: "primary.main",
          textAlign: "center",
          px: 2,
          wordBreak: "break-word",
        }}
      >
        {isLoading ? <Skeleton width={150} /> : data?.badge?.name}
      </Typography>

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
      >
        {data?.badge?.creatorAddress && (
          <UserTag
            id={creatorAddress}
            loading={isLoading || creator.profileData.isLoading}
            name={
              creator.profileData.data?.name ??
              (creatorAddress ? truncateAddress(creatorAddress) : "")
            }
            imageUrl={creator.profileData.data?.imageUrl}
            bio={creator.profileData.data?.bio}
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
          isLoading={isLoading}
          permissionBadges={data?.badge?.minters}
        />
        <BadgePermissions
          label="Who can Burn:"
          tooltip="Holders of this badge have permission to burn badges."
          isLoading={isLoading}
          permissionBadges={data?.badge?.burners}
        />
        <BadgePermissions
          label="Who can Transfer:"
          tooltip="Holders of this badge have permission to transfer badges."
          isLoading={isLoading}
          permissionBadges={data?.badge?.transferers}
        />
        <BadgeManagers
          label="Who can Manage:"
          tooltip="These are the users who can manage the badge."
          loading={isLoading}
          managers={data?.badge?.managers}
        />
        <BadgeActions
          id={id}
          loading={isLoading}
          canMint={canMint}
          canBurn={canBurn}
          canTransfer={canTransfer}
        />
      </Stack>

      <CardRow
        title={
          <>
            Holders (
            {isLoading ? <Skeleton variant="text" width={20} /> : holdersCount})
          </>
        }
        loading={isLoading}
        items={data?.badge?.holders}
        minItemWidth={140}
        renderItem={(holder) => (
          <UserCard
            id={holder.id as Hex}
            name={holder.name ?? truncateAddress(holder.id as Hex)}
            bio={holder.bio}
            imageUrl={holder.imageUrl}
            loading={holder.loading}
            size="small"
            highlightYou
            link
          />
        )}
        andMoreText="And {count} more holders..."
        noneFoundText="No holders found"
        viewAllText="View All Holders"
        viewAllOnClick={handleOpenHoldersModal}
        sx={{
          width: "100%",
        }}
      />

      <HoldersModal
        open={isHoldersModalOpen}
        onClose={handleCloseHoldersModal}
        badgeName={data?.badge?.name ?? "Badge"}
        holders={data?.badge?.holders || []}
      />
    </Stack>
  );
};
