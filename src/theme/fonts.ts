import localFont from "next/font/local";
import { Space_Grotesk } from "next/font/google";

export const pptelegraf = localFont({
  src: [
    {
      path: "../../public/fonts/pptelegraf-ultralight.otf",
      weight: "200",
      style: "normal",
    },
    {
      path: "../../public/fonts/pptelegraf-regular.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/pptelegraf-ultrabold.otf",
      weight: "800",
      style: "normal",
    },
  ],
  variable: "--font-pptelegraf",
  display: "swap",
});

export const inter = localFont({
  src: [
    {
      path: "../../public/fonts/Inter-VariableFont_opsz,wght.ttf",
      style: "normal",
    },
    {
      path: "../../public/fonts/Inter-Italic-VariableFont_opsz,wght.ttf",
      style: "italic",
    },
  ],
  variable: "--font-inter",
  display: "swap",
});

export const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});
