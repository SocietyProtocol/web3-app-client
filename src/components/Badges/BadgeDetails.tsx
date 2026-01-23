"use client";

import {
  Box,
  Stack,
  Avatar,
  Chip,
  Typography,
  Button,
  Skeleton,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { isEqualCaseInsensitive, truncateAddress } from "@/utils/string";
import { Address } from "viem";
import { Logo } from "../icons/Logo";
import { useBadge } from "./useBadge";
import { useMemo } from "react";
import { OfficialChip } from "./OfficialChip";
import { CommunityChip } from "./CommunityChip";
import { MiniProfileCard } from "../MiniProfileCard/MiniProfileCard";
import { useProfile } from "../AccountSetup/useProfile";
import { BadgePermissions } from "./BadgePermissions";
import { BadgeManagers } from "./BadgeManagers";
import { getBadgePermissions } from "./utils";

export interface BadgeDetailsProps {
  id: string;
}

export const BadgeDetails = ({ id }: BadgeDetailsProps) => {
  const router = useRouter();

  const { address: userAddress } = useAccount();

  const { data, isLoading } = useBadge(id);

  const creator = useProfile(data?.badge?.creatorAddress as Address);

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
        ? getBadgePermissions(data?.badge, userAddress as Address)
        : { canMint: false, canBurn: false, canTransfer: false },
    [data?.badge, userAddress],
  );

  return (
    <Stack
      spacing={4}
      sx={{
        py: 3,

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
            fontSize: 14,
            textTransform: "none",
            fontWeight: 600,
          }}
        >
          Back
        </Button>
      </Box>

      {/* Badge Image */}
      <Box>
        {isLoading ? (
          <Skeleton
            variant="circular"
            width={120}
            height={120}
            sx={{
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
            sx={{ width: 120, height: 120 }}
          />
        )}
      </Box>

      {/* Badge ID, Official/Community Label */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="center"
        spacing={4}
      >
        <Chip
          color={data?.badge?.isOfficial ? "gold" : "default"}
          label={`ID: #${id}`}
          size="medium"
          sx={{
            height: 24,
          }}
        />

        {data?.badge?.isOfficial && (
          <>
            <Logo
              sx={{
                fontSize: 24,
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
          fontSize: 32,
          fontWeight: 700,
          color: "primary.main",
          textAlign: "center",
        }}
      >
        {isLoading ? <Skeleton width={150} /> : data?.badge?.name}
      </Typography>

      {/* Creator Handle and Manage Button */}
      <Stack direction="row" spacing={5} alignItems="center">
        {data?.badge?.creatorAddress && (
          <MiniProfileCard
            address={data?.badge?.creatorAddress as Address}
            loading={isLoading || creator.profileData.isLoading}
            username={
              creator.profileData.data?.name ??
              truncateAddress(data?.badge?.creatorAddress as Address)
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
            sx={{
              textTransform: "none",
              fontWeight: 600,
              width: 160,
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
            sm: 560,
          },
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
          isLoading={isLoading}
          managers={data?.badge?.managers}
        />
      </Stack>

      {/* Actions */}
      <Stack direction="row" spacing={2}>
        {canMint && (
          <Button
            variant="outlined"
            color="primary"
            size="medium"
            sx={{
              textTransform: "none",
              fontWeight: 600,
              width: 160,
            }}
          >
            Mint
          </Button>
        )}
        {canBurn && (
          <Button
            variant="outlined"
            color="primary"
            size="medium"
            sx={{
              textTransform: "none",
              fontWeight: 600,
              width: 160,
            }}
          >
            Burn
          </Button>
        )}
        {canTransfer && (
          <Button
            variant="outlined"
            color="primary"
            size="medium"
            sx={{
              textTransform: "none",
              fontWeight: 600,
              width: 160,
            }}
          >
            Transfer
          </Button>
        )}
      </Stack>
    </Stack>
  );
};
