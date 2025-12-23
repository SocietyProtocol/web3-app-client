"use client";

import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "@/lib/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import { theme } from "@/theme/theme";
import { Avatar } from "@/components/Avatar/Avatar";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <AppRouterCacheProvider>
          <ThemeProvider theme={theme} defaultMode="dark">
            <CssBaseline enableColorScheme />
            <RainbowKitProvider
              avatar={Avatar}
              appInfo={{
                appName: "Society Protocol",
                disclaimer: ({ Text }) => (
                  <Text>
                    A framework for creating Synchronized Network States. The
                    future of human coordination.
                  </Text>
                ),
              }}
              modalSize="compact"
              theme={darkTheme({
                accentColor: "#FFFFFF",
                accentColorForeground: "#09090B",
                borderRadius: "medium",
                fontStack: "system",
                overlayBlur: "small",
              })}
            >
              {children}
            </RainbowKitProvider>
          </ThemeProvider>
        </AppRouterCacheProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
