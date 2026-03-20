"use client";

import { useAccount } from "wagmi";
import { Stack, Typography } from "@mui/material";
import { useLockHistory } from "./useLockHistory";
import { HistoryHeader } from "./HistoryHeader";
import { HistoryRowSkeleton } from "./HistoryRowSkeleton";
import { HistoryRow } from "./HistoryRow";

export const LockHistory = () => {
  const { address } = useAccount();
  const { data: history, isLoading } = useLockHistory(address);

  return (
    <Stack>
      <HistoryHeader />

      {isLoading ? (
        <>
          {Array.from({ length: 3 }).map((_, i) => (
            <HistoryRowSkeleton key={i} />
          ))}
        </>
      ) : !history?.lockTransactions?.length ? (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ textAlign: "center", py: 6 }}
        >
          No lock activity found.
        </Typography>
      ) : (
        history.lockTransactions.map((item) => (
          <HistoryRow key={item.id} item={item} />
        ))
      )}
    </Stack>
  );
};
