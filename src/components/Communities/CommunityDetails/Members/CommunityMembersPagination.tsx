import KeyboardArrowLeftRoundedIcon from "@mui/icons-material/KeyboardArrowLeftRounded";
import KeyboardArrowRightRoundedIcon from "@mui/icons-material/KeyboardArrowRightRounded";
import { Button, Pagination, Stack } from "@mui/material";

interface CommunityMembersPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (nextPage: number) => void;
}

export function CommunityMembersPagination({
  currentPage,
  totalPages,
  onPageChange,
}: CommunityMembersPaginationProps) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="center"
      spacing={1}
    >
      <Button
        variant="text"
        color="inherit"
        startIcon={<KeyboardArrowLeftRoundedIcon />}
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        sx={{ color: "text.primary", textTransform: "none" }}
      >
        Previous
      </Button>

      <Pagination
        page={currentPage}
        count={totalPages}
        onChange={(_, nextPage) => onPageChange(nextPage)}
        shape="rounded"
        color="primary"
        siblingCount={1}
        boundaryCount={1}
        hideNextButton
        hidePrevButton
        size="medium"
      />

      <Button
        variant="text"
        color="inherit"
        endIcon={<KeyboardArrowRightRoundedIcon />}
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        sx={{ color: "text.primary", textTransform: "none" }}
      >
        Next
      </Button>
    </Stack>
  );
}
