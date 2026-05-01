import { Box } from "@mui/material";
import { Tr } from "./Tr";

export interface CommunityMembersHeaderProps {
  isManager: boolean;
}

export function CommunityMembersHeader({
  isManager,
}: CommunityMembersHeaderProps) {
  return (
    <Tr isManager={isManager} role="row">
      <Box
        role="columnheader"
        sx={{
          fontSize: (theme) => theme.typography.pxToRem(12),
        }}
      >
        Member
      </Box>
      <Box
        role="columnheader"
        sx={{
          fontSize: (theme) => theme.typography.pxToRem(12),
        }}
      >
        Joined
      </Box>
      {isManager && (
        <Box
          role="columnheader"
          textAlign="center"
          sx={{
            fontSize: (theme) => theme.typography.pxToRem(12),
          }}
        >
          Actions
        </Box>
      )}
    </Tr>
  );
}
