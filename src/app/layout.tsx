import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import InitColorSchemeScript from "@mui/material/InitColorSchemeScript";
import { Providers } from "./providers";
import "@rainbow-me/rainbowkit/styles.css";
import "./globals.css";
import { LayoutContent } from "@/components/Layout/LayoutContent";
import { TopLoader } from "@/components/TopLoader/TopLoader";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${spaceGrotesk.variable}`} suppressHydrationWarning>
        <InitColorSchemeScript attribute="class" />
        <Providers>
          <TopLoader />
          <LayoutContent>{children}</LayoutContent>
        </Providers>
      </body>
    </html>
  );
}
