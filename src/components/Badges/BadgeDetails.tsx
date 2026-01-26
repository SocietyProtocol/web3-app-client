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
import { useBadge } from "../../data/badges/useBadge";
import { useMemo } from "react";
import { OfficialChip } from "./OfficialChip";
import { CommunityChip } from "./CommunityChip";
import { MiniProfileCard } from "../MiniProfileCard/MiniProfileCard";
import { useProfile } from "../AccountSetup/useProfile";
import { BadgePermissions } from "./BadgePermissions";
import { BadgeManagers } from "./BadgeManagers";
import { getBadgePermissions } from "../../data/badges/utils";

export interface BadgeDetailsProps {
  id: string;
}

export const BadgeDetails = ({ id }: BadgeDetailsProps) => {
  const router = useRouter();

  const { address: userAddress } = useAccount();

  const { data, isLoading } = useBadge(id);

  const creatorAddress = data?.badge?.creatorAddress
    ? (data?.badge?.creatorAddress as Address)
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
                fontSize: { xs: "0.875rem", sm: "1rem" },
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

      {/* Creator Handle and Manage Button */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={{ xs: 2, sm: 5 }}
        alignItems="center"
      >
        {data?.badge?.creatorAddress && (
          <MiniProfileCard
            address={creatorAddress}
            loading={isLoading || creator.profileData.isLoading}
            username={
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
          isLoading={isLoading}
          managers={data?.badge?.managers}
        />
      </Stack>

      {/* Actions */}
      <Stack
        direction={{
          xs: "column",
          sm: "row",
        }}
        spacing={2}
        sx={{
          width: {
            xs: "100%",
            sm: "auto",
          },
        }}
      >
        {canMint && (
          <Button
            variant="outlined"
            color="primary"
            size="medium"
            sx={{
              textTransform: "none",
              fontWeight: 600,
              width: {
                xs: "100%",
                sm: 160,
              },
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
              width: {
                xs: "100%",
                sm: 160,
              },
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
              width: {
                xs: "100%",
                sm: 160,
              },
            }}
          >
            Transfer
          </Button>
        )}
      </Stack>
    </Stack>
  );
};
