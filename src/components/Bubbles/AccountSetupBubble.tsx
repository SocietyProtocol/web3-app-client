import { Button, Typography } from "@mui/material";
import { useAccount } from "wagmi";
import { BubbleBase } from "./BubbleBase";
import { useProfileId } from "@/hooks/useProfileId";
import { useCheckWrongNetwork } from "@/hooks/useCheckWrongNetwork";

interface AccountSetupBubbleProps {
  show?: boolean;
  onActionClick?: () => void;
}

export const AccountSetupBubble = ({
  show,
  onActionClick,
}: AccountSetupBubbleProps) => {
  const { isConnected, address } = useAccount();
  const { data: profileId, isLoading } = useProfileId(address);
  const { isWrongNetwork } = useCheckWrongNetwork();

  return (
    <BubbleBase
      actions={
        <Button variant="contained" fullWidth onClick={onActionClick}>
          Setup your Account
        </Button>
      }
      show={
        show &&
        isConnected &&
        !isWrongNetwork &&
        (profileId === undefined || profileId === BigInt(0)) &&
        !isLoading
      }
    >
      <Typography variant="h5" gutterBottom>
        Welcome! Let&apos;s get started by setting up your account.
      </Typography>
      <br />
      <Typography variant="h6">No KYC needed. </Typography>
    </BubbleBase>
  );
};
