/** The bundler's AA10 "sender already constructed", as viem and permissionless report it. */
export function isAlreadyDeployedError(error: unknown): boolean {
  const details =
    error && typeof error === "object" && "details" in error
      ? String((error as { details?: unknown }).details ?? "")
      : "";
  const text = error instanceof Error ? `${error.message} ${details}` : String(error);
  return /\bAA10\b|already been deployed|sender already constructed/i.test(text);
}

function chainText(error: unknown): string {
  const parts: string[] = [];
  let current: unknown = error;
  for (let depth = 0; depth < 8 && current; depth += 1) {
    if (typeof current === "string") {
      parts.push(current);
      break;
    }
    if (typeof current !== "object") break;
    const record = current as Record<string, unknown>;
    for (const key of ["name", "shortMessage", "message", "details"]) {
      if (typeof record[key] === "string") parts.push(record[key] as string);
    }
    if (record.code === 4001) parts.push("User rejected the request");
    current = record.cause;
  }
  return parts.join("\n");
}

/** The user declined in the wallet (a signature, a transaction or a chain switch). */
export function isUserRejection(error: unknown): boolean {
  return /user rejected|user denied|rejected the request|UserRejectedRequestError/i.test(
    chainText(error),
  );
}

/**
 * The node ran the call and the contract refused it. A request that never got
 * an answer (timeout, HTTP error, rate limit) is not a revert: it says nothing
 * about whether the call would succeed.
 */
export function isContractRevert(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 8 && current; depth += 1) {
    if (typeof current !== "object") break;
    const record = current as Record<string, unknown>;
    if (
      record.name === "ContractFunctionRevertedError" ||
      record.name === "ExecutionRevertedError"
    ) {
      return true;
    }
    current = record.cause;
  }
  return /execution reverted/i.test(chainText(error));
}

/**
 * Society could not pay for a sponsored action: the paymaster, the bundler
 * or /api/aa/rpc refused or failed before the owner was asked to sign. The
 * caller may send the same call paid by the owner wallet instead.
 */
export class SponsorshipUnavailableError extends Error {
  override name = "SponsorshipUnavailableError";
  constructor(cause: unknown) {
    super("Free gas is unavailable right now", { cause });
  }
}

/**
 * Whether a failed sponsored send may fall back to the owner wallet.
 * Only failures before the signature request count: nothing was signed or
 * submitted, so the owner-paid transaction cannot double the action. A
 * rejection in the wallet is the user's answer, not a refusal to sponsor.
 * Whether the call itself would revert is checked separately, by simulating
 * the owner-paid transaction before it is sent.
 */
export function sponsorshipIsUnavailable(
  error: unknown,
  stage: { signatureRequested: boolean },
): boolean {
  if (stage.signatureRequested) return false;
  if (error instanceof SponsorshipUnavailableError) return true;
  return !isUserRejection(error);
}
