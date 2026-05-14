import { Avatar, Button, Stack, Typography } from "@mui/material";
import Link from "next/link";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { Hex } from "viem";
import { useReadContract } from "wagmi";
import { useExplorerLinkBuilder } from "@/hooks/useExplorerLinkBuilder";
import { CommunityRegistryAbi } from "@/abis/CommunityRegistry";
import { useChainVar } from "@/hooks/useChainVar";
import { contracts } from "@/consts/contracts";

export interface CommunityCreatedScreenProps {
  communityId: bigint;
  communityImage: string | null;
  txHash: Hex;
}

export const CommunityCreatedScreen = ({
  communityId,
  communityImage,
  txHash,
}: CommunityCreatedScreenProps) => {
  const buildLink = useExplorerLinkBuilder();
  const txUrl = buildLink({ tx: txHash });

  const registryAddress = useChainVar(contracts.communityRegistry);
  const { data: details } = useReadContract({
    address: registryAddress,
    abi: CommunityRegistryAbi,
    functionName: "getCommunityDetails",
    args: [communityId],
    query: {
      enabled: !!communityId,
    },
  });

  const communityName = details?.name ?? "";

  return (
    <Stack
      alignItems="center"
      justifyContent="center"
      spacing={3}
      sx={{ py: 8, px: 4, textAlign: "center" }}
    >
      <CheckCircleOutlineIcon sx={{ fontSize: 72, color: "success.main" }} />

      <Typography variant="h4" component="h2" color="primary.main">
        Community Created!
      </Typography>

      <Avatar
        src={communityImage ?? undefined}
        alt={communityName}
        sx={{ width: 80, height: 80 }}
      >
        {!communityImage && communityName
          ? communityName.charAt(0).toUpperCase()
          : undefined}
      </Avatar>

      <Typography variant="h6">{communityName}</Typography>

      <Typography variant="body1" color="text.secondary">
        Your community has been successfully created on-chain.
      </Typography>

      <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
        <Button
          component={Link}
          href={`/communities/${communityId.toString()}`}
          variant="contained"
          size="large"
        >
          View Community
        </Button>

        <Button
          component="a"
          href={txUrl}
          target="_blank"
          rel="noopener noreferrer"
          variant="outlined"
          size="large"
        >
          View Transaction
        </Button>
      </Stack>
    </Stack>
  );
};
