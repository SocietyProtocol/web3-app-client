import { ReactNode } from "react";
import Image from "next/image";
import { AuctionStatus } from "../Auction/AuctionStatus";
import { AuctionStatusEnum } from "../Auction/types";

export interface NavigationItem {
  text: string;
  icon: ReactNode;
  url: string;
  isExternal?: boolean;
  badge?: ReactNode;
}

export const navigationItems: NavigationItem[] = [
  {
    text: "Home",
    icon: <Image src="/icons/home.svg" alt="Home" width={24} height={24} />,
    url: "/",
  },
  {
    text: "Profile",
    icon: <Image src="/icons/box.svg" alt="Profile" width={24} height={24} />,
    url: "/profile",
  },
  {
    text: "Badges",
    icon: <Image src="/icons/layers.svg" alt="Badges" width={24} height={24} />,
    url: "/badges",
  },
  {
    text: "Information",
    icon: (
      <Image src="/icons/info.svg" alt="Information" width={24} height={24} />
    ),
    url: "/information",
  },
  {
    text: "Governance",
    icon: (
      <Image
        src="/icons/file-text.svg"
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
      <Image src="/icons/target.svg" alt="Auction" width={24} height={24} />
    ),
    url: "/auction",
    badge: <AuctionStatus status={AuctionStatusEnum.ACTIVE} />,
  },
];
