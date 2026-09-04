import { describe, expect, it, vi } from "vitest";

const { executeMock } = vi.hoisted(() => ({ executeMock: vi.fn() }));

vi.mock("../../.graphclient", () => ({
  StatusDocument: { kind: "Document" },
  execute: executeMock,
}));

import { fetchSubgraphStatus } from "./useWaitForSubgraphSync";

describe("fetchSubgraphStatus", () => {
  it("does not send the abort signal as GraphQL variables", async () => {
    executeMock.mockResolvedValueOnce({ data: { _meta: { block: { number: 1 } } } });

    await fetchSubgraphStatus();

    expect(executeMock).toHaveBeenCalledWith(
      { kind: "Document" },
      {},
    );
  });
});
