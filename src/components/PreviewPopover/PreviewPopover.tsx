import { Grow, Paper, Popper } from "@mui/material";
import {
  cloneElement,
  isValidElement,
  ReactElement,
  ReactNode,
  useEffect,
  useState,
} from "react";

interface ChildrenProps {
  onMouseEnter?: (e: React.MouseEvent) => void;
  onMouseMove?: (e: React.MouseEvent) => void;
  onMouseLeave?: (e: React.MouseEvent) => void;
}

interface PreviewPopoverProps {
  content: ReactNode;
  children: ReactElement<ChildrenProps>;
  delay?: number;
}

export const PreviewPopover = ({
  content,
  children,
  delay = 1000,
}: PreviewPopoverProps) => {
  const [timerState, setTimerState] = useState<ReturnType<typeof setTimeout>>();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(
    null
  );

  useEffect(() => {
    return () => {
      if (timerState) {
        clearTimeout(timerState);
      }
    };
  }, [timerState]);

  if (!isValidElement(children)) {
    if (process.env.NODE_ENV !== "production") {
      console.error(
        "<PreviewPopover> expects a single React element as its child."
      );
    }

    return children;
  }

  const virtualAnchor = position
    ? {
        getBoundingClientRect: () =>
          ({
            width: 0,
            height: 0,
            top: position.y,
            left: position.x,
            right: position.x,
            bottom: position.y,
          } as DOMRect),
      }
    : null;

  const onMouseEnter = (e: React.MouseEvent) => {
    children.props.onMouseEnter?.(e);

    const { clientX, clientY } = e;

    const timer = setTimeout(() => {
      setPosition({ x: clientX, y: clientY });
      setOpen(true);
    }, delay);

    setTimerState(timer);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    children.props.onMouseMove?.(e);
    if (!open) return;
    setPosition({ x: e.clientX, y: e.clientY });
  };

  const onMouseLeave = (e: React.MouseEvent) => {
    children.props.onMouseLeave?.(e);
    if (timerState) {
      clearTimeout(timerState);
      setTimerState(undefined);
    }
    setOpen(false);
    setPosition(null);
  };

  return (
    <>
      {cloneElement(children, {
        onMouseEnter,
        onMouseMove,
        onMouseLeave,
      })}

      <Popper
        open={open}
        anchorEl={virtualAnchor}
        placement="right-start"
        modifiers={[
          { name: "offset", options: { offset: [12, 12] } },
          { name: "preventOverflow", options: { padding: 8 } },
        ]}
        transition
        sx={{ pointerEvents: "none", zIndex: 1300 }}
      >
        {({ TransitionProps }) => (
          <Grow
            {...TransitionProps}
            style={{ transformOrigin: "top left" }}
            timeout={300}
          >
            <Paper
              elevation={5}
              sx={{
                background: "none",
              }}
            >
              {content}
            </Paper>
          </Grow>
        )}
      </Popper>
    </>
  );
};
