"use client";

import { Children, useEffect, useState, ReactElement } from "react";
import { Box, type SxProps, type Theme } from "@mui/material";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import { Expandable } from "../Expandable";

interface MarkdownRendererProps {
  src: string;
  sx?: SxProps<Theme>;
}

export function MarkdownRenderer({ src, sx }: MarkdownRendererProps) {
  const [content, setContent] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadMarkdown() {
      const response = await fetch(src, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`Failed to load markdown: ${response.status}`);
      }

      const markdown = await response.text();
      setContent(markdown);
    }

    loadMarkdown().catch((error: unknown) => {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
      setContent("Failed to load content.");
    });

    return () => {
      controller.abort();
    };
  }, [src]);

  return (
    <Box
      sx={[
        {
          "& h1, & h2, & h3, & h4": {
            color: (theme) => theme.palette.primary[100],
            mt: 3,
            mb: 2,
          },
          "& p, & li": {
            color: (theme) => theme.palette.primary.main,
            lineHeight: 1.7,
            fontSize: "1.125rem",
          },
          "& ul, & ol": {
            paddingLeft: 3,
            mb: 2,
          },
          "& a": {
            color: (theme) => theme.palette.primary.main,
            textDecoration: "underline",
            fontStyle: "italic",
          },
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          a({ href, ...props }) {
            const isExternalLink =
              typeof href === "string" && /^(https?:)?\/\//.test(href);

            return (
              <a
                {...props}
                href={href}
                rel={isExternalLink ? "noopener noreferrer" : props.rel}
                target={isExternalLink ? "_blank" : props.target}
              />
            );
          },
          details({ node, children, ...props }) {
            console.log({
              node,
              props,
              children,
            });

            const summary = (
              Children.toArray(children).find((child) => {
                return (
                  typeof child === "object" &&
                  (child as ReactElement).type === "summary"
                );
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
              }) as any
            )?.props.children;

            const content = Children.toArray(children).filter((child) => {
              return !(
                typeof child === "object" &&
                (child as ReactElement).type === "summary"
              );
            });

            return <Expandable summary={summary} content={content} />;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </Box>
  );
}
