import { formatDistanceToNow, parseISO } from "date-fns";

export function truncSha(sha: string | undefined | null, length = 7): string {
  if (!sha) {
    return "";
  }
  return String(sha).slice(0, length);
}

export function relativeTime(iso: string | undefined | null): string {
  if (!iso) {
    return "unknown";
  }
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true });
  } catch {
    return iso;
  }
}

export function formatUtc(iso: string | undefined | null): string {
  if (!iso) {
    return "unknown";
  }
  try {
    // Compact UTC, no seconds, with a trailing ` UTC` so the timezone
    // is unambiguous when the value lands on the screen alone (e.g. in
    // the history list). Use title= for the precise ISO string.
    const d = parseISO(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return (
      `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
      `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`
    );
  } catch {
    return iso;
  }
}

export function sourceRepoUrl(
  repo: string,
  ref?: string,
  path?: string,
): string {
  const base = `https://github.com/${repo}`;
  if (!ref) {
    return base;
  }
  const sub = path ? `/${path.replace(/^\//, "")}` : "";
  return `${base}/tree/${ref}${sub}`;
}

export function pluralize(n: number, singular: string, plural?: string) {
  if (n === 1) {
    return `${n} ${singular}`;
  }
  return `${n} ${plural ?? `${singular}s`}`;
}
