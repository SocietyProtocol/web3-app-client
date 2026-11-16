import type { Page } from "@playwright/test";
import { parseEther, recoverMessageAddress, stringToHex, type Hex } from "viem";
import { CHAIN_ID } from "../../env/hermetic";
import { expect, test } from "../../fixtures";

/**
 * Checks of the injected test wallet itself (not of the app): every control
 * the feature tests rely on does what its name says. The page is only a
 * place to call window.ethereum from.
 */
type Reply = { result?: unknown; error?: { code?: number; message: string } };

/** Calls window.ethereum.request in the page and returns the result or the error. */
function request(page: Page, method: string, params?: unknown[]): Promise<Reply> {
  return page.evaluate(
    async ([name, list]) => {
      const provider = (window as unknown as { ethereum: { request(args: unknown): Promise<unknown> } }).ethereum;
      try {
        return { result: await provider.request({ method: name, params: list }) };
      } catch (error) {
        const failure = error as { code?: number; message: string };
        return { error: { code: failure.code, message: failure.message } };
      }
    },
    [method, params] as const,
  );
}

/** Records the provider events the page receives from now on. */
async function recordEvents(page: Page) {
  await page.evaluate(() => {
    const target = window as unknown as {
      __events: { name: string; data: unknown }[];
      ethereum: { on(name: string, listener: (data: unknown) => void): void };
    };
    target.__events = [];
    for (const name of ["connect", "disconnect", "accountsChanged", "chainChanged"]) {
      target.ethereum.on(name, (data) => target.__events.push({ name, data }));
    }
  });
  return () => page.evaluate(() => (window as unknown as { __events: { name: string; data: unknown }[] }).__events);
}

const SEPOLIA_HEX = `0x${CHAIN_ID.toString(16)}`;

test.describe("test wallet fixture", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("FX-1: accounts are hidden until the site connects; connect, account and disconnect events", {
    tag: ["@core"],
  }, async ({ page, wallet, nextAccount }) => {
    const events = await recordEvents(page);
    expect((await request(page, "eth_accounts")).result).toEqual([]);
    expect((await request(page, "eth_chainId")).result).toBe(SEPOLIA_HEX);

    wallet.rejectNextConnection();
    expect((await request(page, "eth_requestAccounts")).error?.code).toBe(4001);
    expect(wallet.isConnected).toBe(false);

    expect((await request(page, "eth_requestAccounts")).result).toEqual([wallet.address]);
    expect((await request(page, "eth_accounts")).result).toEqual([wallet.address]);
    await expect.poll(events).toContainEqual({ name: "connect", data: { chainId: SEPOLIA_HEX } });

    // The user picks another account in the wallet.
    const other = nextAccount();
    await wallet.setAccount(other);
    expect(wallet.address).toBe(other.address);
    expect((await request(page, "eth_accounts")).result).toEqual([other.address]);
    expect(await events()).toContainEqual({ name: "accountsChanged", data: [other.address] });

    await wallet.disconnect();
    expect((await request(page, "eth_accounts")).result).toEqual([]);
    expect(await events()).toContainEqual({ name: "accountsChanged", data: [] });

    await wallet.emitProviderDisconnect();
    expect((await events()).map((event) => event.name)).toContain("disconnect");

    expect(wallet.requestsOf("eth_requestAccounts").map((entry) => entry.outcome)).toEqual(["rejected", "ok"]);
  });

  test("FX-2: rejectNextSignature rejects once; the next signature is valid", { tag: ["@core"] }, async ({
    page,
    wallet,
  }) => {
    await request(page, "eth_requestAccounts");
    const message = "hello from the wallet fixture test";
    const params = [stringToHex(message), wallet.address];

    wallet.rejectNextSignature();
    const rejected = await request(page, "personal_sign", params);
    expect(rejected.error?.code).toBe(4001);

    const signed = await request(page, "personal_sign", params);
    expect(signed.error).toBeUndefined();
    expect(await recoverMessageAddress({ message, signature: signed.result as Hex })).toBe(wallet.address);

    expect(wallet.signatureRequests().map((entry) => entry.outcome)).toEqual(["rejected", "ok"]);
    expect(wallet.sendTransactionRequests()).toHaveLength(0);

    // A response delay makes the "user" slow to answer.
    wallet.setResponseDelay(400);
    const started = Date.now();
    expect((await request(page, "personal_sign", params)).error).toBeUndefined();
    expect(Date.now() - started).toBeGreaterThanOrEqual(400);
    wallet.setResponseDelay(0);

    // A message for another address is refused: the wallet only signs as its own account.
    const foreign = await request(page, "personal_sign", [stringToHex(message), "0x0000000000000000000000000000000000000001"]);
    expect(foreign.error?.code).toBe(4100);
  });

  test("FX-3: holdNext keeps a prompt open until the test answers it", { tag: ["@core"] }, async ({ page, wallet }) => {
    await request(page, "eth_requestAccounts");
    const params = [stringToHex("held"), wallet.address];
    /** Starts a signature in the page without waiting for it; the answer lands in window.__held. */
    const startSignature = () =>
      page.evaluate((list) => {
        const target = window as unknown as {
          __held?: { result?: unknown; code?: number };
          ethereum: { request(args: unknown): Promise<unknown> };
        };
        target.__held = undefined;
        void target.ethereum.request({ method: "personal_sign", params: list }).then(
          (result) => (target.__held = { result }),
          (error: { code?: number }) => (target.__held = { code: error.code }),
        );
      }, params);
    const answer = () =>
      page.evaluate(() => (window as unknown as { __held?: { result?: unknown; code?: number } }).__held ?? null);

    const approved = wallet.holdNext("signature");
    await startSignature();
    await approved.requested;
    // The request is recorded while the "popup" is open, and stays unanswered
    // even though another request to the wallet completes in the meantime.
    expect(wallet.signatureRequests()).toHaveLength(1);
    expect((await request(page, "eth_chainId")).result).toBe(SEPOLIA_HEX);
    expect(await answer()).toBeNull();
    approved.approve();
    await expect.poll(answer).not.toBeNull();
    expect((await answer())?.result).toMatch(/^0x[0-9a-f]{130}$/);

    const refused = wallet.holdNext("signature");
    await startSignature();
    await refused.requested;
    expect(await answer()).toBeNull();
    refused.reject();
    await expect.poll(answer).toEqual({ code: 4001 });
    expect(wallet.signatureRequests().map((entry) => entry.outcome)).toEqual(["ok", "rejected"]);
  });

  test("FX-4: chain switching is reported to the page and recorded", { tag: ["@core"] }, async ({ page, wallet }) => {
    await request(page, "eth_requestAccounts");
    const events = await recordEvents(page);

    await wallet.setChainId(1);
    expect((await request(page, "eth_chainId")).result).toBe("0x1");
    expect(await events()).toContainEqual({ name: "chainChanged", data: "0x1" });

    wallet.rejectNextChainSwitch();
    const rejected = await request(page, "wallet_switchEthereumChain", [{ chainId: SEPOLIA_HEX }]);
    expect(rejected.error?.code).toBe(4001);
    expect(wallet.reportedChainId).toBe(1);

    const switched = await request(page, "wallet_switchEthereumChain", [{ chainId: SEPOLIA_HEX }]);
    expect(switched.error).toBeUndefined();
    expect(wallet.reportedChainId).toBe(CHAIN_ID);
    expect(await events()).toContainEqual({ name: "chainChanged", data: SEPOLIA_HEX });

    const unknown = await request(page, "wallet_switchEthereumChain", [{ chainId: "0x89" }]);
    expect(unknown.error?.code).toBe(4902);
    expect(wallet.requestsOf("wallet_switchEthereumChain").map((entry) => entry.outcome)).toEqual([
      "rejected",
      "ok",
      "error",
    ]);
  });

  test("FX-5: transactions can be rejected, and an approved one lands on the local chain", { tag: ["@core"] }, async ({
    page,
    persona,
    wallet,
    chain,
    nextAccount,
  }) => {
    const me = await persona("newFunded");
    const recipient = nextAccount().address;
    await request(page, "eth_requestAccounts");
    const transaction = { from: me.ownerAddress, to: recipient, value: `0x${parseEther("1").toString(16)}` };

    wallet.rejectNextTransaction();
    expect((await request(page, "eth_sendTransaction", [transaction])).error?.code).toBe(4001);
    expect(await chain.balance(recipient)).toBe(BigInt(0));

    const sent = await request(page, "eth_sendTransaction", [transaction]);
    expect(sent.error).toBeUndefined();
    await chain.receipt(sent.result as Hex);
    expect(await chain.balance(recipient)).toBe(parseEther("1"));

    wallet.setAllowSendTransaction(false);
    expect((await request(page, "eth_sendTransaction", [transaction])).error?.code).toBe(-32603);
    expect(wallet.sendTransactionRequests().map((entry) => entry.outcome)).toEqual(["rejected", "ok", "refused"]);
    expect(await chain.balance(recipient)).toBe(parseEther("1"));
  });

  test("FX-6: a plain wallet answers 4200 to EIP-5792", { tag: ["@core"] }, async ({ page, wallet }) => {
    await request(page, "eth_requestAccounts");
    expect((await request(page, "wallet_getCapabilities", [wallet.address])).error?.code).toBe(4200);
    expect((await request(page, "wallet_sendCalls", [{ calls: [] }])).error?.code).toBe(4200);
  });

  test("FX-8: stopAnswering leaves every request of one method unanswered until it is released", {
    tag: ["@core"],
  }, async ({ page, wallet }) => {
    await request(page, "eth_requestAccounts");
    /** Starts eth_accounts in the page without waiting; the answer lands in window.__hung[slot]. */
    const startAccounts = (slot: number) =>
      page.evaluate((index) => {
        const target = window as unknown as {
          __hung?: Record<number, unknown>;
          ethereum: { request(args: unknown): Promise<unknown> };
        };
        target.__hung ??= {};
        void target.ethereum.request({ method: "eth_accounts" }).then(
          (result) => (target.__hung![index] = { result }),
          (error: { code?: number }) => (target.__hung![index] = { code: error.code }),
        );
      }, slot);
    const answers = () =>
      page.evaluate(() => (window as unknown as { __hung?: Record<number, unknown> }).__hung ?? {});

    const hung = wallet.stopAnswering("eth_accounts");
    await startAccounts(1);
    await startAccounts(2);
    // At least these two: the app on the page may ask for the accounts itself.
    await expect.poll(() => hung.hits()).toBeGreaterThanOrEqual(2);
    // Other methods are still answered, and the two requests stay open meanwhile.
    expect((await request(page, "eth_chainId")).result).toBe(SEPOLIA_HEX);
    expect(await answers()).toEqual({});
    expect(wallet.requestsOf("eth_accounts").length).toBeGreaterThanOrEqual(2);

    // Released: both get the wallet's real answer, and new requests are answered at once.
    const caught = hung.hits();
    hung.release();
    await expect.poll(answers).toEqual({ 1: { result: [wallet.address] }, 2: { result: [wallet.address] } });
    expect((await request(page, "eth_accounts")).result).toEqual([wallet.address]);
    expect(hung.hits()).toBe(caught);
  });

  test.describe("with EIP-5792 switched on", () => {
    test.use({ walletCapabilities: "atomic" });

    test("FX-7: wallet_sendCalls sends the calls and reports their status", { tag: ["@core"] }, async ({
      page,
      persona,
      wallet,
      chain,
      nextAccount,
    }) => {
      const me = await persona("newFunded");
      const recipient = nextAccount().address;
      await request(page, "eth_requestAccounts");

      const capabilities = await request(page, "wallet_getCapabilities", [me.ownerAddress]);
      expect(capabilities.result).toEqual({ [SEPOLIA_HEX]: { atomic: { status: "supported" } } });

      const sent = await request(page, "wallet_sendCalls", [
        {
          version: "2.0.0",
          chainId: SEPOLIA_HEX,
          from: me.ownerAddress,
          atomicRequired: false,
          calls: [{ to: recipient, value: `0x${parseEther("0.5").toString(16)}`, data: "0x" }],
        },
      ]);
      expect(sent.error).toBeUndefined();
      const { id } = sent.result as { id: string };

      await expect
        .poll(async () => ((await request(page, "wallet_getCallsStatus", [id])).result as { status: number }).status)
        .toBe(200);
      const status = (await request(page, "wallet_getCallsStatus", [id])).result as {
        receipts: { status: string; transactionHash: Hex }[];
      };
      expect(status.receipts).toHaveLength(1);
      expect(status.receipts[0].status).toBe("0x1");
      expect(await chain.balance(recipient)).toBe(parseEther("0.5"));

      expect(wallet.sendCallsRequests()).toHaveLength(1);
      expect(wallet.sendTransactionRequests()).toHaveLength(0);
    });
  });
});
