import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildSchema,
  getIntrospectionQuery,
  introspectionFromSchema,
} from "graphql";
import { fetchCanonicalSDL, writeSDLAtomically } from "./export-schema.mjs";

const temporaryDirectories = [];

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
    ["an unsuccessful HTTP response", async () => ({ ok: false })],
    ["GraphQL errors", async () => ({ ok: true, json: async () => ({ errors: [{ message: "secret" }] }) })],
    ["a missing data.__schema", async () => ({ ok: true, json: async () => ({ data: {} }) })],
  ])("rejects %s without revealing the source", async (_description, response) => {
    await expect(
      fetchCanonicalSDL("https://private.example/graphql", response),
    ).rejects.toThrow(/schema|HTTP|GraphQL/);
    try {
      await fetchCanonicalSDL("https://private.example/graphql", response);
    } catch (error) {
      expect(error.message).not.toContain("private.example");
      expect(error.message).not.toContain("secret");
    }
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
