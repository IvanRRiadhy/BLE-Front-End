export function isValidJsonString(value: unknown): value is string {
  if (typeof value !== "string") return false;

  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}
