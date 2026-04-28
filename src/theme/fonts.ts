import localFont from "next/font/local";
import { Inter, Space_Grotesk } from "next/font/google";

export const pptelegraf = localFont({
  src: "../../public/fonts/pptelegraf-regular.otf",
  variable: "--font-pptelegraf",
  display: "swap",
});

export const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});
