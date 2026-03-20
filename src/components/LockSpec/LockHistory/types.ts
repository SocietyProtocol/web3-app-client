import { Hex } from "viem";

export enum LockOperationType {
  Lock = "lock",
  Claim = "claim",
}

export interface LockHistoryItem {
  id: Hex; // This is the txHash
  type: LockOperationType;
  amount: string;
  lockDate: string | null;
  unlockDate: string;
}
