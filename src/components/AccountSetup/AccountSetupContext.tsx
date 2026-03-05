import { createContext, useContext, ReactNode, useEffect } from "react";
import { useForm, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useProfileMutation } from "./useProfileMutation";
import { ValidationError } from "@/errors/ValidationError";
import { AccountData, accountValidationSchema } from "@/validation/account";
import { useUserQuery } from "@/data/users/useUserQuery";

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

  // Prefill form from profile data if available
  useEffect(() => {
    if (user.isFetched && user.data) {
      const data = user.data;
      form.reset({
        name: data.name || "",
        bio: data.bio || "",
        imageUrl: data.imageUrl || null,
      });
    }
  }, [user.isFetched, user.data, form]);

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
