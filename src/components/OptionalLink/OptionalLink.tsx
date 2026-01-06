import { Link } from "@mui/material";
import NextLink from "next/link";
import { cloneElement, CSSProperties, isValidElement } from "react";

interface OptionalLinkProps {
  href?: string | false;
  children: React.ReactNode;
  target?: string;
  rel?: string;
  external?: boolean;
  style?: CSSProperties;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onMouseMove?: () => void;
}

export const OptionalLink = ({
  href,
  children,
  target,
  rel,
  external,
  style,
  ...props
}: OptionalLinkProps) => {
  if (href) {
    if (external) {
      return (
        <Link href={href} target={target} rel={rel} style={style} {...props}>
          {children}
        </Link>
      );
    } else {
      return (
        <NextLink
          href={href}
          target={target}
          rel={rel}
          style={style}
          {...props}
        >
          {children}
        </NextLink>
      );
    }
  }

  return (
    <>{isValidElement(children) ? cloneElement(children, props) : children}</>
  );
};
