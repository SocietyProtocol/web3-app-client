"use client";

import { Alert, Button, Stack, Typography } from "@mui/material";
import { Address, isAddress } from "viem";
import { useBytecode, useTransactionCount } from "wagmi";
import { useUserQuery } from "@/data/users/useUserQuery";
import { useOutpostAccount } from "@/hooks/useOutpostAccount";
import { isContractWalletCode } from "@/lib/outpost-routing";
import { lightAccountAddress } from "@/lib/smart-account";
import { truncateAddress } from "@/utils/string";
import { useLegacyAccounts } from "./useLegacyAccounts";

export interface MappedRecipient {
  from: Address;
  to: Address;
}

interface RecipientAddressHintsProps {
  /** Recipients currently in the input, after legacy mapping. */
  addresses: string[];
  /** Legacy wallets that were replaced by their Society address. */
  mapped?: MappedRecipient[];
  onReplace: (from: string, to: Address) => void;
  disabled?: boolean;
  /** Addresses checked for a "this may be a wallet" hint; RPC per address. */
  maxHints?: number;
  /**
   * Offer a one-click Replace when the address is known to be a wallet.
   * Off for irreversible actions (ownership transfer): text hint only.
   */
  allowReplace?: boolean;
}

const mono = { fontFamily: "monospace" } as const;

/**
 * Hints that a pasted wallet probably wants the member's Society address.
 * Shown only when the address has no contract code (an EIP-7702 delegated
 * EOA still counts as a wallet, as in useOutpostAccount). Never blocks
 * submission.
 *
 * A Society address before its profile is created also has no code, and
 * replacing it would point at a Light Account nobody owns in the app. So
 * Replace is offered only with evidence the address is a wallet: it has
 * sent transactions (an undeployed Light Account cannot), or its own Light
 * Account already holds Outpost state.
 */
const WalletHint = ({
  address,
  onReplace,
  disabled,
  allowReplace,
}: {
  address: Address;
  onReplace: (from: string, to: Address) => void;
  disabled?: boolean;
  allowReplace: boolean;
}) => {
  const societyAddress = lightAccountAddress(address);
  const bytecode = useBytecode({
    address,
    query: { staleTime: Infinity },
  });
  const nonce = useTransactionCount({ address, query: { enabled: allowReplace } });
  const societyUser = useUserQuery(allowReplace ? societyAddress : undefined);

  if (bytecode.isLoading || bytecode.isError) return null;
  if (isContractWalletCode(bytecode.data)) return null;

  const knownWallet = (nonce.data ?? 0) > 0 || !!societyUser.data;

  return (
    <Alert
      severity="info"
      action={
        allowReplace && knownWallet ? (
          <Button
            color="inherit"
            size="small"
            disabled={disabled}
            onClick={() => onReplace(address, societyAddress)}
          >
            Replace
          </Button>
        ) : undefined
      }
    >
      <Typography variant="body2">
        If <span style={mono}>{truncateAddress(address)}</span> is a wallet, the
        member&apos;s Society address is{" "}
        <span style={mono} title={societyAddress}>
          {societyAddress}
        </span>
        . Ignore this if it is already a Society address.
      </Typography>
    </Alert>
  );
};

export const RecipientAddressHints = ({
  addresses,
  mapped = [],
  onReplace,
  disabled,
  maxHints = 5,
  allowReplace = true,
}: RecipientAddressHintsProps) => {
  const legacy = useLegacyAccounts();
  const ownSocietyAddress = useOutpostAccount().address?.toLowerCase();

  const visibleMapped = mapped.filter((m) =>
    addresses.some((a) => a.toLowerCase() === m.to.toLowerCase()),
  );

  const mappedTargets = new Set(visibleMapped.map((m) => m.to.toLowerCase()));
  const candidates = addresses.filter(
    (a) =>
      isAddress(a, { strict: false }) &&
      !mappedTargets.has(a.toLowerCase()) &&
      // A known Society address needs no hint.
      !legacy.ownerOf(a) &&
      a.toLowerCase() !== ownSocietyAddress,
  ) as Address[];

  if (!visibleMapped.length && !candidates.length) return null;

  return (
    <Stack spacing={1}>
      {visibleMapped.length > 0 && (
        <Alert severity="success">
          {visibleMapped.length === 1 ? (
            <Typography variant="body2">
              <span style={mono}>{truncateAddress(visibleMapped[0].from)}</span>{" "}
              is a migrated wallet. Using its Society address{" "}
              <span style={mono} title={visibleMapped[0].to}>
                {truncateAddress(visibleMapped[0].to)}
              </span>{" "}
              instead.
            </Typography>
          ) : (
            <Typography variant="body2">
              {visibleMapped.length} migrated wallets were replaced by their
              Society addresses.
            </Typography>
          )}
        </Alert>
      )}
      {candidates.slice(0, maxHints).map((address) => (
        <WalletHint
          key={address.toLowerCase()}
          address={address}
          onReplace={onReplace}
          disabled={disabled}
          allowReplace={allowReplace}
        />
      ))}
    </Stack>
  );
};
