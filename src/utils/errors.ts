import { ResponseError } from "@/errors/ResponseError";
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
        errorData.resetTime
      ).toLocaleTimeString()}`,
      429,
      response.statusText,
      errorData
    );
  }

  if (response.status === 401) {
    const errorData = await response.json();
    throw new ResponseError(
      errorData.error || "Authentication failed.",
      401,
      response.statusText,
      errorData
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
        errorData
      );
    }
  }

  if (response.status >= 500) {
    throw new ResponseError(
      "Server error occurred. Please try again later.",
      response.status,
      response.statusText,
      await response.text()
    );
  }

  throw new Error("Unknown error occurred", {
    cause: await response.text(),
  });
}
