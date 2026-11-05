import { ResponseError } from "@/errors/ResponseError";
import {
  ValidationError,
  ValidationErrorDetails,
} from "@/errors/ValidationError";
import {
  BaseError,
  ContractFunctionExecutionError,
  ContractFunctionRevertedError,
} from "viem";

/**
 * Represents the result of parsing an error
 */
export interface ParsedError {
  message: string;
  validationErrors?: ValidationErrorDetails;
}

/**
 * Contract error messages mapping
 */
const CONTRACT_ERROR_MESSAGES: Record<string, string> = {
  AccessControlBadConfirmation: "Access control confirmation failed",
  AccessControlUnauthorizedAccount: "Unauthorized account",
  AddressEmptyCode: "Address does not contain code",
  AlreadyInvited: "User has already been invited",
  BadgeDoesNotExist: "Badge does not exist",
  BurnDeniedByHook: "Burn operation denied by hook",
  BurnNotAuthorized: "You are not authorized to burn this badge",
  ERC1155InsufficientBalance: "User does not hold this badge",
  ERC1155InvalidApprover: "Invalid approver",
  ERC1155InvalidArrayLength: "Array length mismatch",
  ERC1155InvalidOperator: "Invalid operator",
  ERC1155InvalidReceiver: "Invalid receiver",
  ERC1155InvalidSender: "Invalid sender",
  ERC1155MissingApprovalForAll: "Missing approval for all",
  ERC1967InvalidImplementation: "Invalid implementation",
  ERC1967NonPayable: "Non-payable function",
  FailedCall: "Call failed",
  InvalidInitialization: "Invalid initialization",
  InvalidSignature: "Invalid signature",
  MintDeniedByHook: "Mint operation denied by hook",
  MintNotAuthorized: "You are not authorized to mint this badge",
  NotInitializing: "Contract is not initializing",
  NotProfileOwner: "You are not the profile owner",
  ProfileAlreadyExists: "Profile already exists",
  SelfInvitation: "Cannot invite yourself",
  StringsInsufficientHexLength: "Insufficient hex length",
  TransferDeniedByHook: "Transfer operation denied by hook",
  TransferNotAuthorized: "You are not authorized to transfer this badge",
  UUPSUnauthorizedCallContext: "Unauthorized call context",
  UUPSUnsupportedProxiableUUID: "Unsupported proxiable UUID",
  Unauthorized: "Unauthorized action",
  // ERC20 errors
  ERC20InsufficientBalance: "Insufficient token balance",
  ERC20InvalidSender: "Invalid sender address",
  ERC20InvalidReceiver: "Invalid receiver address",
  ERC20InsufficientAllowance: "Insufficient token allowance",
  ERC20InvalidApprover: "Invalid approver address",
  ERC20InvalidSpender: "Invalid spender address",

  // SocietyVIPManager specific errors
  InsufficientAmount: "Insufficient amount provided",
  InvalidBadgeId: "Invalid badge ID",
  OwnableInvalidOwner: "Invalid owner address",
  OwnableUnauthorizedAccount: "Unauthorized account",
  SafeERC20FailedOperation: "ERC20 operation failed",
  LockDurationTooShort: "Lock duration is too short",
  LockStillActive: "Lock is still active",
  NoTokensLocked: "No tokens are currently locked",
};

/**
 * Bundler, paymaster and /api/aa/rpc failures, matched against the whole
 * error chain. Order matters: specific codes before the paymaster catch-all.
 */
const PAYMASTER_FAILED =
  "Society could not sponsor this action. Please try again later or ask an admin.";

const ACCOUNT_ABSTRACTION_MESSAGES: [RegExp, string][] = [
  [
    /\bAA21\b|didn't pay prefund|InsufficientPrefundError|does not have sufficient funds to execute the User Operation/i,
    "Your Society account does not have enough ETH for this action. Send ETH to it from your wallet or ask an admin.",
  ],
  [/\bAA34\b|UserOperationPaymasterSignatureError/, PAYMASTER_FAILED],
  [
    /\bAA2[34]\b|signature error|UserOperationSignatureError|SmartAccountFunctionRevertedError/i,
    "Your wallet's signature was not accepted for your Society account. Make sure the wallet that owns it is connected.",
  ],
  [
    /\bAA25\b|invalid (smart )?account nonce|InvalidAccountNonceError/i,
    "Your Society account has another action in progress. Wait for it to finish and try again.",
  ],
  [
    /Sponsorship is not configured/i,
    "Sponsored transactions are not available right now. Please try again later.",
  ],
  [
    /outside the sponsorship allowlist|This call is not sponsored/i,
    "Society does not sponsor this action.",
  ],
  [
    /rate limit|too many requests|status:\s*429/i,
    "Too many requests. Please wait a moment and try again.",
  ],
  [
    /policy\b[^.\n]*\b(limit|cap|exceeded|exhausted|reached)|sponsorship (limit|cap)|spending limit|max(imum)? sponsor/i,
    "Society's sponsorship limit for this action has been reached. Please try again later or ask an admin.",
  ],
  [
    /Sponsorship provider did not respond/i,
    "The sponsorship service did not respond. Please try again.",
  ],
  [/\bAA3\d\b|paymaster|pm_sponsorUserOperation|pm_getPaymaster/i, PAYMASTER_FAILED],
];

function errorChainText(error: unknown): string {
  const parts: string[] = [];
  let current: unknown = error;
  for (let depth = 0; depth < 8 && current; depth++) {
    if (typeof current === "string") {
      parts.push(current);
      break;
    }
    if (typeof current !== "object") break;
    const record = current as Record<string, unknown>;
    // viem's message repeats the request arguments; read its parts instead.
    const keys =
      typeof record.shortMessage === "string"
        ? ["shortMessage", "details", "reason"]
        : ["message", "details", "reason"];
    for (const key of keys) {
      if (typeof record[key] === "string") parts.push(record[key] as string);
    }
    if (typeof record.name === "string") parts.push(record.name);
    if (record.status === 429) parts.push("status: 429");
    current = record.cause;
  }
  return parts.join("\n");
}

/** A friendly message for smart account and sponsorship failures, if any. */
export function parseAccountAbstractionError(error: unknown): string | undefined {
  // Our own API errors already carry the message to show.
  if (error instanceof ValidationError || error instanceof ResponseError) {
    return undefined;
  }
  const text = errorChainText(error);
  if (!text || /user rejected|user denied/i.test(text)) return undefined;
  return ACCOUNT_ABSTRACTION_MESSAGES.find(([pattern]) => pattern.test(text))?.[1];
}

/**
 * Gets the validation error message for a specific field
 *
 * @param error - The unknown error to extract the field error from
 * @param field - The field name to get the error message for
 * @returns The error message for the specified field, or undefined if not found
 */
export function getFieldError(
  error: unknown,
  field: string,
): string | undefined {
  if (error instanceof ValidationError) {
    return error.details?.[field]?.[0];
  }
  return undefined;
}

/**
 * Parses an unknown error into a user-friendly message
 *
 * @param error - The unknown error to parse
 * @param defaultMessage - The default message to return if no specific message is found
 * @returns The parsed error message
 */
export function parseErrorMessage(
  error: unknown,
  defaultMessage = "An unexpected error occurred",
): string {
  // Check for contract error in error.cause.data.errorName
  if (
    typeof error === "object" &&
    error !== null &&
    "cause" in error &&
    typeof error.cause === "object" &&
    error.cause !== null &&
    "data" in error.cause &&
    typeof error.cause.data === "object" &&
    error.cause.data !== null &&
    "errorName" in error.cause.data &&
    typeof error.cause.data.errorName === "string"
  ) {
    const errorName = error.cause.data.errorName;
    const contractMessage = CONTRACT_ERROR_MESSAGES[errorName];
    if (contractMessage) {
      return contractMessage;
    }
  }

  const accountAbstractionMessage = parseAccountAbstractionError(error);
  if (accountAbstractionMessage) {
    return accountAbstractionMessage;
  }

  if (error instanceof ValidationError) {
    return error.message;
  } else if (
    error instanceof ContractFunctionExecutionError &&
    error.cause instanceof ContractFunctionRevertedError
  ) {
    return defaultMessage; // Avoid showing raw revert reasons which can be technical and confusing
  } else if (error instanceof BaseError) {
    return error.shortMessage;
  } else if (
    error instanceof SyntaxError &&
    error.message === "Unexpected end of JSON input"
  ) {
    return "Server error";
  } else if (error instanceof Error) {
    return error.message;
  } else if (
    typeof error === "object" &&
    error !== null &&
    "message" in error
  ) {
    return (error as { message: string }).message;
  } else if (typeof error === "string") {
    return error;
  }

  return defaultMessage;
}

/**
 * Throws appropriate ResponseError or ValidationError based on the response status
 *
 * @param response
 */
export async function throwResponseError(response: Response): Promise<never> {
  if (response.status === 429) {
    const errorData = await response.json();

    throw new ResponseError(
      `Rate limit exceeded. Please try again at ${new Date(
        errorData.resetTime,
      ).toLocaleTimeString()}`,
      429,
      response.statusText,
      errorData,
    );
  }

  if (response.status === 401) {
    const errorData = await response.json();
    throw new ResponseError(
      errorData.error || "Authentication failed.",
      401,
      response.statusText,
      errorData,
    );
  }

  if (response.status === 400) {
    const errorData = await response.json();
    if (errorData?.details) {
      throw new ValidationError("Validation failed", errorData.details);
    } else {
      throw new ResponseError(
        errorData.error || "Bad request.",
        400,
        response.statusText,
        errorData,
      );
    }
  }

  if (response.status >= 500) {
    throw new ResponseError(
      "Server error occurred. Please try again later.",
      response.status,
      response.statusText,
      await response.text(),
    );
  }

  throw new Error("Unknown error occurred", {
    cause: await response.text(),
  });
}
