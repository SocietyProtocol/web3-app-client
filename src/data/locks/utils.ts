import { Hex } from "viem";
import {
  execute,
  LockTransactionsDocument,
  LockTransactionsQuery,
} from "../../../.graphclient";

export const fetchLockTransactions = async (user: Hex) => {
  const res = await execute(LockTransactionsDocument, { user: user.toLowerCase() });
  return res.data as LockTransactionsQuery;
};
