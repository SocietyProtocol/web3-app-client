"use client";

import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { initializeWagmiWatcher, wagmiConfig } from "@/lib/wagmi";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline, IconButton } from "@mui/material";
import { theme } from "@/theme/theme";
import { Avatar } from "@/components/Avatar/Avatar";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import { closeSnackbar, SnackbarProvider } from "notistack";
import { StyledMaterialDesignContent } from "@/components/Snackbar/Snackbar";
import { Provider as JotaiProvider } from "jotai";
import { jotaiStore } from "@/lib/jotai";
import { useEffect } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary/ErrorBoundary";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import { getQueryClient } from "@/lib/tanstack-query";
import { LoadingBarContainer } from "react-top-loading-bar";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import "@/patches/bigintToJsonPatch"; // Import the instrumentation to patch BigInt serialization

const queryClient = getQueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initializeWagmiWatcher();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AppRouterCacheProvider>
        <WagmiProvider config={wagmiConfig}>
          <JotaiProvider store={jotaiStore}>
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
                <NuqsAdapter>
                  <SnackbarProvider
                    anchorOrigin={{
                      horizontal: "center",
                      vertical: "bottom",
                    }}
                    Components={{
                      default: StyledMaterialDesignContent,
                      error: StyledMaterialDesignContent,
                      success: StyledMaterialDesignContent,
                      warning: StyledMaterialDesignContent,
                      info: StyledMaterialDesignContent,
                    }}
                    maxSnack={3}
                    action={(key) => (
                      <IconButton
                        onClick={() => closeSnackbar(key)}
                        size="small"
                      >
                        <CloseOutlinedIcon fontSize="small" />
                      </IconButton>
                    )}
                  >
                    <ErrorBoundary>
                      <LoadingBarContainer
                        props={{
                          color: "#ffffff",
                          style: {
                            boxShadow:
                              "rgb(255, 255, 255) 0px 0px 10px, rgb(255, 255, 255) 0px 0px 10px",
                          },
                        }}
                      >
                        {children}
                      </LoadingBarContainer>
                    </ErrorBoundary>
                  </SnackbarProvider>
                </NuqsAdapter>
              </RainbowKitProvider>
            </ThemeProvider>
          </JotaiProvider>
        </WagmiProvider>
      </AppRouterCacheProvider>
    </QueryClientProvider>
  );
}
