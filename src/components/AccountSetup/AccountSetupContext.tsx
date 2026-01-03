import {
  createContext,
  useContext,
  ReactNode,
  useEffect,
  useMemo,
} from "react";
import { useForm, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutateProfile } from "./useMutateProfile";
import { UseQueryResult } from "@tanstack/react-query";
import { ProfileData } from "./useProfile";
import { ValidationError } from "@/errors/ValidationError";
import { AccountData, accountValidationSchema } from "@/validation/account";

interface AccountSetupContextType {
  form: UseFormReturn<AccountData>;
  profileId?: number;
  profileData: UseQueryResult<ProfileData | null, Error>;
  isFetched: boolean;
  isLoading: boolean;
  isMutatingProfile: boolean;
  isUploadingToIpfs: boolean;
  isWritingContract: boolean;
  isTransactionPending: boolean;
  isTransactionConfirmed: boolean;
  onSubmit: () => void;
  serverError: Error | null;
  refetch: () => Promise<void>;
  reset: () => void;
  getServerFieldError: (field: keyof AccountData) => string | undefined;
}

const AccountSetupContext = createContext<AccountSetupContextType | undefined>(
  undefined
);

export const useAccountSetup = () => {
  const context = useContext(AccountSetupContext);
  if (!context) {
    throw new Error("useAccountSetup must be used within AccountSetupProvider");
  }
  return context;
};

interface AccountSetupProviderProps {
  children: ReactNode;
}

export const AccountSetupProvider = ({
  children,
}: AccountSetupProviderProps) => {
  const {
    profileId,
    profileUri,
    profileData,
    isLoading,
    mutate,
    isMutating,
    isUploadingToIpfs,
    isWritingContract,
    isTransactionPending,
    isTransactionConfirmed,
    error: serverError,
    reset,
    refetch,
  } = useMutateProfile();

  const form = useForm<AccountData>({
    resolver: zodResolver(accountValidationSchema),
    defaultValues: {
      name: "",
      bio: "",
      avatar: null,
      referralCode: "",
    },
    mode: "onChange",
  });

  const onSubmit = form.handleSubmit(mutate);

  // Get server-side validation error for a field
  const getServerFieldError = (
    field: keyof AccountData
  ): string | undefined => {
    if (serverError instanceof ValidationError) {
      return serverError.details?.[field]?.[0];
    }
    return undefined;
  };

  const isFetched = useMemo(
    () =>
      profileId.isFetched &&
      (!Boolean(profileId.data) ||
        profileId.data === BigInt(0) ||
        (profileUri.isFetched && !Boolean(profileUri.data)) ||
        profileData.isFetched),
    [
      profileData.isFetched,
      profileId.data,
      profileId.isFetched,
      profileUri.data,
      profileUri.isFetched,
    ]
  );

  // Prefill form from profile data if available
  useEffect(() => {
    if (isFetched && profileData.data) {
      const data = profileData.data;
      form.reset({
        name: data.name || "",
        bio: data.bio || "",
        avatar: data.avatar || null,
        referralCode: data.referralCode || "",
      });
    }
  }, [isFetched, profileData.data, form]);

  return (
    <AccountSetupContext.Provider
      value={{
        form,
        isFetched,
        profileId:
          profileId.data !== undefined ? Number(profileId.data) : undefined,
        profileData,
        onSubmit,
        isLoading,
        isMutatingProfile: isMutating,
        isUploadingToIpfs,
        isWritingContract,
        isTransactionPending,
        isTransactionConfirmed,
        serverError,
        refetch,
        reset,
        getServerFieldError,
      }}
    >
      {children}
    </AccountSetupContext.Provider>
  );
};
