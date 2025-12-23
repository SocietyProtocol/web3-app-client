import { Stack, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

export interface ChainProps {
  chain:
    | {
        hasIcon: boolean;
        iconUrl?: string | undefined;
        iconBackground?: string | undefined;
        id: number;
        name?: string | undefined;
        unsupported?: boolean | undefined;
      }
    | undefined;
}

const ConnectionDot = styled("span")<{
  active: boolean;
}>(({ theme, active }) => ({
  width: "8px",
  height: "8px",
  borderRadius: "50%",
  backgroundColor: active
    ? theme.palette.success.main
    : theme.palette.error.main,
}));

export const Chain = ({ chain }: ChainProps) => {
  return (
    <Stack direction="row" spacing={0.5} alignItems="center">
      <ConnectionDot active={!!chain && !chain.unsupported} />
      <Typography
        color={chain?.unsupported ? "error" : "success"}
        fontSize={9}
        fontWeight={400}
        lineHeight="8px"
        component="span"
        textTransform="none"
      >
        {chain ? chain.name : "Unsupported chain"}
      </Typography>
    </Stack>
  );
};
