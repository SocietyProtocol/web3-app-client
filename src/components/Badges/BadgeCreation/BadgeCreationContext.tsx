"use client";

import { createContext, useContext, ReactNode } from "react";
import { useForm, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutateBadge } from "./useMutateBadge";
import {
  BadgeInputData,
  BadgeTransformedData,
  badgeValidationSchema,
} from "@/validation/badge";
import { ValidationError } from "@/errors/ValidationError";
import { TransactionReceipt } from "viem";
import { decodeBadgeId } from "@/data/badges/utils";
import { useRouter } from "next/navigation";

interface BadgeCreationContextType {
  form: UseFormReturn<BadgeInputData, unknown, BadgeTransformedData>;
  isMutating: boolean;
  isUploadingToIpfs: boolean;
  isWritingContract: boolean;
  isTransactionPending: boolean;
  isTransactionConfirmed: boolean;
  onSubmit: () => void;
  serverError: Error | null;
  reset: () => void;
  getServerFieldError: (field: keyof BadgeInputData) => string | undefined;
  transactionReceipt?: TransactionReceipt;
}

const BadgeCreationContext = createContext<
  BadgeCreationContextType | undefined
>(undefined);

export const useBadgeCreation = () => {
  const context = useContext(BadgeCreationContext);
  if (!context) {
    throw new Error(
      "useBadgeCreation must be used within BadgeCreationProvider",
    );
  }
  return context;
};

interface BadgeCreationProviderProps {
  children: ReactNode;
}

export const BadgeCreationProvider = ({
  children,
}: BadgeCreationProviderProps) => {
  const router = useRouter();

  const form = useForm<BadgeInputData, unknown, BadgeTransformedData>({
    resolver: zodResolver(badgeValidationSchema),
    defaultValues: {
      name: "",
      imageUrl: null,
      metadata: "",
      isOfficial: false,
      isCommunity: false,
      minters: [],
      transferers: [],
      burners: [],
      editors: [],
    },
    mode: "onChange",
  });

  const {
    mutate: createBadge,
    isMutating,
    isUploadingToIpfs,
    isWritingContract,
    isTransactionPending,
    isTransactionConfirmed,
    error: serverError,
    reset: resetMutation,
    transactionReceipt,
  } = useMutateBadge({
    onSuccess: (receipt: TransactionReceipt) => {
      form.reset();
      resetMutation();

      const createdBadgeId = decodeBadgeId(receipt);

      if (createdBadgeId) {
        // Redirect to the newly created badge details page
        router.push(`/badges/${createdBadgeId.toString()}`);
        return;
      }

      // Redirect to badges page
      router.push("/badges");
    },
  });

  const onSubmit = form.handleSubmit(createBadge);

  // Get server-side validation error for a field
  const getServerFieldError = (
    field: keyof BadgeInputData,
  ): string | undefined => {
    if (serverError instanceof ValidationError) {
      return serverError.details?.[field]?.[0];
    }
    return undefined;
  };

  const reset = () => {
    form.reset();
    resetMutation();
  };

  const value = {
    form,
    isMutating,
    isUploadingToIpfs,
    isWritingContract,
    isTransactionPending,
    isTransactionConfirmed,
    onSubmit,
    serverError,
    reset,
    getServerFieldError,
    transactionReceipt,
  };

  return (
    <BadgeCreationContext.Provider value={value}>
      {children}
    </BadgeCreationContext.Provider>
  );
};
