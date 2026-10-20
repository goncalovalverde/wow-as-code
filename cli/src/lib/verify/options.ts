/** Parses --regex-timeout; returns undefined when the value is not a positive integer. */
export function parseRegexTimeout(raw: string): number | undefined {
  const value = Number(raw);
  return Number.isInteger(value) && value >= 1 ? value : undefined;
}
