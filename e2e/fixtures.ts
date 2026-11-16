import { test as base, expect, type APIRequestContext } from "@playwright/test";
import { promises as fs } from "node:fs";
import path from "node:path";
import { PERSISTED_GRAPH_DOCUMENTS } from "../src/lib/persisted-graphql.generated";
import { STACK_LOG_DIR, URLS, stackUrls } from "./env/hermetic";
import { AaTraffic } from "./support/aa/traffic";
import { installHermeticRoutes, type HermeticNetwork } from "./support/backends/routes";
import { S3Fake } from "./support/backends/s3";
import { SubgraphFake } from "./support/backends/subgraph";
import { Chain } from "./support/chain/chain";
import { createPages, type Pages } from "./support/pages";
import { SeenText } from "./support/seen-text";
import { createPersona, type Persona, type PersonaKind, type PersonaOptions } from "./support/personas";
import { personaKeyIndex, testAccount, testIpAddress } from "./support/wallet/keys";
import { TestWallet, type WalletIdentity } from "./support/wallet/test-wallet";

/**
 * Fixtures of the hermetic layer (projects `api`, `hermetic`,
 * `hermetic-serial`). Import `test` and `expect` from here in every spec.
 *
 *   persona(kind)  a fresh user of that kind, seeded on chain, and made the
 *                  wallet's account
 *   actor(kind)    the same, without touching the wallet (someone else in
 *                  the scenario)
 *   wallet         the injected test wallet and its request log
 *   aa             what the page sent to /api/aa/rpc: paymaster calls and
 *                  user operations; aa.answer() refuses them in the proxy's place
 *   seenText       every text the pages showed, also what is gone again
 *   chain          reads and seeding writes on the local fork
 *   subgraph, s3   the fakes: overlays, faults, what was uploaded
 *   pages          page objects
 *   api            HTTP client for the app's routes, with this test's IP
 *   graphql        runs one of the app's persisted queries through /api/graphql
 */
type GraphqlResult<T> = { status: number; data?: T; errors?: { message: string }[] };

type Options = {
  /** How the test wallet presents itself: as MetaMask (default) or as an unknown EIP-6963 wallet. */
  walletIdentity: WalletIdentity;
  /** "atomic" makes the wallet answer EIP-5792 (wallet_sendCalls). Default "none", like a plain EOA wallet. */
  walletCapabilities: "none" | "atomic";
};

type Fixtures = {
  /** Unique client IP of this test attempt: keys the server's in-memory rate limits. */
  testIp: string;
  /** Hands out a new test key on every call. */
  nextAccount: () => ReturnType<typeof testAccount>;
  subgraph: SubgraphFake;
  s3: S3Fake;
  chain: Chain;
  wallet: TestWallet;
  network: HermeticNetwork;
  /** The page's calls to the account-abstraction proxy, and the user operations it submitted. */
  aa: AaTraffic;
  /** Every text the pages of this test have shown, including toasts and notices that are gone again. */
  seenText: SeenText;
  /** Uncaught page exceptions and console errors of this test. */
  browserErrors: string[];
  persona: (kind: PersonaKind, options?: PersonaOptions) => Promise<Persona>;
  actor: (kind: PersonaKind, options?: PersonaOptions) => Promise<Persona>;
  pages: Pages;
  api: APIRequestContext;
  graphql: <T = unknown>(operationName: string, variables?: Record<string, unknown>) => Promise<GraphqlResult<T>>;
  resetFakes: void;
};

/**
 * The last lines of a log, read from its end: the bundler's log grows by
 * megabytes in a run, and a failed test wants the last screenful of it.
 */
async function lastLines(file: string, lines: number, maxBytes = 128 * 1024): Promise<string> {
  const handle = await fs.open(file, "r").catch(() => undefined);
  if (!handle) return "";
  try {
    const { size } = await handle.stat();
    const length = Math.min(size, maxBytes);
    const { buffer } = await handle.read(Buffer.alloc(length), 0, length, size - length);
    const all = buffer.toString("utf8").split("\n");
    // The first line is cut off when the read started inside it.
    if (length < size) all.shift();
    return all.slice(-lines).join("\n");
  } finally {
    await handle.close();
  }
}

const runSalt = () => process.env.E2E_RUN_SALT || "no-salt";

// `provide` rather than `use`: the react-hooks lint rule reads `use(...)` as a hook.
export const test = base.extend<Fixtures & Options>({
  walletIdentity: ["metamask", { option: true }],
  walletCapabilities: ["none", { option: true }],

  // The app of this worker's own stack (see "Several workers" in
  // e2e/README.md). With one worker it is the URL in the config. A project
  // that sets a base URL of its own (not the hermetic one) keeps it, though
  // the other fixtures of this file still talk to the local stack.
  baseURL: async ({ baseURL }, provide) => {
    await provide(baseURL && baseURL !== stackUrls(0).app ? baseURL : URLS.app);
  },

  testIp: async ({}, provide, testInfo) => {
    await provide(testIpAddress({ runSalt: runSalt(), testId: testInfo.testId, retry: testInfo.retry }));
  },

  nextAccount: async ({}, provide, testInfo) => {
    let sequence = 0;
    await provide(() =>
      testAccount(
        personaKeyIndex({
          runSalt: runSalt(),
          testId: testInfo.testId,
          retry: testInfo.retry,
          sequence: sequence++,
        }),
      ),
    );
  },

  subgraph: async ({}, provide) => {
    await provide(new SubgraphFake());
  },

  s3: async ({}, provide) => {
    await provide(new S3Fake());
  },

  // Overlays and injected faults of one test must not reach the next.
  resetFakes: [
    async ({ subgraph, s3 }, provide) => {
      await Promise.all([subgraph.reset(), s3.reset()]);
      await provide();
    },
    { auto: true },
  ],

  chain: async ({ subgraph }, provide) => {
    await provide(new Chain(subgraph));
  },

  network: async ({ context, testIp }, provide, testInfo) => {
    const network = await installHermeticRoutes(context, { testIp });
    await provide(network);
    network.releaseRpcFaults();
    if (network.blocked.length) {
      await testInfo.attach("blocked-requests.json", {
        body: JSON.stringify([...new Set(network.blocked)], null, 2),
        contentType: "application/json",
      });
    }
  },

  wallet: async ({ context, nextAccount, walletIdentity, walletCapabilities }, provide, testInfo) => {
    const wallet = new TestWallet({
      account: nextAccount(),
      rpcUrl: URLS.anvil,
      identity: walletIdentity,
      capabilities: walletCapabilities,
    });
    await wallet.install(context);
    await provide(wallet);
    // Method names and outcomes only: enough to see what the app asked for.
    await testInfo.attach("wallet-requests.json", {
      body: JSON.stringify(wallet.summary(), null, 2),
      contentType: "application/json",
    });
  },

  aa: async ({ context, testIp, network }, provide, testInfo) => {
    // Set up after `network`, so that its route is asked before the network rules.
    void network;
    const aa = new AaTraffic();
    await aa.attach(context, { testIp });
    await provide(aa);
    if (aa.calls.length) {
      await testInfo.attach("aa-rpc-calls.json", {
        body: JSON.stringify(
          aa.calls.map(({ method, at, status, error }) => ({ method, at, status, error })),
          null,
          2,
        ),
        contentType: "application/json",
      });
    }
  },

  seenText: async ({ context }, provide) => {
    const seenText = new SeenText();
    await seenText.install(context);
    await provide(seenText);
  },

  browserErrors: async ({}, provide) => {
    await provide([]);
  },

  // Every page of a hermetic test has the network rules and the wallet in
  // place before it loads anything.
  page: async ({ page, network, wallet, aa, seenText, browserErrors }, provide, testInfo) => {
    void network;
    void wallet;
    void aa;
    void seenText;
    // Errors and warnings in the order they happened, for the report. Only
    // the errors go to the `browserErrors` fixture.
    const consoleLog: string[] = [];
    page.on("pageerror", (error) => {
      browserErrors.push(`pageerror: ${error.message}`);
      consoleLog.push(`pageerror: ${error.message}`);
    });
    page.on("console", (message) => {
      if (message.type() === "error") browserErrors.push(`console: ${message.text()}`);
      if (message.type() === "error" || message.type() === "warning") {
        consoleLog.push(`${message.type()}: ${message.text()}`);
      }
    });
    await provide(page);
    if (consoleLog.length) {
      await testInfo.attach("browser-console.txt", { body: consoleLog.join("\n"), contentType: "text/plain" });
    }
    if (testInfo.status !== testInfo.expectedStatus) {
      for (const name of ["app", "alto", "paymaster"]) {
        const text = await lastLines(path.join(STACK_LOG_DIR, `${name}.log`), 80);
        if (text) await testInfo.attach(`stack-${name}.log`, { body: text, contentType: "text/plain" });
      }
    }
  },

  actor: async ({ chain, s3, subgraph, nextAccount }, provide) => {
    await provide((kind, options) => createPersona({ chain, s3, subgraph, nextAccount }, kind, options));
  },

  persona: async ({ actor, wallet }, provide) => {
    await provide(async (kind, options) => {
      const persona = await actor(kind, options);
      await wallet.setAccount(persona.owner);
      return persona;
    });
  },

  pages: async ({ page, wallet }, provide) => {
    await provide(createPages(page, { walletPickerTestId: wallet.pickerTestId }));
  },

  api: async ({ playwright, testIp }, provide) => {
    const api = await playwright.request.newContext({
      baseURL: URLS.app,
      extraHTTPHeaders: { "x-forwarded-for": testIp, "cf-connecting-ip": testIp },
    });
    await provide(api);
    await api.dispose();
  },

  graphql: async ({ api }, provide) => {
    await provide(async <T>(operationName: string, variables: Record<string, unknown> = {}) => {
      const query = PERSISTED_GRAPH_DOCUMENTS.get(operationName);
      if (!query) throw new Error(`No persisted query named ${operationName}`);
      const response = await api.post("/api/graphql", { data: { query, operationName, variables } });
      const body = (await response.json()) as { data?: T; errors?: { message: string }[] };
      return { status: response.status(), data: body.data, errors: body.errors };
    });
  },
});

export { expect };
export type { Persona, PersonaKind, PersonaOptions } from "./support/personas";
