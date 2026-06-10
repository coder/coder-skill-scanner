import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Compose Tailwind class strings. Same pattern registry-server uses.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
