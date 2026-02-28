/* eslint-disable @typescript-eslint/no-explicit-any */

// Add toJSON method to BigInt for serialization in React DevTools
if (typeof BigInt !== "undefined" && !(BigInt.prototype as any).toJSON) {
  (BigInt.prototype as any).toJSON = function () {
    return this.toString();
  };
}
