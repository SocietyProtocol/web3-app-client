import type { ProviderContext, SnackbarKey, SnackbarMessage } from "notistack";

/**
 * The notices of one write that replace each other ("Step 1 of 2: ...",
 * "Step 2 of 2: ...", the free-gas notice). Each notice gets a key of its
 * own: notistack removes a closed toast by its key once it has slid out, so
 * a notice enqueued under the key that was just closed would be removed
 * together with the old one.
 */
export function createTransactionNotices(
  keyPrefix: string,
  { enqueueSnackbar, closeSnackbar }: ProviderContext,
) {
  let count = 0;
  let current: SnackbarKey | undefined;

  const close = () => {
    if (current !== undefined) closeSnackbar(current);
    current = undefined;
  };

  const show = (message: SnackbarMessage) => {
    close();
    count += 1;
    current = `${keyPrefix}-${count}-notice`;
    enqueueSnackbar(message, { key: current, variant: "info", persist: true });
  };

  return { show, close };
}
