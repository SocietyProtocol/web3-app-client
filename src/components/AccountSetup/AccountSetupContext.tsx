import { createContext, useContext, ReactNode, useEffect } from "react";
import { useForm, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Address } from "viem";
import { useProfileMutation } from "./useProfileMutation";
import { ValidationError } from "@/errors/ValidationError";
import { AccountData, accountValidationSchema } from "@/validation/account";
import { useUserQuery } from "@/data/users/useUserQuery";
import { useOutpostAccount } from "@/hooks/useOutpostAccount";
import legacyAccounts from "@/consts/legacy-account-map.json";

const legacyOwners = legacyAccounts as Record<string, string>;

function previousWallet(owner?: Address): Address | undefined {
  if (!owner || !legacyOwners[owner.toLowerCase()]) return undefined;
  return owner;
}

interface AccountSetupContextType {
  form: UseFormReturn<AccountData>;
  username?: string;
  user: ReturnType<typeof useUserQuery>;
  transaction: ReturnType<typeof useProfileMutation>["transaction"];
  isUploadingToIpfs: boolean;
  onSubmit: () => void;
  serverError: Error | null;
  reset: () => void;
  getServerFieldError: (field: keyof AccountData) => string | undefined;
}

const AccountSetupContext = createContext<AccountSetupContextType | undefined>(
  undefined,
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
    username,
    user,
    transaction,
    mutate,
    isUploadingToIpfs,
    error: serverError,
    reset,
  } = useProfileMutation();
  const { ownerAddress } = useOutpostAccount();
  const smartProfileMissing =
    user.isFetched && user.data?.profile?.id === undefined;
  const previousUser = useUserQuery(
    smartProfileMissing ? previousWallet(ownerAddress) : undefined,
  );

  const form = useForm<AccountData>({
    resolver: zodResolver(accountValidationSchema),
    defaultValues: {
      name: "",
      bio: "",
      imageUrl: null,
    },
    mode: "onChange",
  });

  const onSubmit = form.handleSubmit(mutate);

  // Get server-side validation error for a field
  const getServerFieldError = (
    field: keyof AccountData,
  ): string | undefined => {
    if (serverError instanceof ValidationError) {
      return serverError.details?.[field]?.[0];
    }
    return undefined;
  };

  // Prefill from the smart-account profile, or from the old wallet the first time.
  useEffect(() => {
    if (!user.isFetched) return;

    if (user.data?.profile?.id !== undefined) {
      form.reset({
        name: user.data.name || "",
        bio: user.data.bio || "",
        imageUrl: user.data.imageUrl || null,
      });
      return;
    }

    if (!previousUser.isFetched || !previousUser.data?.profile?.id) return;
    const previous = previousUser.data;
    form.reset({
      name: previous.name || previous.metadata?.name || "",
      bio: previous.bio || previous.metadata?.bio || "",
      imageUrl: previous.imageUrl || previous.metadata?.imageUrl || null,
    });
  }, [user.isFetched, user.data, previousUser.isFetched, previousUser.data, form]);

  return (
    <AccountSetupContext.Provider
      value={{
        form,
        username,
        user,
        transaction,
        onSubmit,
        isUploadingToIpfs,
        serverError,
        reset,
        getServerFieldError,
      }}
    >
      {children}
    </AccountSetupContext.Provider>
  );
};
