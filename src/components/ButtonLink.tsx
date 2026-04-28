"use client";
import { Button, ButtonProps } from "@mui/material";
import Link from "next/link";

export const ButtonLink = ({
  href,
  children,
  ...props
}: {
  href: string;
  children: React.ReactNode;
} & Omit<ButtonProps, "href">) => {
  return (
    <Button component={Link} href={href} {...props}>
      {children}
    </Button>
  );
};
