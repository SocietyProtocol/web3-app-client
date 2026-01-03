import { ProfileErrorResponse } from "@/app/api/profile/route";
import { ResponseError } from "./ResponseError";

/**
 * Represents validation errors for form fields
 */
export type ValidationErrorDetails = ProfileErrorResponse["details"];

export class ValidationError extends ResponseError<ValidationErrorDetails> {
  details: ValidationErrorDetails;

  constructor(message: string, details: ValidationErrorDetails) {
    super(message, 400, "Bad Request", details);
    this.name = "ValidationError";
    this.details = details;
  }
}
