const PARAM_LIMIT = 100;

export function formatToolParams(parameters: Record<string, unknown>): string {
  const parts = Object.entries(parameters).map(([k, v]) => {
    const value =
      v === null
        ? "null"
        : typeof v === "object"
          ? JSON.stringify(v)
          : String(v);
    return `${k}=${value}`;
  });
  const joined = parts.join(", ");
  return joined.length > PARAM_LIMIT
    ? joined.slice(0, PARAM_LIMIT) + "\u2026"
    : joined;
}

export function isToolError(result: string): boolean {
  return result.trim().toLowerCase().startsWith("error");
}
