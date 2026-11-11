import { describe, expect, it } from "vitest";

import { BaseError, UserRejectedRequestError } from "viem";
import {
  SponsorshipUnavailableError,
  isAlreadyDeployedError,
  isUserRejection,
  sponsorshipIsUnavailable,
} from "./errors";

describe("isAlreadyDeployedError", () => {
  it("matches the bundler's AA10 rejection", () => {
    const error = Object.assign(new Error("Smart Account has already been deployed."), {
      details: "UserOperation reverted during simulation with reason: AA10 sender already constructed",
    });
    expect(isAlreadyDeployedError(error)).toBe(true);
  });

  it("ignores other AA errors", () => {
    expect(isAlreadyDeployedError(new Error("AA21 didn't pay prefund"))).toBe(false);
    expect(isAlreadyDeployedError(new Error("User rejected the request"))).toBe(false);
  });
});

const rpcError = (details: string) =>
  new BaseError("RPC Request failed.", { details });

describe("isUserRejection", () => {
  it("matches wallet rejections, however they are wrapped", () => {
    expect(isUserRejection(new Error("User rejected the request."))).toBe(true);
    expect(isUserRejection(new Error("MetaMask Tx Signature: User denied transaction signature."))).toBe(true);
    expect(isUserRejection(new UserRejectedRequestError(new Error("nope")))).toBe(true);
    expect(isUserRejection(Object.assign(new Error("wrapped"), { cause: { code: 4001 } }))).toBe(true);
  });

  it("ignores sponsorship refusals", () => {
    expect(isUserRejection(rpcError("Too many sponsorship requests"))).toBe(false);
    expect(isUserRejection(new Error("Paymaster rejected the user operation"))).toBe(false);
  });
});

describe("sponsorshipIsUnavailable", () => {
  const before = { signatureRequested: false };
  const after = { signatureRequested: true };

  it.each([
    ["the proxy's per-sender rate limit", rpcError("Too many sponsorship requests")],
    ["the proxy's per-IP rate limit", rpcError("Too many requests")],
    ["the daily profile update limit", rpcError("Daily sponsored profile update limit reached")],
    ["the daily invite limit", rpcError("Daily sponsored invite limit reached")],
    ["a proxy without a Pimlico key", rpcError("Sponsorship is not configured")],
    ["a silent provider", rpcError("Sponsorship provider did not respond")],
    ["an exhausted Pimlico policy", rpcError("sponsorship policy has reached its spending limit")],
    ["a paymaster error", new Error("AA33 reverted")],
    ["a bundler error at estimation", new Error("eth_estimateUserOperationGas failed")],
    ["a network failure", new TypeError("Failed to fetch")],
  ])("falls back on %s before the signature", (_, error) => {
    expect(sponsorshipIsUnavailable(error, before)).toBe(true);
  });

  it("does not fall back once the wallet was asked to sign", () => {
    expect(sponsorshipIsUnavailable(rpcError("Too many requests"), after)).toBe(false);
    expect(sponsorshipIsUnavailable(new Error("AA25 invalid account nonce"), after)).toBe(false);
  });

  it("does not fall back on a rejection in the wallet", () => {
    expect(sponsorshipIsUnavailable(new Error("User rejected the request."), before)).toBe(false);
    expect(sponsorshipIsUnavailable(new Error("User rejected the request."), after)).toBe(false);
  });

  it("carries the refusal as the cause", () => {
    const cause = rpcError("Too many sponsorship requests");
    const error = new SponsorshipUnavailableError(cause);
    expect(error.name).toBe("SponsorshipUnavailableError");
    expect(error.message).toBe("Free gas is unavailable right now");
    expect(error.cause).toBe(cause);
  });
});
