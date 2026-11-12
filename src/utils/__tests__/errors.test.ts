import { describe, expect, it } from "vitest";
import { BaseError, HttpRequestError } from "viem";
import {
  InsufficientPrefundError,
  PaymasterFunctionRevertedError,
  SmartAccountFunctionRevertedError,
  UserOperationExecutionError,
  UserOperationPaymasterSignatureError,
  UserOperationSignatureError,
} from "viem/account-abstraction";
import { ResponseError } from "@/errors/ResponseError";
import { parseAccountAbstractionError, parseErrorMessage } from "@/utils/errors";
import { SponsorshipUnavailableError } from "@/lib/aa/errors";
import { walletNeedsEthMessage } from "@/lib/owner-pays";

const PREFUND = "The network fee for this action could not be covered";
const SIGNATURE = "Your wallet's signature was not accepted";
const NONCE = "another action in progress";
const PAYMASTER = "Society could not sponsor this action";

function wrapped(cause: BaseError) {
  return new UserOperationExecutionError(cause, { calls: [] } as never);
}

describe("parseErrorMessage account abstraction errors", () => {
  it.each([
    ["raw AA21", new Error("UserOperation reverted: AA21 didn't pay prefund"), PREFUND],
    ["viem AA21", wrapped(new InsufficientPrefundError({})), PREFUND],
    ["raw AA23", new Error("AA23 reverted (or OOG)"), SIGNATURE],
    ["viem AA23", wrapped(new SmartAccountFunctionRevertedError({})), SIGNATURE],
    ["raw AA24", new Error("AA24 signature error"), SIGNATURE],
    ["viem AA24", wrapped(new UserOperationSignatureError({})), SIGNATURE],
    ["raw AA25", new Error("AA25 invalid account nonce"), NONCE],
    ["viem AA25", wrapped(
        // InvalidAccountNonceError is not exported by viem; same shape.
        new BaseError("Invalid Smart Account nonce used for User Operation.", {
          name: "InvalidAccountNonceError",
        }),
      ), NONCE],
    ["raw AA33", new Error("AA33 reverted"), PAYMASTER],
    ["viem AA33", wrapped(new PaymasterFunctionRevertedError({})), PAYMASTER],
    ["viem AA34", wrapped(new UserOperationPaymasterSignatureError({})), PAYMASTER],
    ["paymaster rejection", new Error("Paymaster rejected the user operation"), PAYMASTER],
  ])("maps %s", (_, error, expected) => {
    expect(parseErrorMessage(error)).toContain(expected);
  });

  it("maps a missing sponsorship key", () => {
    expect(
      parseErrorMessage(new BaseError("RPC Request failed.", { details: "Sponsorship is not configured" })),
    ).toBe("Sponsored transactions are not available right now. Please try again later.");
  });

  it("maps calls outside the allowlist", () => {
    expect(
      parseErrorMessage(new Error("User operation is outside the sponsorship allowlist")),
    ).toBe("Society does not sponsor this action.");
  });

  it("maps provider timeouts", () => {
    expect(parseErrorMessage(new Error("Sponsorship provider did not respond"))).toBe(
      "The sponsorship service did not respond. Please try again.",
    );
  });

  it("maps rate limits", () => {
    expect(parseErrorMessage(new HttpRequestError({ url: "/api/aa/rpc", status: 429 }))).toBe(
      "Too many requests. Please wait a moment and try again.",
    );
    expect(parseErrorMessage(new Error("Too Many Requests"))).toContain("Too many requests");
  });

  it("maps sponsorship policy caps", () => {
    for (const message of [
      "Sponsorship policy spending limit exceeded",
      "User operation exceeds the policy max limit",
      "sponsorship cap reached",
    ]) {
      expect(parseErrorMessage(new Error(message))).toBe(
        "Society's sponsorship limit for this action has been reached. Please try again later or ask an admin.",
      );
    }
  });

  it("keeps our own API rate limit message", () => {
    const error = new ResponseError(
      "Rate limit exceeded. Please try again at 10:00:00",
      429,
      "Too Many Requests",
      {},
    );
    expect(parseErrorMessage(error)).toBe("Rate limit exceeded. Please try again at 10:00:00");
  });

  it("leaves wallet rejections and unrelated errors alone", () => {
    expect(parseAccountAbstractionError(new Error("User rejected the request."))).toBeUndefined();
    expect(parseAccountAbstractionError(new Error("Something else"))).toBeUndefined();
    expect(parseErrorMessage(new Error("Something else"))).toBe("Something else");
  });

  it("does not read AA codes out of hex data", () => {
    expect(
      parseAccountAbstractionError(new Error("reverted with data 0xAA21AA24AA25")),
    ).toBeUndefined();
  });

  it("maps the proxy's sponsorship rate limit", () => {
    expect(
      parseErrorMessage(
        new BaseError("RPC Request failed.", { details: "Too many sponsorship requests" }),
      ),
    ).toBe("Too many free-gas requests in a short time. Please wait a minute and try again.");
  });

  it("maps the proxy's daily sponsorship limits", () => {
    for (const details of [
      "Daily sponsored profile update limit reached",
      "Daily sponsored invite limit reached",
    ]) {
      expect(parseErrorMessage(new BaseError("RPC Request failed.", { details }))).toBe(
        "You have reached today's limit of free-gas transactions for this action. Please try again tomorrow.",
      );
    }
  });

  it("maps those refusals when they arrive as the cause of a fallback error", () => {
    const refusal = new BaseError("RPC Request failed.", {
      details: "Daily sponsored profile update limit reached",
    });
    expect(parseErrorMessage(new SponsorshipUnavailableError(refusal))).toContain(
      "today's limit of free-gas transactions",
    );
  });

  it("never tells the user to send ETH to their Society account", () => {
    for (const error of [
      new Error("UserOperation reverted: AA21 didn't pay prefund"),
      wrapped(new InsufficientPrefundError({})),
    ]) {
      expect(parseErrorMessage(error)).not.toMatch(/send ETH|Society account/i);
    }
  });

  it("passes the wallet-balance route message through", () => {
    const message = walletNeedsEthMessage(
      "0x0000000000000000000000000000000000000001",
      BigInt(10) ** BigInt(15),
    );
    expect(message).toBe(
      "Your wallet 0x0000000000000000000000000000000000000001 needs about 0.001 ETH to pay the network fee for this action",
    );
    expect(parseErrorMessage(new Error(message))).toBe(message);
  });
});
