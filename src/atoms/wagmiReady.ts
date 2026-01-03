import { atom, useAtomValue } from "jotai";

/**
 * Atom to track if a wagmi auto connection attempt has been made.
 */
export const wagmiConnectionAttemptedAtom = atom<boolean>(false);

/**
 * Atom to track if wagmi is ready (i.e., auto connection attempt has completed).
 */
export const wagmiReadyAtom = atom<boolean>(false);

/**
 * Hook to access the wagmi ready state.
 *
 * @returns Boolean indicating if wagmi is ready.
 */
export const useWagmiReady = (): boolean => useAtomValue(wagmiReadyAtom);
