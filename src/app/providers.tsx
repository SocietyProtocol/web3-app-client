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
import { SnackbarProvider } from "notistack";
import { StyledMaterialDesignContent } from "@/components/Snackbar/Snackbar";
import { Provider as JotaiProvider } from "jotai";
import { jotaiStore } from "@/lib/jotai";

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AppRouterCacheProvider>
        <JotaiProvider store={jotaiStore}>
          <WagmiProvider config={wagmiConfig}>
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
                  accentColor: theme.palette.primary.main,
                  accentColorForeground: theme.palette.primary.contrastText,
                  borderRadius: "medium",
                  fontStack: "system",
                  overlayBlur: "small",
                })}
              >
                <SnackbarProvider
                  Components={{ default: StyledMaterialDesignContent }}
                >
                  {children}
                </SnackbarProvider>
              </RainbowKitProvider>
            </ThemeProvider>
          </WagmiProvider>
        </JotaiProvider>
      </AppRouterCacheProvider>
    </QueryClientProvider>
  );
}
