import { randomUUID } from "node:crypto";
import { readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildClientSchema,
  getIntrospectionQuery,
  lexicographicSortSchema,
  printSchema,
} from "graphql";

const SOURCE_ENV = "GRAPH_SCHEMA_SOURCE_URL";

const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const canonicalSDL = (introspection) => {
  const schema = buildClientSchema(introspection);
  const printed = printSchema(lexicographicSortSchema(schema));

  // Keep the generated file stable regardless of graphql's trailing whitespace.
  return `${printed.replace(/\n+$/, "")}\n`;
};

export const fetchCanonicalSDL = async (
  sourceUrl,
  fetchImpl = globalThis.fetch,
) => {
  if (!sourceUrl) {
    throw new Error(`${SOURCE_ENV} is required`);
  }
  if (typeof fetchImpl !== "function") {
    throw new Error("This Node.js runtime does not provide fetch");
  }

  let response;
  try {
    response = await fetchImpl(sourceUrl, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({ query: getIntrospectionQuery() }),
    });
  } catch {
    // Do not expose fetch's error, which can contain the configured URL.
    throw new Error("Unable to reach the GraphQL schema source");
  }

  if (!response?.ok) {
    throw new Error("The GraphQL schema source returned an unsuccessful HTTP response");
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error("The GraphQL schema source returned invalid JSON");
  }

  if (!isRecord(payload)) {
    throw new Error("The GraphQL schema response was malformed");
  }
  if (
    (Array.isArray(payload.errors) && payload.errors.length > 0) ||
    (payload.errors !== undefined &&
      payload.errors !== null &&
      !Array.isArray(payload.errors))
  ) {
    throw new Error("The GraphQL schema source returned GraphQL errors");
  }
  if (!isRecord(payload.data) || !isRecord(payload.data.__schema)) {
    throw new Error("The GraphQL schema response did not contain data.__schema");
  }

  try {
    return canonicalSDL({ __schema: payload.data.__schema });
  } catch {
    throw new Error("The GraphQL introspection schema was invalid");
  }
};

export const writeSDLAtomically = async (outputPath, sdl) => {
  const directory = dirname(outputPath);
  const temporaryPath = resolve(
    directory,
    `.${basename(outputPath)}.${process.pid}.${randomUUID()}.tmp`,
  );

  try {
    await writeFile(temporaryPath, sdl, {
      encoding: "utf8",
      flag: "wx",
      mode: 0o644,
    });
    await rename(temporaryPath, outputPath);
  } catch {
    throw new Error("Unable to write the schema output");
  } finally {
    await unlink(temporaryPath).catch(() => {});
  }
};

const parseArgs = (args) => {
  let outputPath;
  let check = false;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--check") {
      check = true;
    } else if (argument === "--output") {
      outputPath = args[index + 1];
      index += 1;
      if (!outputPath || outputPath.startsWith("--")) {
        throw new Error("--output requires a path");
      }
    } else if (argument.startsWith("--output=")) {
      outputPath = argument.slice("--output=".length);
      if (!outputPath) {
        throw new Error("--output requires a path");
      }
    } else if (argument === "--help" || argument === "-h") {
      return { help: true };
    } else {
      throw new Error("Unknown command-line option");
    }
  }

  if (check && !outputPath) {
    throw new Error("--check requires --output");
  }

  return { check, outputPath };
};

const printUsage = () => {
  process.stdout.write(
    `Usage: GRAPH_SCHEMA_SOURCE_URL=<url> node scripts/export-schema.mjs [--output <path>] [--check]\n`,
  );
};

export const main = async (args = process.argv.slice(2), env = process.env) => {
  const options = parseArgs(args);
  if (options.help) {
    printUsage();
    return;
  }

  const sdl = await fetchCanonicalSDL(env[SOURCE_ENV]);
  if (options.check) {
    let existing;
    try {
      existing = await readFile(resolve(process.cwd(), options.outputPath), "utf8");
    } catch {
      throw new Error("The schema output does not match the canonical schema");
    }
    if (existing !== sdl) {
      throw new Error("The schema output does not match the canonical schema");
    }
    return;
  }

  if (options.outputPath) {
    await writeSDLAtomically(resolve(process.cwd(), options.outputPath), sdl);
  } else {
    process.stdout.write(sdl);
  }
};

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch(() => {
    process.stderr.write("Schema export failed\n");
    process.exitCode = 1;
  });
}
