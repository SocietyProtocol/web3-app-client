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
const LEGACY_INTROSPECTION_OPTIONS = Object.freeze({
  descriptions: true,
  directiveIsRepeatable: false,
  specifiedByUrl: false,
  inputValueDeprecation: false,
  schemaDescription: false,
  experimentalDirectiveDeprecation: false,
  oneOf: false,
  typeDepth: 9,
});

const DIAGNOSTICS = Object.freeze({
  missingSource: ["missing source variable", `${SOURCE_ENV} is required`],
  unreachableSource: ["unreachable source", "unable to reach the GraphQL schema source"],
  unsuccessfulHttp: [
    "unsuccessful HTTP response",
    "the GraphQL schema source returned an unsuccessful HTTP response",
  ],
  invalidJson: [
    "invalid JSON",
    "the GraphQL schema source returned invalid JSON",
  ],
  graphqlErrors: [
    "GraphQL errors",
    "the GraphQL schema source returned GraphQL errors",
  ],
  invalidIntrospection: [
    "invalid introspection",
    "the GraphQL introspection schema was invalid",
  ],
  malformedResponse: [
    "invalid introspection",
    "the GraphQL schema response was malformed",
  ],
  invalidArguments: ["invalid arguments", "invalid command-line arguments"],
  outputFailure: ["output failure", "unable to write the schema output"],
  checkFailure: [
    "schema check failed",
    "the schema output does not match the canonical schema",
  ],
  runtimeFailure: ["internal failure", "an unexpected error occurred"],
});

class SchemaExportError extends Error {
  constructor(code) {
    super(DIAGNOSTICS[code]?.[1] ?? DIAGNOSTICS.runtimeFailure[1]);
    this.name = "SchemaExportError";
    this.code = code;
  }
}

export const formatDiagnostic = (error) => {
  const diagnostic =
    error instanceof SchemaExportError
      ? DIAGNOSTICS[error.code]
      : undefined;
  const [category, message] = diagnostic ?? DIAGNOSTICS.runtimeFailure;
  return `${category}: ${message}`;
};

const isRecord = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const canonicalSDL = (introspection) => {
  const schema = buildClientSchema(introspection);
  const printed = printSchema(lexicographicSortSchema(schema));

  // Keep the generated file stable regardless of graphql's trailing whitespace.
  return `${printed.replace(/\n+$/, "")}\n`;
};

const requestIntrospection = async (sourceUrl, fetchImpl, query) => {
  let response;
  try {
    response = await fetchImpl(sourceUrl, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({ query }),
    });
  } catch {
    // Do not expose fetch's error, which can contain the configured URL.
    throw new SchemaExportError("unreachableSource");
  }

  if (!response?.ok) {
    throw new SchemaExportError("unsuccessfulHttp");
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new SchemaExportError("invalidJson");
  }

  if (!isRecord(payload)) {
    throw new SchemaExportError("malformedResponse");
  }
  if (
    (Array.isArray(payload.errors) && payload.errors.length > 0) ||
    (payload.errors !== undefined &&
      payload.errors !== null &&
      !Array.isArray(payload.errors))
  ) {
    return { hasGraphQLErrors: true };
  }
  if (!isRecord(payload.data) || !isRecord(payload.data.__schema)) {
    throw new SchemaExportError("invalidIntrospection");
  }

  return { hasGraphQLErrors: false, payload };
};

export const fetchCanonicalSDL = async (
  sourceUrl,
  fetchImpl = globalThis.fetch,
) => {
  if (!sourceUrl) {
    throw new SchemaExportError("missingSource");
  }
  if (typeof fetchImpl !== "function") {
    throw new SchemaExportError("runtimeFailure");
  }

  const primaryResult = await requestIntrospection(
    sourceUrl,
    fetchImpl,
    getIntrospectionQuery(),
  );
  const result = primaryResult.hasGraphQLErrors
    ? await requestIntrospection(
        sourceUrl,
        fetchImpl,
        getIntrospectionQuery(LEGACY_INTROSPECTION_OPTIONS),
      )
    : primaryResult;

  if (result.hasGraphQLErrors) {
    throw new SchemaExportError("graphqlErrors");
  }
  try {
    return canonicalSDL({ __schema: result.payload.data.__schema });
  } catch {
    throw new SchemaExportError("invalidIntrospection");
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
    throw new SchemaExportError("outputFailure");
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
        throw new SchemaExportError("invalidArguments");
      }
    } else if (argument.startsWith("--output=")) {
      outputPath = argument.slice("--output=".length);
      if (!outputPath) {
        throw new SchemaExportError("invalidArguments");
      }
    } else if (argument === "--help" || argument === "-h") {
      return { help: true };
    } else {
      throw new SchemaExportError("invalidArguments");
    }
  }

  if (check && !outputPath) {
    throw new SchemaExportError("invalidArguments");
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
      throw new SchemaExportError("checkFailure");
    }
    if (existing !== sdl) {
      throw new SchemaExportError("checkFailure");
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
  main().catch((error) => {
    process.stderr.write(`Schema export failed: ${formatDiagnostic(error)}\n`);
    process.exitCode = 1;
  });
}
