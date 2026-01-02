import {
  ValidationError,
  ValidationErrorDetails,
} from "@/errors/ValidationError";
import { BaseError } from "viem";

/**
 * Represents the result of parsing an error
 */
export interface ParsedError {
  message: string;
  validationErrors?: ValidationErrorDetails;
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
  field: string
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
  defaultMessage = "An unexpected error occurred"
): string {
  if (error instanceof ValidationError) {
    return error.message;
  } else if (error instanceof BaseError) {
    return error.shortMessage;
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
