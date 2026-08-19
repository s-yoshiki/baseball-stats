const USER_AGENT = "baseball-stats/0.1 (+https://github.com/s-yoshiki)";

export async function fetchHtml(
  url: string,
  options: { timeoutMs?: number } = {},
): Promise<string> {
  const response = await fetch(url, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": USER_AGENT,
    },
    signal: AbortSignal.timeout(options.timeoutMs ?? 30_000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.text();
}
