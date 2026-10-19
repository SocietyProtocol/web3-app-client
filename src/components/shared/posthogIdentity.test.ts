import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  identifyOutpostPerson,
  resetPostHogMergeMemory,
} from "./posthogIdentity";

const S = "0xA47f4D7D2FAbDbfDCe865501ADc55a2b370c88cb";
const E = "0x9BA704115f0ed3a431a025ffa0525fdd1d507c3c";

const client = () => ({ identify: vi.fn(), capture: vi.fn() });
const memoryStore = () => {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
  };
};

beforeEach(() => resetPostHogMergeMemory());

describe("identifyOutpostPerson", () => {
  it("identifies by S, then merges E's person into it", () => {
    const posthog = client();
    const key = identifyOutpostPerson(posthog, S, E, memoryStore());

    expect(posthog.identify).toHaveBeenCalledWith(S.toLowerCase(), {
      society_address: S.toLowerCase(),
      owner_address: E.toLowerCase(),
    });
    // alias() would be ignored for an already identified E.
    expect(posthog.capture).toHaveBeenCalledWith("$merge_dangerously", {
      alias: E.toLowerCase(),
    });
    expect(posthog.identify.mock.invocationCallOrder[0]).toBeLessThan(
      posthog.capture.mock.invocationCallOrder[0],
    );
    expect(key).toBe(`${E.toLowerCase()}:${S.toLowerCase()}`);
  });

  it("merges once per device, across page loads", () => {
    const store = memoryStore();
    identifyOutpostPerson(client(), S, E, store);
    resetPostHogMergeMemory(); // a full reload

    const posthog = client();
    identifyOutpostPerson(posthog, S, E, store);
    expect(posthog.identify).toHaveBeenCalledTimes(1);
    expect(posthog.capture).not.toHaveBeenCalled();
  });

  it("merges once per page load when storage throws", () => {
    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    const posthog = client();
    identifyOutpostPerson(posthog, S, E, broken);
    identifyOutpostPerson(posthog, S, E, broken);
    expect(posthog.capture).toHaveBeenCalledTimes(1);
  });

  it("skips the merge for a contract wallet that is its own owner", () => {
    const posthog = client();
    expect(
      identifyOutpostPerson(posthog, S, S.toLowerCase(), memoryStore()),
    ).toBeUndefined();
    expect(posthog.capture).not.toHaveBeenCalled();
  });

  it("identifies without an owner", () => {
    const posthog = client();
    identifyOutpostPerson(posthog, S, undefined, memoryStore());
    expect(posthog.identify).toHaveBeenCalledWith(S.toLowerCase(), {
      society_address: S.toLowerCase(),
    });
    expect(posthog.capture).not.toHaveBeenCalled();
  });
});
