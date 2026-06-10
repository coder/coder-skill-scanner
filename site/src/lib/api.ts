import type { HistoryIndex, Report } from "../types/report";

async function fetchJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const url = path.startsWith("/") ? path : `/${path}`;
  const res = await fetch(url, { cache: "no-cache", signal });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${path}`);
  }
  return (await res.json()) as T;
}

export function fetchLatest(signal?: AbortSignal): Promise<Report> {
  return fetchJson<Report>("latest.json", signal);
}

export function fetchHistoryIndex(signal?: AbortSignal): Promise<HistoryIndex> {
  return fetchJson<HistoryIndex>("history/index.json", signal);
}

export function fetchHistorySnapshot(
  path: string,
  signal?: AbortSignal,
): Promise<Report> {
  return fetchJson<Report>(path, signal);
}
