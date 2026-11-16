import { parseEther } from "viem";
import {
  freeGasUnavailableNoFundsMessage,
  freeGasUnavailableNotice,
  walletNeedsEthMessage,
} from "../../../src/lib/owner-pays";
import { expect, test } from "../../fixtures";
import { REFUSALS } from "../../support/aa/refusals";
import { AA_RPC_PATH } from "../../support/aa/requests";
import { mentionsEthWithSocietyAccount } from "../../support/write-route";

/**
 * Checks of the helpers the routing tests rely on (not of the app): the
 * detector of "the Society account needs ETH" texts, the recorder of what
 * a page has shown, and the answers given in the proxy's place.
 */
/**
 * A document of the app's origin that is not one of its pages: the health
 * answer of the proxy, a few bytes of JSON. These checks are about the
 * helpers, so they should not wait for the app to render anything.
 */
const A_SMALL_DOCUMENT = "/api/aa/rpc";

const SOCIETY = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const WALLET = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

test.describe("routing test helpers", () => {
  test("RC-1: the detector flags a request to fund the Society account, and only that", { tag: ["@core"] }, () => {
    const flagged = (text: string) => mentionsEthWithSocietyAccount(text, SOCIETY);

    // The messages the app showed before the owner wallet started paying.
    expect(
      flagged(
        `Your Society account ${SOCIETY} needs ~0.002 ETH for this action; send ETH to it from your wallet or ask an admin`,
      ),
    ).toBe(true);
    expect(flagged(`Could not check the ETH balance of your Society account ${SOCIETY}; please try again`)).toBe(true);
    // The account named only by its address, in full, in lower case or shortened.
    expect(flagged(`Send 0.01 ETH to ${SOCIETY} to continue.`)).toBe(true);
    expect(flagged(`send 0.01 ETH to ${SOCIETY.toLowerCase()}`)).toBe(true);
    expect(flagged("Top up 0x5FbD...180aa3 with ETH")).toBe(true);
    expect(flagged("Your smart account is out of ETH")).toBe(true);

    // What the app shows today is about the wallet.
    const cost = parseEther("0.00012");
    expect(flagged(walletNeedsEthMessage(WALLET, cost))).toBe(false);
    expect(flagged(freeGasUnavailableNoFundsMessage(WALLET, cost))).toBe(false);
    expect(flagged(freeGasUnavailableNotice({ costWei: cost, deployed: true }))).toBe(false);
    // ETH and the Society account in one notice, but in different sentences.
    expect(flagged(freeGasUnavailableNotice({ costWei: cost, deployed: false }))).toBe(false);
    expect(flagged("Step 1 of 2: confirm setting up your Society account in your wallet")).toBe(false);
    expect(flagged(`Society address ${SOCIETY}`)).toBe(false);
  });

  test("RC-2: the recorder keeps text that was on the page only for a moment", { tag: ["@core"] }, async ({ page, seenText }) => {
    await page.goto(A_SMALL_DOCUMENT);
    await page.evaluate(() => {
      const toast = document.createElement("div");
      toast.textContent = "here and gone";
      document.body.append(toast);
      toast.remove();
      const label = document.createElement("span");
      label.id = "e2e-label";
      label.append("first");
      document.body.append(label);
    });
    await page.evaluate(() => {
      document.getElementById("e2e-label")!.firstChild!.textContent = "changed in place";
    });
    const texts = await seenText.all();
    expect(texts).toContain("here and gone");
    expect(texts).toContain("first");
    expect(texts).toContain("changed in place");
    expect(await seenText.matching(/^here and/)).toEqual(["here and gone"]);
    // What a document shows while it loads is recorded too, and what was
    // seen before a navigation is kept.
    await page.goto(A_SMALL_DOCUMENT);
    const afterNavigation = await seenText.all();
    expect(afterNavigation).toContain("here and gone");
    expect(afterNavigation.some((text) => text.includes('"configured":true'))).toBe(true);
  });

  test("RC-3: aa.answer answers the chosen calls in the proxy's place, counts them, and stops when lifted", { tag: ["@core"] }, async ({
    page,
    aa,
  }) => {
    await page.goto(A_SMALL_DOCUMENT);
    const call = (method: string) =>
      page.evaluate(
        async ([path, name]) => {
          const response = await fetch(path, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ jsonrpc: "2.0", id: 7, method: name, params: [] }),
          });
          return { status: response.status, body: await response.text() };
        },
        [AA_RPC_PATH, method] as const,
      );
    const real = await call("eth_supportedEntryPoints");
    expect(JSON.parse(real.body).result).toHaveLength(1);

    // Only the named methods are answered; the rest still reaches the proxy.
    const refusal = await aa.answer({ methods: ["eth_chainId"], error: { code: -32000, message: "refused by the test" } });
    expect(JSON.parse((await call("eth_chainId")).body)).toEqual({
      jsonrpc: "2.0",
      id: 7,
      error: { code: -32000, message: "refused by the test" },
    });
    expect(JSON.parse((await call("eth_supportedEntryPoints")).body).result).toHaveLength(1);
    expect(refusal.hits()).toBe(1);
    expect(refusal.methods()).toEqual(["eth_chainId"]);
    await expect.poll(() => aa.refusedCalls().map((entry) => [entry.method, entry.error?.message])).toEqual([
      ["eth_chainId", "refused by the test"],
    ]);

    // `times` limits it, a non-JSON answer keeps its status, and lift() ends it.
    const once = await aa.answer(REFUSALS.gatewayRateLimit, { times: 1 });
    expect(await call("eth_supportedEntryPoints")).toEqual({ status: 429, body: "error code: 1015" });
    expect(JSON.parse((await call("eth_supportedEntryPoints")).body).result).toHaveLength(1);
    expect(once.hits()).toBe(1);
    await refusal.lift();
    expect(JSON.parse((await call("eth_chainId")).body).error).toBeUndefined();
    expect(refusal.hits()).toBe(1);
    expect(aa.methods(), "every call is recorded, answered here or not").toEqual([
      "eth_supportedEntryPoints",
      "eth_chainId",
      "eth_supportedEntryPoints",
      "eth_supportedEntryPoints",
      "eth_supportedEntryPoints",
      "eth_chainId",
    ]);
  });
});
