"use client";

import {
  createContext,
  useContext,
  ReactNode,
  useMemo,
  useCallback,
  useEffect,
} from "react";
import { useForm, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useUpdateBadge } from "./useUpdateBadge";
import {
  BadgeEditInputData,
  BadgeEditTransformedData,
  badgeEditValidationSchema,
} from "@/validation/badgeEdit";
import { ValidationError } from "@/errors/ValidationError";
import { useFetch } from "@/hooks/useFetch";
import { useBadge } from "@/data/badges/useBadge";

interface BadgeEditContextType {
  form: UseFormReturn<BadgeEditInputData, unknown, BadgeEditTransformedData>;
  onSubmit: ReturnType<
    UseFormReturn<
      BadgeEditInputData,
      unknown,
      BadgeEditTransformedData
    >["handleSubmit"]
  >;
  isMutating: boolean;
  isUploadingToIpfs: boolean;
  isWritingContract: boolean;
  isTransactionPending: boolean;
  isTransactionConfirmed: boolean;
  transactionHash: `0x${string}` | undefined;
  getServerFieldError: (field: keyof BadgeEditInputData) => string | undefined;
  reset: () => void;
  badge?: ReturnType<typeof useBadge>;
  metadata?: ReturnType<typeof useFetch<Record<string, unknown>>>;
}

const BadgeEditContext = createContext<BadgeEditContextType | undefined>(
  undefined,
);

export const useBadgeEdit = () => {
  const context = useContext(BadgeEditContext);
  if (!context) {
    throw new Error("useBadgeEdit must be used within BadgeEditProvider");
  }
  return context;
};

interface BadgeEditProviderProps {
  children: ReactNode;
  badgeId: string;
}

export const BadgeEditProvider = ({
  children,
  badgeId,
}: BadgeEditProviderProps) => {
  const badge = useBadge(badgeId);

  const metadata = useFetch<Record<string, unknown>>(badge.data?.badge?.uri, {
    enabled: !!badge.data?.badge?.uri,
  });

  const form = useForm<BadgeEditInputData, unknown, BadgeEditTransformedData>({
    resolver: zodResolver(badgeEditValidationSchema),
    defaultValues: {
      name: badge.data?.badge?.name,
      isOfficial: badge.data?.badge?.isOfficial,
      imageUrl: badge.data?.badge?.imageUrl,
    },
    mode: "onChange",
  });

  useEffect(() => {
    if (metadata.data) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { imageUrl, ...rest } = metadata.data;
      form.reset({
        name: badge.data?.badge?.name,
        isOfficial: badge.data?.badge?.isOfficial,
        imageUrl: badge.data?.badge?.imageUrl,
        metadata: JSON.stringify(rest, null, 2),
      });
    }
  }, [
    badge.data?.badge?.imageUrl,
    badge.data?.badge?.isOfficial,
    badge.data?.badge?.name,
    form,
    metadata.data,
  ]);

  const {
    mutate: updateBadge,
    isMutating,
    isUploadingToIpfs,
    isWritingContract,
    isTransactionPending,
    isTransactionConfirmed,
    transactionHash,
    error: serverError,
    reset,
  } = useUpdateBadge({
    badgeId,
  });

  const onSubmit = form.handleSubmit(updateBadge);

  // Get server-side validation error for a field
  const getServerFieldError = useCallback(
    (field: keyof BadgeEditInputData): string | undefined => {
      if (serverError instanceof ValidationError) {
        return serverError.details?.[field]?.[0];
      }
      return undefined;
    },
    [serverError],
  );

  const value = useMemo(
    () => ({
      form,
      onSubmit,
      isMutating,
      isUploadingToIpfs,
      isWritingContract,
      isTransactionPending,
      isTransactionConfirmed,
      transactionHash,
      getServerFieldError,
      reset,
      badge,
      metadata,
    }),
    [
      form,
      onSubmit,
      isMutating,
      isUploadingToIpfs,
      isWritingContract,
      isTransactionPending,
      isTransactionConfirmed,
      transactionHash,
      getServerFieldError,
      reset,
      badge,
      metadata,
    ],
  );

  return (
    <BadgeEditContext.Provider value={value}>
      {children}
    </BadgeEditContext.Provider>
  );
};
