import type { APIRequestContext } from "@playwright/test";
import type { Address } from "viem";
import { expect, test } from "../../fixtures";
import { REFUSALS } from "../../support/aa/refusals";
import {
  AA_RPC_PATH,
  fromIp,
  newAccountProfileOperation,
  paymasterDataCall,
  paymasterStubCall,
  type JsonRpcReply,
} from "../../support/aa/requests";
import type { Chain } from "../../support/chain/chain";

/**
 * /api/aa/rpc: the limits on sponsored account creation (createProfile),
 * SPONSORED_PROFILES_PER_IP_PER_DAY and SPONSORED_PROFILE_INTERVAL_SECONDS
 * (src/lib/aa/rate-limit.ts). The stack's app has both turned off (they
 * would refuse the other tests' profiles), so each test here runs against a
 * second app server of its own with the values it names (`appEnv`), and
 * starts with empty counts. The upstream is the local mock paymaster.
 *
 * Client IPs below are documentation addresses: the second server is the
 * test's alone, so they cannot meet another test's.
 */
type Asker = { api: APIRequestContext; chain: Chain; nextAccount: () => { address: Address } };

/** Asks for sponsorship of a new account's profile the way the app does: the stub call, then the signing call. */
async function createProfileFrom({ api, chain, nextAccount }: Asker, ip: string) {
  const owner = nextAccount().address;
  const operation = newAccountProfileOperation(owner, chain.societyAddress(owner));
  const call = async (body: object) => {
    const response = await api.post(AA_RPC_PATH, { data: body, headers: fromIp(ip) });
    expect(response.status()).toBe(200);
    return (await response.json()) as JsonRpcReply;
  };
  const stub = await call(paymasterStubCall(operation));
  const data = await call(paymasterDataCall(operation));
  return { stub, data };
}

/** The signing call was answered with the paymaster's signature. */
function expectSponsored(reply: JsonRpcReply, what: string) {
  expect(reply.error, what).toBeUndefined();
  expect(reply.result, what).toMatchObject({ paymaster: expect.stringMatching(/^0x[0-9a-fA-F]{40}$/) });
}

test.describe("/api/aa/rpc: one sponsored new account per visitor IP per day", () => {
  test.use({ appEnv: { SPONSORED_PROFILES_PER_IP_PER_DAY: "1", SPONSORED_PROFILE_INTERVAL_SECONDS: "0" } });

  test(
    "P9: a visitor's first new account of the day is sponsored; the second is refused on the signing call, and other visitors are still served",
    { tag: ["@core", "@sponsored"] },
    async ({ api, chain, nextAccount }) => {
      const ask = { api, chain, nextAccount };
      const first = await createProfileFrom(ask, "198.51.100.10");
      expect(first.stub.error).toBeUndefined();
      expectSponsored(first.data, "the first account of the day");

      // The same visitor, another new account: the stub call (which signs
      // nothing) still goes through, the signing call is refused with the
      // proxy's own wording, which the app reads as "sponsorship unavailable".
      const second = await createProfileFrom(ask, "198.51.100.10");
      expect(second.stub.error, "the stub call is not counted").toBeUndefined();
      expect(second.data).toEqual({ jsonrpc: "2.0", id: 1, error: REFUSALS.dailyProfileCreateLimit.error });

      // Another visitor is not affected.
      expectSponsored((await createProfileFrom(ask, "198.51.100.11")).data, "another visitor");
    },
  );

  test(
    "P9: an IPv6 visitor is counted per /64, so a new address in the same block does not buy another account",
    { tag: ["@edge", "@sponsored"] },
    async ({ api, chain, nextAccount }) => {
      const ask = { api, chain, nextAccount };
      expectSponsored((await createProfileFrom(ask, "2001:db8:0:1::1")).data, "the block's first account");
      expect((await createProfileFrom(ask, "2001:db8:0:1:ffff::2")).data.error).toEqual(
        REFUSALS.dailyProfileCreateLimit.error,
      );
      expectSponsored((await createProfileFrom(ask, "2001:db8:0:2::1")).data, "the next /64");
    },
  );
});

test.describe("/api/aa/rpc: one sponsored new account app-wide per interval", () => {
  test.use({ appEnv: { SPONSORED_PROFILES_PER_IP_PER_DAY: "0", SPONSORED_PROFILE_INTERVAL_SECONDS: "300" } });

  test(
    "P10: a new account from another visitor inside the interval is refused, while that visitor's other sponsored calls are served",
    { tag: ["@core", "@sponsored"] },
    async ({ api, chain, nextAccount }) => {
      const ask = { api, chain, nextAccount };
      expectSponsored((await createProfileFrom(ask, "198.51.100.20")).data, "the first account in the interval");

      const other = await createProfileFrom(ask, "198.51.100.21");
      expect(other.stub.error, "the stub call is not counted").toBeUndefined();
      expect(other.data).toEqual({ jsonrpc: "2.0", id: 1, error: REFUSALS.appProfileCreateLimit.error });
      // App-wide: the first visitor is refused too until the interval is over.
      expect((await createProfileFrom(ask, "198.51.100.20")).data.error).toEqual(REFUSALS.appProfileCreateLimit.error);
    },
  );
});

test.describe("/api/aa/rpc: the limits follow the environment", () => {
  test.describe("two a day per visitor, no app-wide interval", () => {
    test.use({ appEnv: { SPONSORED_PROFILES_PER_IP_PER_DAY: "2", SPONSORED_PROFILE_INTERVAL_SECONDS: "0" } });

    test(
      "P11: SPONSORED_PROFILES_PER_IP_PER_DAY=2 sponsors a visitor's first two new accounts and refuses the third",
      { tag: ["@core", "@sponsored"] },
      async ({ api, chain, nextAccount }) => {
        const ask = { api, chain, nextAccount };
        expectSponsored((await createProfileFrom(ask, "198.51.100.30")).data, "the first");
        expectSponsored((await createProfileFrom(ask, "198.51.100.30")).data, "the second");
        expect((await createProfileFrom(ask, "198.51.100.30")).data.error).toEqual(
          REFUSALS.dailyProfileCreateLimit.error,
        );
      },
    );
  });

  test(
    "P11: with both limits at 0 (the suite's own app) a visitor's new accounts are all sponsored, back to back",
    { tag: ["@core", "@sponsored"] },
    async ({ api, chain, nextAccount, testIp }) => {
      // The stack's app, which every other test uses. Three new accounts
      // from this test's IP in quick succession: neither one a day per
      // visitor nor one per interval app-wide applies. (Six paymaster calls,
      // inside the proxy's ten a minute per visitor.)
      const ask = { api, chain, nextAccount };
      for (const nth of ["first", "second", "third"]) {
        expectSponsored((await createProfileFrom(ask, testIp)).data, `the ${nth} new account`);
      }
    },
  );
});
