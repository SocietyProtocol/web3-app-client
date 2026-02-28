import { useReadContract } from "wagmi";
import { useChainVar } from "./useChainVar";
import { contracts } from "@/consts/contracts";
import { ChainLinkFeedABI } from "@/abis/ChainlinkFeed";
import { formatUnits } from "viem";
import { expectedNetwork } from "@/lib/wagmi";

export const useEthPrice = () => {
  const contractAddress = useChainVar(contracts.chainlinkFeed);
  const result = useReadContract({
    address: contractAddress,
    abi: ChainLinkFeedABI,
    functionName: "latestAnswer",
    chainId: expectedNetwork.id,
    query: {
      refetchInterval: 30_000, // Refetch every 30 seconds
    },
  });

  const price = result.data ? Number(formatUnits(result.data, 8)) : null;

  return {
    price,
    ...result,
  };
};
