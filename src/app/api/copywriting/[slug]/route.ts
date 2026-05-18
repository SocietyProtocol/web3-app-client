import { readFile } from "node:fs/promises";
import { join } from "node:path";

function stripFrontmatter(content: string) {
  if (!content.startsWith("---\n")) {
    return content;
  }

  const endIndex = content.indexOf("\n---\n", 4);

  if (endIndex === -1) {
    return content;
  }

  return content.slice(endIndex + 5);
}

const SLUG_MAP: Record<
  string,
  { file: string; contentType: string; encoding?: BufferEncoding }
> = {
  "general-info": {
    file: "src/copywriting/General Information.md",
    contentType: "text/markdown; charset=utf-8",
    encoding: "utf8",
  },
  "home-faqs": {
    file: "src/copywriting/Home FAQs.md",
    contentType: "text/markdown; charset=utf-8",
    encoding: "utf8",
  },
  "communities-faqs": {
    file: "src/copywriting/Communities FAQs.md",
    contentType: "text/markdown; charset=utf-8",
    encoding: "utf8",
  },
  governance: {
    file: "src/copywriting/Governance.md",
    contentType: "text/markdown; charset=utf-8",
    encoding: "utf8",
  },
  ico: {
    file: "src/copywriting/ICO.md",
    contentType: "text/markdown; charset=utf-8",
    encoding: "utf8",
  },
  "spec-token": {
    file: "src/copywriting/SPEC Token.md",
    contentType: "text/markdown; charset=utf-8",
    encoding: "utf8",
  },
  "general-info-image.png": {
    file: "src/copywriting/general-information.png",
    contentType: "image/png",
  },
  "spec-token-distribution.png": {
    file: "src/copywriting/spec-token-distribution.png",
    contentType: "image/png",
  },
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const entry = SLUG_MAP[slug];

  if (!entry) {
    return new Response("Not Found", { status: 404 });
  }

  const filePath = join(process.cwd(), entry.file);
  const data = await readFile(filePath, entry.encoding);
  const responseBody =
    typeof data === "string" && entry.contentType.startsWith("text/markdown")
      ? stripFrontmatter(data)
      : data;

  const headers: Record<string, string> = { "content-type": entry.contentType };
  if (!entry.encoding) {
    headers["cache-control"] = "public, max-age=3600";
  }

  return new Response(responseBody as BodyInit, { headers });
}
