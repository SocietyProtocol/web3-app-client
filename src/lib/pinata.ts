"server-only";

import { PinataSDK } from "pinata";

import { env } from "@/lib/env";

export const pinata = new PinataSDK({
  pinataJwt: env.pinataJwt,
  pinataGateway: env.pinataGateway,
});
