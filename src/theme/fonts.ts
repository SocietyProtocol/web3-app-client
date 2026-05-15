import localFont from "next/font/local";
import { Space_Grotesk } from "next/font/google";

export const pptelegraf = localFont({
  src: [
    {
      path: "../../public/fonts/pptelegraf-ultralight.otf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../../public/fonts/pptelegraf-regular.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/pptelegraf-regular.otf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/pptelegraf-ultrabold.otf",
      weight: "700",
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
      weight: "100 900",
      style: "normal",
    },
    {
      path: "../../public/fonts/Inter-Italic-VariableFont_opsz,wght.ttf",
      weight: "100 900",
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
