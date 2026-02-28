"use client";

import {
  createContext,
  useContext,
  ReactNode,
  useMemo,
  useCallback,
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

interface BadgeEditContextType {
  form: UseFormReturn<BadgeEditInputData, unknown, BadgeEditTransformedData>;
  onSubmit: ReturnType<
    UseFormReturn<
      BadgeEditInputData,
      unknown,
      BadgeEditTransformedData
    >["handleSubmit"]
  >;
  refetch: () => Promise<unknown>;
  isMutating: boolean;
  isUploadingToIpfs: boolean;
  isWritingContract: boolean;
  isTransactionPending: boolean;
  isTransactionConfirmed: boolean;
  transactionHash: `0x${string}` | undefined;
  getServerFieldError: (field: keyof BadgeEditInputData) => string | undefined;
  reset: () => void;
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
  initialData: {
    name: string;
    imageUrl: string | null;
    metadata: string;
    isOfficial: boolean;
    isCommunity: boolean;
  };
}

export const BadgeEditProvider = ({
  children,
  badgeId,
  initialData,
}: BadgeEditProviderProps) => {
  const form = useForm<BadgeEditInputData, unknown, BadgeEditTransformedData>({
    resolver: zodResolver(badgeEditValidationSchema),
    defaultValues: initialData,
    mode: "onChange",
  });

  const {
    mutate: updateBadge,
    isMutating,
    isUploadingToIpfs,
    isWritingContract,
    isTransactionPending,
    isTransactionConfirmed,
    transactionHash,
    error: serverError,
    refetch,
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
      refetch,
      isMutating,
      isUploadingToIpfs,
      isWritingContract,
      isTransactionPending,
      isTransactionConfirmed,
      transactionHash,
      getServerFieldError,
      reset,
    }),
    [
      form,
      onSubmit,
      refetch,
      isMutating,
      isUploadingToIpfs,
      isWritingContract,
      isTransactionPending,
      isTransactionConfirmed,
      transactionHash,
      getServerFieldError,
      reset,
    ],
  );

  return (
    <BadgeEditContext.Provider value={value}>
      {children}
    </BadgeEditContext.Provider>
  );
};
