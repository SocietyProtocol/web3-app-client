import { Box, Stack, IconButton } from "@mui/material";
import CancelIcon from "@mui/icons-material/Cancel";

interface ValueDisplayProps<T> {
  className: string;
  disabled: boolean;
  "data-item-index": number;
  tabIndex: -1;
  onDelete: (event: unknown) => void;
  renderItem: (item: T) => React.ReactNode;
  value: string;
  item?: T;
}

export const ValueDisplay = <T,>({
  className,
  "data-item-index": index,
  tabIndex,
  onDelete,
  renderItem,
  value,
  item,
  disabled,
}: ValueDisplayProps<T>) => {
  return (
    <Box
      className={className}
      data-item-index={index}
      tabIndex={tabIndex}
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.5,
        px: 1,
        py: 0.25,
        mr: 0.5,
        mb: 0.5,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1}>
        {item ? renderItem(item) : value}

        {!disabled && (
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(e);
            }}
            sx={{
              p: 0.25,
              ml: 0.5,
              "&:hover": { bgcolor: "action.hover" },
            }}
            aria-label={`Remove ${value}`}
          >
            <CancelIcon sx={{ fontSize: 18 }} />
          </IconButton>
        )}
      </Stack>
    </Box>
  );
};
