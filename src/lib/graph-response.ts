/** Make absent GraphQL data a React Query error instead of a render crash. */
export function requireGraphData<T>(
  data: T | null | undefined,
  operationName: string,
): T {
  if (data === null || data === undefined) {
    throw new Error(`${operationName} data is unavailable. Please try again.`);
  }

  return data;
}
