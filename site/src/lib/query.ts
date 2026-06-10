import { useQuery } from "@tanstack/react-query";
import { fetchHistoryIndex, fetchHistorySnapshot, fetchLatest } from "./api";

export function useLatestReport() {
  return useQuery({
    queryKey: ["report", "latest"],
    queryFn: ({ signal }) => fetchLatest(signal),
  });
}

export function useHistoryIndex() {
  return useQuery({
    queryKey: ["history", "index"],
    queryFn: ({ signal }) => fetchHistoryIndex(signal),
  });
}

export function useHistorySnapshot(stamp: string, path: string | undefined) {
  return useQuery({
    queryKey: ["history", "snapshot", stamp, path] as const,
    queryFn: ({ signal }) =>
      fetchHistorySnapshot(path as string, signal),
    enabled: Boolean(path),
  });
}
