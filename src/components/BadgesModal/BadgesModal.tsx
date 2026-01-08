import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Box,
  Stack,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { BadgeCard, BadgeCardProps } from "../BadgeCard/BadgeCard";

import { Gallery } from "../Gallery/Gallery";
import { useEffect, useState } from "react";

interface BadgesModalProps {
  open: boolean;
  onClose: () => void;
  badges: BadgeCardProps[];
  username?: string;
}

export const BadgesModal = ({
  open,
  onClose,
  badges,
  username = "User",
}: BadgesModalProps) => {
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentPage(1);
    }
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>
        <Typography variant="h6" component="span" sx={{ fontWeight: 700 }}>
          All Badges held by {username} ({badges.length})
        </Typography>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            color: "text.secondary",
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Stack
          sx={{
            justifyContent: "space-between",
            width: {
              xs: "auto",
              sm: "fit-content",
            },
          }}
        >
          {badges.length === 0 ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: 200,
              }}
            >
              <Typography variant="body1" color="text.secondary">
                No badges found
              </Typography>
            </Box>
          ) : (
            <Gallery
              items={badges.map((badge) => (
                <BadgeCard {...badge} key={badge.id} />
              ))}
              itemWidth={200}
              itemHeight={180}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />

            // <>
            //   <Grid
            //     container
            //     columns={{ xs: 1, sm: 2, md: 3, lg: 4 }}
            //     spacing={{ xs: 2, md: 3 }}
            //     sx={{
            //       justifyContent: "flex-start",
            //       alignItems: "flex-start",
            //       alignContent: "flex-start",
            //       width: {
            //         xs: "auto",
            //         sm: columnsPerPage * 200 + (columnsPerPage - 1) * 24,
            //       },
            //       height: {
            //         xs: "auto",
            //         sm: rowsPerPage * 180 + (rowsPerPage - 1) * 24,
            //       },
            //     }}
            //   >
            //     {currentBadges.map((badge) => (
            //       <Grid
            //         size={1}
            //         key={badge.id}
            //         sx={{
            //           display: "flex",
            //           justifyContent: "center",
            //         }}
            //       >
            //         <BadgeCard {...badge} />
            //       </Grid>
            //     ))}
            //   </Grid>

            //   {totalPages > 1 && (
            //     <Box
            //       sx={{
            //         display: "flex",
            //         justifyContent: "center",
            //         pt: 2,
            //       }}
            //     >
            //       <Pagination
            //         count={totalPages}
            //         page={currentPage}
            //         onChange={handlePageChange}
            //         color="primary"
            //         size="large"
            //         showFirstButton
            //         showLastButton
            //       />
            //     </Box>
            //   )}
            // </>
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  );
};
