import { createParser } from "nuqs";
import { Address, isAddress } from "viem";

export const addressParser = createParser<Address>({
  parse: (value) => {
    if (isAddress(value)) {
      return value.trim().toLocaleLowerCase() as Address;
    }

    return null;
  },
  serialize: (value) => {
    if (isAddress(value)) {
      return value.trim().toLocaleLowerCase();
    }
    return "";
  },
});
