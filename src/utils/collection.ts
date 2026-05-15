export type DeepKeys<T> = T extends object
  ? {
      [K in keyof T]: `${Exclude<K, symbol>}${"" | `.${DeepKeys<T[K]>}`}`;
    }[keyof T]
  : never;

export type DeepValue<
  T,
  P extends string,
> = P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? DeepValue<T[K], Rest>
    : undefined
  : P extends keyof T
    ? T[P]
    : undefined;

export function get<
  TData,
  TPath extends DeepKeys<TData>,
  TDefault = DeepValue<TData, TPath>,
>(
  data: TData,
  path: TPath,
  defaultValue?: TDefault,
): DeepValue<TData, TPath> | TDefault {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const value = path.split(".").reduce<any>((acc, key) => acc?.[key], data);

  return value !== undefined ? value : defaultValue!;
}

/**
 * Searches for a query string within specified fields of objects in a collection.
 * Supports nested fields using dot notation.
 *
 * @param collection The array of objects to search within.
 * @param query The search string to look for.
 * @param fields The fields of the objects to search in (supports dot notation for nested fields).
 * @returns A filtered array of objects where the query matches any of the specified fields.
 */
export const searchInCollection = <T extends object>(
  collection: T[],
  query: string,
  fields: DeepKeys<T>[],
): T[] => {
  const q = query.toLowerCase();

  return collection.filter((item) =>
    fields.some((field) => {
      const value = get(item, field);
      return typeof value === "string" && value.toLowerCase().includes(q);
    }),
  );
};

/**
 * Removes duplicate strings from an array while preserving the original order.
 *
 * @param arr The array of strings to be processed.
 * @returns A new array containing only unique strings from the input array.
 */
export function uniq<T extends string>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

/**
 * Removes duplicate items from an array based on a specified key extractor function.
 * Preserves the original order of items.
 *
 * @param arr The array of items to be processed.
 * @param getKey A function that extracts a unique key from each item.
 * @returns A new array containing only unique items based on the extracted key.
 */
export function uniqueBy<T>(arr: T[], getKey: (item: T) => string): T[] {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const item of arr) {
    const key = getKey(item);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }

  return result;
}
