import { ReactNode } from "react";
import Image from "next/image";
import { AuctionStatus } from "../Auction/AuctionStatus";

export interface NavigationItem {
  text: string;
  icon: ReactNode;
  url: string;
  isExternal?: boolean;
  badge?: ReactNode;
  showAuctionStatus?: boolean;
}

export const navigationItems: NavigationItem[] = [
  {
    text: "Home",
    icon: <Image src="/icons/home.svg" alt="Home" width={24} height={24} />,
    url: "/",
  },
  {
    text: "Profile",
    icon: (
      <Image src="/icons/profile.svg" alt="Profile" width={24} height={24} />
    ),
    url: "/profile",
  },
  {
    text: "Accounts",
    icon: (
      <Image src="/icons/accounts.svg" alt="Accounts" width={24} height={24} />
    ),
    url: "/accounts",
  },
  {
    text: "Badges",
    icon: <Image src="/icons/badges.svg" alt="Badges" width={24} height={24} />,
    url: "/badges",
  },
  {
    text: "SPEC Token",
    icon: (
      <Image src="/icons/spec.svg" alt="SPEC Token" width={24} height={24} />
    ),
    url: "/spec-token",
  },
  {
    text: "Governance",
    icon: (
      <Image
        src="/icons/governance.svg"
        alt="Governance"
        width={24}
        height={24}
      />
    ),
    url: "/governance",
  },
  {
    text: "Auction",
    icon: (
      <Image src="/icons/auction.svg" alt="Auction" width={24} height={24} />
    ),
    url: "/auction",
    badge: <AuctionStatus size="medium" />,
    showAuctionStatus: true,
  },
];
