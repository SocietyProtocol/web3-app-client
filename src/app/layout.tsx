import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import InitColorSchemeScript from "@mui/material/InitColorSchemeScript";
import { Suspense } from "react";
import { Providers } from "./providers";
import "@rainbow-me/rainbowkit/styles.css";
import "./globals.css";
import { LayoutContent } from "@/components/Layout/LayoutContent";
import { TopLoader } from "@/components/TopLoader/TopLoader";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/tanstack-query";
import { fetchAuctionStatus } from "@/data/auction/utils";
import { env } from "@/lib/env";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Society Protocol",
    template: "%s | Society Protocol",
  },
  description:
    "A framework for creating Synchronized Network States. The future of human coordination.",
  keywords: [
    "Society Protocol",
    "Network States",
    "Synchronized States",
    "human coordination",
    "blockchain",
    "governance",
    "web3",
    "decentralized",
  ],
  icons: {
    icon: "/logo/logo-icon-dark.svg",
    apple: "/logo/logo-icon-dark.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const queryClient = getQueryClient();

  // Prefetch auction data on the server
  await queryClient.prefetchQuery({
    queryKey: ["auctionStatus", env.auctionId],
    queryFn: () => fetchAuctionStatus(env.auctionId),
  });

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${spaceGrotesk.variable}`} suppressHydrationWarning>
        <InitColorSchemeScript attribute="class" />
        <Providers>
          <HydrationBoundary state={dehydrate(queryClient)}>
            <Suspense fallback={null}>
              <TopLoader />
            </Suspense>
            <LayoutContent>{children}</LayoutContent>
          </HydrationBoundary>
        </Providers>
      </body>
    </html>
  );
}
