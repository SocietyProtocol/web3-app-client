/**
 * Upsert elements into a map based on a specified key.
 *
 * @param prev The previous map to be updated.
 * @param newElements An array of new elements to be added or updated in the map.
 * @param keyFn A function that takes an element and returns the key to be used for the map.
 * @returns A new map containing the upserted elements.
 */
export function upsertIntoMapByKey<T, K extends keyof T>(
  prev: Map<T[K] & string, T>,
  newElements: readonly T[],
  keyFn: (el: T) => T[K] & string,
): Map<T[K] & string, T> {
  const next = new Map(prev);

  for (const el of newElements) {
    next.set(keyFn(el), el);
  }

  return next;
}
