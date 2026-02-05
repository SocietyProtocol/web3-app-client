import { Box } from "@mui/material";
import { ReactNode } from "react";
import { Footer } from "@/components/Footer/Footer";

interface MainContentAreaProps {
  children: ReactNode;
}

export const MainContentArea = ({ children }: MainContentAreaProps) => {
  return (
    <Box
      sx={{
        flexGrow: 1,
        overflowY: "auto",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderTopLeftRadius: { xs: 0, md: "10px" },
        paddingRight: { xs: 0, md: 1 },
        scrollbarGutter: "stable",
        gap: { xs: 2, sm: 4, md: 12 },
      }}
    >
      <Box
        component="main"
        sx={{
          backgroundColor: ({ palette }) => palette.background.page,
          borderRadius: { xs: 0, md: "10px" },
          flexGrow: 1,
        }}
      >
        {children}
      </Box>

      <Footer />
    </Box>
  );
};
