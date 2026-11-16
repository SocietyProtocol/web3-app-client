// Runs @pimlico/mock-paymaster as its own process.
//   node paymaster-server.mjs <anvilRpc> <altoRpc> <port>
// On start it deploys its paymaster contracts through the deterministic
// deployer and deposits ETH for them in the EntryPoint. Its keys are built
// into the package; it funds them itself with anvil_setBalance.
// It answers pm_* itself and forwards every other method to alto.
import { paymaster } from "@pimlico/mock-paymaster";

const [anvilRpc, altoRpc, port] = process.argv.slice(2);
if (!anvilRpc || !altoRpc || !port) {
  console.error("usage: node paymaster-server.mjs <anvilRpc> <altoRpc> <port>");
  process.exit(2);
}

const instance = paymaster({ anvilRpc, altoRpc, port: Number(port), host: "127.0.0.1" });
const started = Date.now();
await instance.start();
console.log(`mock-paymaster listening on 127.0.0.1:${port} after ${Date.now() - started}ms`);

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => {
    instance.stop().finally(() => process.exit(0));
    setTimeout(() => process.exit(0), 1500).unref();
  });
}
