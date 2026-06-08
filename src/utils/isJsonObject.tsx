export function isValidJsonString(value: unknown): value is string {
  if (typeof value !== "string") return false;

  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

export function safeParseAreaShape(value?: string) {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return []; // invalid JSON like "x0x0"
  }
}
