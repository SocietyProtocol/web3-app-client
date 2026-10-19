import { aaRpcHealth, forwardAaRpc } from "@/lib/pimlico-proxy";

export const runtime = "nodejs";

export function GET() {
  return aaRpcHealth();
}

export function POST(request: Request) {
  return forwardAaRpc(request);
}
