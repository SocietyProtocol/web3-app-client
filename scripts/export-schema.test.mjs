import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildSchema,
  getIntrospectionQuery,
  introspectionFromSchema,
} from "graphql";
import {
  fetchCanonicalSDL,
  formatDiagnostic,
  writeSDLAtomically,
} from "./export-schema.mjs";

const temporaryDirectories = [];
const scriptPath = fileURLToPath(new URL("./export-schema.mjs", import.meta.url));

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })),
  );
});

const introspectionPayload = () => ({
  data: introspectionFromSchema(
    buildSchema(`
      type Zed { b: String a: Int }
      type Alpha { z: Zed }
      type Query { zed: Zed alpha: Alpha }
    `),
  ),
});

describe("schema exporter", () => {
  it("reports a safe category for a CLI failure", () => {
    const env = { ...process.env };
    delete env.GRAPH_SCHEMA_SOURCE_URL;
    const result = spawnSync(process.execPath, [scriptPath], {
      encoding: "utf8",
      env,
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe(
      "Schema export failed: missing source variable: GRAPH_SCHEMA_SOURCE_URL is required\n",
    );
  });

  it("uses standard introspection and emits sorted SDL with one final newline", async () => {
    let request;
    const sdl = await fetchCanonicalSDL(
      "https://schema.invalid/graphql",
      async (_url, options) => {
        request = options;
        return { ok: true, json: async () => introspectionPayload() };
      },
    );

    expect(request.method).toBe("POST");
    expect(request.headers["content-type"]).toBe("application/json");
    expect(JSON.parse(request.body).query).toBe(getIntrospectionQuery());
    expect(sdl.indexOf("type Alpha")).toBeLessThan(sdl.indexOf("type Query"));
    expect(sdl).toContain("type Zed {\n  a: Int\n  b: String\n}");
    expect(sdl.endsWith("\n")).toBe(true);
    expect(sdl.endsWith("\n\n")).toBe(false);
  });

  it.each([
    [
      "an unreachable source",
      async () => {
        throw new Error(
          "https://private.example/graphql Authorization: Bearer secret",
        );
      },
      "unreachable source: unable to reach the GraphQL schema source",
    ],
    [
      "an unsuccessful HTTP response",
      async () => ({ ok: false }),
      "unsuccessful HTTP response: the GraphQL schema source returned an unsuccessful HTTP response",
    ],
    [
      "invalid JSON",
      async () => ({
        ok: true,
        json: async () => {
          throw new Error("response payload secret");
        },
      }),
      "invalid JSON: the GraphQL schema source returned invalid JSON",
    ],
    [
      "a malformed response",
      async () => ({ ok: true, json: async () => null }),
      "invalid introspection: the GraphQL schema response was malformed",
    ],
    [
      "GraphQL errors",
      async () => ({
        ok: true,
        json: async () => ({ errors: [{ message: "secret" }] }),
      }),
      "GraphQL errors: the GraphQL schema source returned GraphQL errors",
    ],
    [
      "a missing data.__schema",
      async () => ({ ok: true, json: async () => ({ data: {} }) }),
      "invalid introspection: the GraphQL introspection schema was invalid",
    ],
  ])(
    "rejects %s with a safe diagnostic",
    async (_description, response, expectedDiagnostic) => {
      let error;
      try {
        await fetchCanonicalSDL("https://private.example/graphql", response);
      } catch (caught) {
        error = caught;
      }

      expect(formatDiagnostic(error)).toBe(expectedDiagnostic);
      expect(error.message).not.toContain("private.example");
      expect(error.message).not.toContain("secret");
    },
  );

  it("formats only an allowlisted diagnostic for CLI failures", () => {
    const unsafeError = new Error(
      "https://private.example/graphql response secret Authorization: Bearer token ENV=value",
    );

    expect(formatDiagnostic(unsafeError)).toBe(
      "internal failure: an unexpected error occurred",
    );
    expect(formatDiagnostic(new Error("GRAPH_SCHEMA_SOURCE_URL=secret"))).not.toContain(
      "secret",
    );
  });

  it("atomically replaces an output file", async () => {
    const directory = await mkdtemp(join(tmpdir(), "schema-export-"));
    temporaryDirectories.push(directory);
    const outputPath = join(directory, "schema.graphql");

    await writeSDLAtomically(outputPath, "type Query { health: Boolean }\n");

    expect(await readFile(outputPath, "utf8")).toBe(
      "type Query { health: Boolean }\n",
    );
  });
});
