import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";
import { fetchHistorySnapshot } from "./api";
import type { HistoryIndex } from "../types/report";

/**
 * Fetch the most recent N history snapshots in parallel and pluck out the
 * risk_score for the given skill so the SkillDetail page can draw a sparkline.
 *
 * Returns empty if history is missing or the skill has no entries.
 */
export function useHistorySparkline(
  index: HistoryIndex | undefined,
  namespace: string,
  slug: string,
  limit = 30,
) {
  const recent = useMemo(() => {
    if (!index?.entries?.length) return [];
    // History entries arrive newest-first from the manifest; reverse so the
    // chart reads left-to-right in time order.
    const sliced = index.entries.slice(0, limit).reverse();
    return sliced;
  }, [index, limit]);

  const datas = useQueries({
    queries: recent.map((e) => ({
      queryKey: ["history", "snapshot", e.stamp] as const,
      queryFn: ({ signal }: { signal?: AbortSignal }) =>
        fetchHistorySnapshot(e.path, signal),
      staleTime: 5 * 60_000,
    })),
    combine: (results) => results.map((r) => r.data),
  });

  return useMemo(() => {
    const points: { x: string; y: number }[] = [];
    datas.forEach((data, i) => {
      if (!data) return;
      const entry = recent[i];
      if (!entry) return;
      const skill = data.skills?.find(
        (s) => s.namespace === namespace && s.slug === slug,
      );
      if (!skill) return;
      const score = skill.scanners?.skillspector?.risk_score ?? 0;
      points.push({ x: entry.stamp, y: score });
    });
    return points;
  }, [datas, recent, namespace, slug]);
}
