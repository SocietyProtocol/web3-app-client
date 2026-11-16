// Records the subgraph fake's baseline: replays the badges contract's logs
// from its deployment to the pinned fork block, straight from the fork RPC,
// through the same chain follower the fake uses during a run.
//
// The result is committed (e2e/support/backends/baseline/). It holds only
// what is on chain: addresses, badge names and token URIs. Profile metadata
// (names, bios, pictures) is NOT fetched from IPFS, so baseline users show
// as addresses; tests that need names add them with overlays.
import fs from "node:fs";
import path from "node:path";
import { CONTRACTS, FORK_BLOCK, FORK_RPC_URL, baselineFile } from "../stack/config.mjs";
import { jsonRpc } from "../stack/processes.mjs";
import { createIndexer } from "./indexer.mjs";
import { EntityStore } from "./store.mjs";

export async function recordBaseline() {
  const store = new EntityStore();
  const rpc = async (method, params) => {
    for (let attempt = 1; ; attempt += 1) {
      try {
        return await jsonRpc(FORK_RPC_URL, method, params, 60_000);
      } catch (error) {
        if (attempt >= 5) throw error;
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
      }
    }
  };
  const indexer = createIndexer({ store, rpc, badgesAddress: CONTRACTS.badges });

  const step = 200_000;
  let handled = 0;
  for (let from = CONTRACTS.badgesStartBlock; from <= FORK_BLOCK; from += step) {
    const to = Math.min(from + step - 1, FORK_BLOCK);
    handled += await indexer.indexRange(from, to);
    console.log(`[baseline] blocks ${from}-${to}: ${handled} events so far`);
  }

  const file = baselineFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(
    file,
    `${JSON.stringify(
      {
        _about:
          "Subgraph fake baseline, recorded by `yarn test:e2e:baseline` from on-chain logs only. Do not edit by hand.",
        chainId: 11155111,
        forkBlock: FORK_BLOCK,
        source: { contract: CONTRACTS.badges, fromBlock: CONTRACTS.badgesStartBlock, events: handled },
        entities: store.dumpBase(),
      },
      null,
      1,
    )}\n`,
  );
  console.log(`[baseline] wrote ${path.relative(process.cwd(), file)}: ${JSON.stringify(store.counts())}`);
}
