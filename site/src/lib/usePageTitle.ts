import { useEffect } from "react";

const BASE = "Coder Skill Scanner";

/**
 * Set document.title for the current route and restore the previous title
 * when the component unmounts. Lighter than react-helmet for our needs.
 *
 * Pass the page-specific prefix; the base name is appended automatically.
 */
export function usePageTitle(prefix?: string): void {
  useEffect(() => {
    const prev = document.title;
    document.title = prefix ? `${prefix} \u00b7 ${BASE}` : BASE;
    return () => {
      document.title = prev;
    };
  }, [prefix]);
}
