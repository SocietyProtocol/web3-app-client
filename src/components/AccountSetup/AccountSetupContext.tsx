import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useMemo,
} from "react";
import { useAccount } from "wagmi";
import { useProfile } from "@/components/AccountSetup/useProfile";

interface AccountSetupContextType {
  referralCode: string;
  setReferralCode: (code: string) => void;
  name: string;
  setName: (name: string) => void;
  bio: string;
  setBio: (bio: string) => void;
  avatar: string | null;
  setAvatar: (avatar: string | null) => void;
  profileId?: number;
  isFetched: boolean;
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
  const { address } = useAccount();
  const profile = useProfile(address);
  const [referralCode, setReferralCode] = useState("");
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);

  const isFetched = useMemo(
    () =>
      profile.profileId.isFetched &&
      (!Boolean(profile.profileId.data) ||
        profile.profileId.data === BigInt(0) ||
        (profile.uri.isFetched && !Boolean(profile.uri.data)) ||
        profile.profileData.isFetched),
    [
      profile.profileData.isFetched,
      profile.profileId.data,
      profile.profileId.isFetched,
      profile.uri.data,
      profile.uri.isFetched,
    ]
  );

  // Prefill context state from profile data if available and context is empty
  useEffect(() => {
    if (isFetched) {
      if (profile.profileData.data) {
        const data = profile.profileData.data;
        setName((prev) => (prev ? prev : data.name || ""));
        setBio((prev) => (prev ? prev : data.bio || ""));
        setAvatar((prev) => (prev ? prev : data.avatar || null));
        if (data.referralCode) {
          setReferralCode((prev) => (prev ? prev : data.referralCode || ""));
        }
      }
    }
  }, [isFetched, profile.profileData.data]);

  return (
    <AccountSetupContext.Provider
      value={{
        referralCode,
        setReferralCode,
        name,
        setName,
        bio,
        setBio,
        avatar,
        setAvatar,
        isFetched,
        profileId:
          profile.profileId.data !== undefined
            ? Number(profile.profileId.data)
            : undefined,
      }}
    >
      {children}
    </AccountSetupContext.Provider>
  );
};
