export type DeepKeys<T> = T extends object
  ? {
      [K in keyof T]: `${Exclude<K, symbol>}${"" | `.${DeepKeys<T[K]>}`}`;
    }[keyof T]
  : never;

type GetIndexedField<T, K extends DeepKeys<T>> = K extends keyof T
  ? T[K]
  : K extends `${number}`
    ? "0" extends keyof T
      ? undefined
      : number extends keyof T
        ? T[number]
        : undefined
    : undefined;

type FieldWithPossiblyUndefined<T, Key> =
  | DeepValue<Exclude<T, undefined>, Key>
  | Extract<T, undefined>;

type IndexedFieldWithPossiblyUndefined<T, Key extends DeepKeys<T>> =
  | GetIndexedField<Exclude<T, undefined>, Key>
  | Extract<T, undefined>;

export type DeepValue<T, P> = P extends `${infer Left}.${infer Right}`
  ? Left extends keyof T
    ? FieldWithPossiblyUndefined<T[Left], Right>
    : Left extends `${infer FieldKey}[${infer IndexKey}]`
      ? FieldKey extends keyof T
        ? IndexKey extends DeepKeys<T[FieldKey]>
          ? FieldWithPossiblyUndefined<
              IndexedFieldWithPossiblyUndefined<T[FieldKey], IndexKey>,
              Right
            >
          : undefined
        : undefined
      : undefined
  : P extends keyof T
    ? T[P]
    : P extends `${infer FieldKey}[${infer IndexKey}]`
      ? FieldKey extends keyof T
        ? IndexKey extends DeepKeys<T[FieldKey]>
          ? IndexedFieldWithPossiblyUndefined<T[FieldKey], IndexKey>
          : undefined
        : undefined
      : undefined;

export function get<
  TData,
  TPath extends string,
  TDefault = DeepValue<TData, TPath>,
>(
  data: TData,
  path: TPath,
  defaultValue?: TDefault,
): DeepValue<TData, TPath> | TDefault {
  const value = path
    .split(/[.[\]]/)
    .filter(Boolean)
    .reduce<DeepValue<TData, TPath>>(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (value, key) => (value as any)?.[key],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data as any,
    );

  return value !== undefined ? value : (defaultValue as TDefault);
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
  const lowerCaseQuery = query.toLowerCase();
  return collection.filter((item) =>
    fields.some((field) => {
      // Handle nested fields with dot notation
      const fieldValue = get(item, field);

      if (typeof fieldValue === "string") {
        return fieldValue.toLowerCase().includes(lowerCaseQuery);
      }

      return false;
    }),
  );
};
