import { describe, expect, it } from "vitest";
import type { ProviderContext, SnackbarKey, SnackbarMessage } from "notistack";
import { createTransactionNotices } from "./transaction-notices";

/**
 * The part of notistack that matters here: a closed toast stays until it
 * has slid out, and then every toast with its key is removed.
 */
function fakeSnackbar() {
  let toasts: { key: SnackbarKey; message: SnackbarMessage; closing: boolean }[] = [];
  const context = {
    enqueueSnackbar: (message: SnackbarMessage, options?: { key?: SnackbarKey }) => {
      const key = options?.key ?? Math.random();
      toasts.push({ key, message, closing: false });
      return key;
    },
    closeSnackbar: (key?: SnackbarKey) => {
      toasts = toasts.map((toast) => (toast.key === key ? { ...toast, closing: true } : toast));
    },
  } as unknown as ProviderContext;
  const finishExits = () => {
    const exited = new Set(toasts.filter((toast) => toast.closing).map((toast) => toast.key));
    toasts = toasts.filter((toast) => !exited.has(toast.key));
  };
  const onScreen = () => toasts.filter((toast) => !toast.closing).map((toast) => toast.message);
  return { context, finishExits, onScreen };
}

describe("createTransactionNotices", () => {
  it("keeps the next notice on screen after the one it replaces has slid out", () => {
    const snackbar = fakeSnackbar();
    const notices = createTransactionNotices("tx", snackbar.context);

    notices.show("Step 1 of 2");
    notices.show("Step 2 of 2");
    snackbar.finishExits();

    expect(snackbar.onScreen()).toEqual(["Step 2 of 2"]);
  });

  it("closes the notice on screen, and only that one", () => {
    const snackbar = fakeSnackbar();
    const notices = createTransactionNotices("tx", snackbar.context);

    notices.show("Step 1 of 2");
    notices.show("Step 2 of 2");
    notices.close();
    snackbar.finishExits();

    expect(snackbar.onScreen()).toEqual([]);
  });

  it("gives each notice a key that ends in -notice", () => {
    const keys: unknown[] = [];
    const notices = createTransactionNotices("tx", {
      enqueueSnackbar: (_message: SnackbarMessage, options?: { key?: SnackbarKey }) => {
        keys.push(options?.key);
        return options?.key ?? 0;
      },
      closeSnackbar: () => {},
    } as unknown as ProviderContext);

    notices.show("Step 1 of 2");
    notices.show("Step 2 of 2");

    expect(keys).toEqual(["tx-1-notice", "tx-2-notice"]);
  });
});
