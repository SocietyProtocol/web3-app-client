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
import { useMutateBadge } from "./useMutateBadge";
import {
  BadgeInputData,
  BadgeTransformedData,
  badgeValidationSchema,
} from "@/validation/badge";
import { TransactionReceipt } from "viem";
import { decodeBadgeId } from "@/data/badges/utils";
import { useRouter } from "next/navigation";
import { ValidationError } from "@/errors/ValidationError";

interface BadgeCreationContextType {
  form: UseFormReturn<BadgeInputData, unknown, BadgeTransformedData>;
  onSubmit: () => void;
  isMutating: boolean;
  isSyncing: boolean;
  isUploadingToIpfs: boolean;
  isWritingContract: boolean;
  getServerFieldError: (field: keyof BadgeInputData) => string | undefined;
  transactionReceipt?: TransactionReceipt;
  isTransactionPending: boolean;
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
    isSyncing,
    isTransactionPending,
    error: serverError,
  } = useMutateBadge({
    onSuccess: (receipt: TransactionReceipt) => {
      form.reset();

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
  const getServerFieldError = useCallback(
    (field: keyof BadgeInputData): string | undefined => {
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
      isSyncing,
      getServerFieldError,
    }),
    [
      form,
      isMutating,
      isUploadingToIpfs,
      isWritingContract,
      isTransactionPending,
      isSyncing,
      onSubmit,
      getServerFieldError,
    ],
  );

  return (
    <BadgeCreationContext.Provider value={value}>
      {children}
    </BadgeCreationContext.Provider>
  );
};
