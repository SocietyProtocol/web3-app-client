import { describe, expect, it } from "vitest";
import { mintBadgeValidationSchema } from "./validation";

const recipient = "0x1111111111111111111111111111111111111111";
const LIMIT = 2 * 1024 * 1024;

const csv = (size: number) =>
  new File([`${recipient},`.padEnd(size, " ")], "recipients.csv", {
    type: "text/csv",
  });

describe("mintBadgeValidationSchema: file size", () => {
  it("accepts a file of exactly 2 MB", () => {
    const result = mintBadgeValidationSchema.safeParse({
      recipients: [recipient],
      file: csv(LIMIT),
    });
    expect(result.success).toBe(true);
  });

  // MintTab shows the error of the `file` field as the reason Mint is
  // disabled, so the rule must stay on that field with this message.
  it("refuses a larger file with an error on the file field", () => {
    const result = mintBadgeValidationSchema.safeParse({
      recipients: [recipient],
      file: csv(LIMIT + 1),
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual([
      expect.objectContaining({
        path: ["file"],
        message: "File must be less than 2MB",
      }),
    ]);
  });
});
