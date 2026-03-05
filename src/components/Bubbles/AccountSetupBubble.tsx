import { Button, Typography } from "@mui/material";
import { useAccount } from "wagmi";
import { BubbleBase } from "./BubbleBase";
import { useProfileId } from "@/data/users/useProfileId";
import { useCheckWrongNetwork } from "@/hooks/useCheckWrongNetwork";

interface AccountSetupBubbleProps {
  onActionClick?: () => void;
}

export const AccountSetupBubble = ({
  onActionClick,
}: AccountSetupBubbleProps) => {
  const { isConnected, address } = useAccount();
  const { data: profileId, isLoading } = useProfileId(address);
  const { isWrongNetwork } = useCheckWrongNetwork();

  return (
    <BubbleBase
      variant="info"
      actions={
        <Button variant="contained" fullWidth onClick={onActionClick}>
          Setup your Account
        </Button>
      }
      show={
        isConnected &&
        !isWrongNetwork &&
        (profileId === undefined || profileId === BigInt(0)) &&
        !isLoading
      }
    >
      <Typography
        variant="h5"
        gutterBottom
        sx={{ fontSize: { xs: "1.5rem", sm: "2rem" } }}
      >
        Welcome! Let&apos;s get started by setting up your account.
      </Typography>
      <br />
      <Typography variant="h6" sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}>
        No KYC needed.
      </Typography>
    </BubbleBase>
  );
};
