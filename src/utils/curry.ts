/**
 *  A curried version of the `prop` function that retrieves a property value from an object.
 *
 * @param key The key of the property to retrieve from the object.
 * @returns A function that takes an object and returns the value of the specified property.
 */
export function prop<T extends object, K extends keyof T>(
  key: K,
): (obj: T) => T[K] {
  return (obj: T) => obj[key];
}

/**
 * A curried version of the `toLowerCase` function that applies to a specific property of an object.
 *
 * @param fn A function that takes an object and returns a string property of that object.
 * @returns A function that takes an object and returns the lowercase version of the specified string property.
 */
export function toLowerCase<T extends object>(
  fn: (obj: T) => string,
): (obj: T) => string {
  return (obj: T) => fn(obj).toLowerCase();
}
