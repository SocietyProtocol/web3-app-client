import { AccountErrorResponse } from "@/app/api/account/route";

/**
 * Represents validation errors for form fields
 */
export type ValidationErrorDetails = AccountErrorResponse["details"];

export class ValidationError extends Error {
  details: ValidationErrorDetails;

  constructor(message: string, details: ValidationErrorDetails) {
    super(message);
    this.name = "ValidationError";
    this.details = details;
  }
}
