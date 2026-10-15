import { forwardAaRpc } from "@/lib/pimlico-proxy";

export const runtime = "nodejs";

export function POST(request: Request) {
  return forwardAaRpc(request);
}
