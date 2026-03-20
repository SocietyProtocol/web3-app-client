import { Hex } from "viem";
import { LockTransaction } from "../../../../.graphclient";

export enum LockOperationType {
  Lock = "lock",
  Claim = "claim",
}

export interface LockHistoryItem extends Pick<
  LockTransaction,
  "id" | "type" | "amount" | "lockDate" | "unlockDate"
> {
  id: Hex; // This is the txHash
  type: LockOperationType;
  amount: string;
  lockDate: string | null;
  unlockDate: string;
}
