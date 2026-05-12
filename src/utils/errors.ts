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

  if (error instanceof ValidationError) {
    return error.message;
  } else if (
    error instanceof ContractFunctionExecutionError &&
    error.cause instanceof ContractFunctionRevertedError
  ) {
    console.error(error);

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
