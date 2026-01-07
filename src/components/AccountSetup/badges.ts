import { Address } from "viem";

interface BadgeData {
  id: number;
  title?: string;
  badgeImageUrl?: string;
  isOfficial?: boolean;
  createdBy?: Address;
  numberOfHolders?: number;
  metadata?: Record<string, string>;
}

export const mockBadgesData: BadgeData[] = [
  {
    id: 876,
    title: "Crypto Enthusiast",
    createdBy: "0x91555aD19D68c342E76b2a43EA4eBb90b49D27E8" as Address,
    numberOfHolders: 3,
    badgeImageUrl: "https://miro.medium.com/v2/1*kSrI8peLrUAsjEsBZ6Y72w.jpeg",
    isOfficial: false,
    metadata: {
      description:
        "Awarded to users who actively participate in crypto communities.",
      country: "Mexico",
      level: "Bronze",
    },
  },
  {
    id: 276,
    title: "Crypto Maniac",
    createdBy: "0x91555aD19D68c342E76b2a43EA4eBb90b49D27E8" as Address,
    numberOfHolders: 3,
    badgeImageUrl:
      "https://res.cloudinary.com/teepublic/image/private/s--L1-J3i16--/c_crop,x_10,y_10/c_fit,w_830/c_crop,g_north_west,h_1038,w_1038,x_-104,y_-219/l_upload:v1565806151:production:blanks:vdbwo35fw6qtflw9kezw/fl_layer_apply,g_north_west,x_-215,y_-330/b_rgb:191919/c_limit,f_jpg,h_630,q_90,w_630/v1514467138/production/designs/2229601_1.jpg",
    isOfficial: false,
    metadata: {
      description:
        "Awarded to users who demonstrate exceptional enthusiasm for cryptocurrencies",
      country: "Argentina",
      chain: "Ethereum",
    },
  },
  {
    id: 19,
    title: "Filecoin Contributors",
    createdBy: "0xFB338C5fE584c026270e5DeD1C2e0AcA786a22fe" as Address,
    numberOfHolders: 1245,
    badgeImageUrl:
      "https://s3.coinmarketcap.com/static-gravity/image/dff7764bc47d4467874fce8f3670d206.png",
    isOfficial: true,
    metadata: {
      description: "Awarded to contributors of the Filecoin project.",
    },
  },
  {
    id: 149,
    title: "Protofire Contributors",
    createdBy: "0x31C2cb2cd72a0a35Bf1839a2e0d383566bf904b0" as Address,
    numberOfHolders: 12,
    badgeImageUrl: "https://protofire.io/logo192.png",
    isOfficial: true,
    metadata: {
      description: "Awarded to contributors of the Protofire project.",
    },
  },
];
