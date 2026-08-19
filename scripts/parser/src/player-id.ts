export function toBase36PlayerIdFromUrl(url: string): string {
  const match = new URL(url).pathname.match(/\/(\d+)\.html$/);
  if (!match?.[1]) {
    throw new Error(`Cannot extract NPB player ID from ${url}`);
  }
  return Number(match[1]).toString(36);
}
