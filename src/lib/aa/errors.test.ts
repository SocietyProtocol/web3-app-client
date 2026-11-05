import { describe, expect, it } from "vitest";

import { isAlreadyDeployedError } from "./errors";

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
