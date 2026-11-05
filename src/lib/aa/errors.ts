/** The bundler's AA10 "sender already constructed", as viem and permissionless report it. */
export function isAlreadyDeployedError(error: unknown): boolean {
  const details =
    error && typeof error === "object" && "details" in error
      ? String((error as { details?: unknown }).details ?? "")
      : "";
  const text = error instanceof Error ? `${error.message} ${details}` : String(error);
  return /\bAA10\b|already been deployed|sender already constructed/i.test(text);
}
