"use client";

import { Children, useEffect, useState, ReactElement, ReactNode } from "react";
import { Box, type SxProps, type Theme } from "@mui/material";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import { Expandable } from "../Expandable";

interface MarkdownRendererProps {
  src: string;
  sx?: SxProps<Theme>;
  /**
   * Optional map of `{{key}}` placeholders to replace in the fetched markdown
   * before rendering. Use for injecting runtime values (e.g. env vars) that
   * can't be hardcoded into static copy files.
   */
  replacements?: Record<string, string>;
}

export function MarkdownRenderer({
  src,
  sx,
  replacements,
}: MarkdownRendererProps) {
  const [content, setContent] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadMarkdown() {
      const response = await fetch(src, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`Failed to load markdown: ${response.status}`);
      }

      let markdown = await response.text();
      if (replacements) {
        for (const [key, value] of Object.entries(replacements)) {
          markdown = markdown.replaceAll(`{{${key}}}`, value);
        }
      }
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
  }, [src, replacements]);

  return (
    <Box
      sx={[
        {
          "& h1, & h2, & h3, & h4, & h5, & h6": {
            color: (theme) => theme.palette.primary[100],
            fontFamily:
              "var(--font-pptelegraf), var(--font-space-grotesk), sans-serif",
            fontWeight: 400,
            lineHeight: 1.2,
            mt: 5,
            mb: 2,
          },
          "& h1": { fontSize: "2.5rem" },
          "& h2": { fontSize: "2rem" },
          "& h3": { fontSize: "1.75rem" },
          "& h4": { fontSize: "1.5rem" },
          "& h5": { fontSize: "1.25rem" },
          "& h6": { fontSize: "1.125rem" },
          "& p, & li": {
            color: (theme) => theme.palette.text.primary,
            lineHeight: 1.7,
            fontSize: "1.125rem",
          },
          "& p": {
            mb: 2,
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
          img({ src, alt }) {
            if (!src || typeof src !== "string") return null;

            return (
              <Box
                sx={{
                  position: "relative",
                  width: "100%",
                  height: "auto",
                  my: 2,
                }}
              >
                <Image
                  src={src}
                  alt={alt || "Image"}
                  width={980}
                  height={550}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 980px"
                  style={{
                    width: "100%",
                    height: "auto",
                  }}
                  priority={false}
                />
              </Box>
            );
          },
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
          details({ children }) {
            const summary = (
              Children.toArray(children).find((child) => {
                return (
                  typeof child === "object" &&
                  (child as ReactElement).type === "summary"
                );
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
              }) as any
            )?.props.children as ReactNode;

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
