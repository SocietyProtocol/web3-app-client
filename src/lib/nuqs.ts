import { createParser } from "nuqs";
import { Address, isAddress } from "viem";

export const addressParser = createParser<Address>({
  parse: (value) => {
    if (isAddress(value)) {
      return value.trim().toLowerCase() as Address;
    }

    return null;
  },
  serialize: (value) => {
    if (isAddress(value)) {
      return value.trim().toLowerCase();
    }
    return "";
  },
});
