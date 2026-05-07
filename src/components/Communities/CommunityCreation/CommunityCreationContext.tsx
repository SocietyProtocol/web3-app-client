"use client";

import { createContext, useContext, ReactNode, useMemo, useState } from "react";
import { useForm, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutateCommunity } from "./useMutateCommunity";
import {
  CommunityInputData,
  CommunityTransformedData,
  communityValidationSchema,
} from "@/validation/community";
import { TransactionReceipt } from "viem";
import { decodeCommunityId } from "@/data/communities/decodeUtils";
import { useSnackbar } from "notistack";

interface CommunityCreationContextType {
  form: UseFormReturn<CommunityInputData, unknown, CommunityTransformedData>;
  onSubmit: ReturnType<
    UseFormReturn<
      CommunityInputData,
      unknown,
      CommunityTransformedData
    >["handleSubmit"]
  >;
  isMutating: boolean;
  isSyncing: boolean;
  isUploadingToIpfs: boolean;
  isWritingContract: boolean;
  isTransactionPending: boolean;
  createdCommunityId: bigint | null;
}

const CommunityCreationContext = createContext<
  CommunityCreationContextType | undefined
>(undefined);

export const useCommunityCreation = () => {
  const context = useContext(CommunityCreationContext);
  if (!context) {
    throw new Error(
      "useCommunityCreation must be used within CommunityCreationProvider",
    );
  }
  return context;
};

interface CommunityCreationProviderProps {
  children: ReactNode;
}

export const CommunityCreationProvider = ({
  children,
}: CommunityCreationProviderProps) => {
  const [createdCommunityId, setCreatedCommunityId] = useState<bigint | null>(
    null,
  );

  const form = useForm<CommunityInputData, unknown, CommunityTransformedData>({
    resolver: zodResolver(communityValidationSchema),
    defaultValues: {
      name: "",
      description: "",
      memberBadgeMetadata: "",
      memberBadgeImageUrl: null,
      creatorBadgeImageUrl: null,
      creatorBadgeMetadata: "",
    },
    mode: "onChange",
  });

  const { enqueueSnackbar } = useSnackbar();

  const {
    mutate: createCommunity,
    isMutating,
    isUploadingToIpfs,
    isWritingContract,
    isSyncing,
    isTransactionPending,
  } = useMutateCommunity({
    onSuccess: (receipt: TransactionReceipt) => {
      const id = decodeCommunityId(receipt);
      if (id === null) {
        enqueueSnackbar(
          "Community created successfully but ID could not be retrieved. Visit your communities page to view it.",
          { variant: "warning" },
        );
        return;
      }
      setCreatedCommunityId(id);
      form.reset();
    },
  });

  const onSubmit = form.handleSubmit(createCommunity);

  const value = useMemo(
    () => ({
      form,
      onSubmit,
      isMutating,
      isUploadingToIpfs,
      isWritingContract,
      isTransactionPending,
      isSyncing,
      createdCommunityId,
    }),
    [
      form,
      onSubmit,
      isMutating,
      isUploadingToIpfs,
      isWritingContract,
      isTransactionPending,
      isSyncing,
      createdCommunityId,
    ],
  );

  return (
    <CommunityCreationContext.Provider value={value}>
      {children}
    </CommunityCreationContext.Provider>
  );
};
