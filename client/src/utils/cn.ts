/**
 * Lightweight class name merger.
 * Filters falsy values and joins class strings.
 * No external deps — avoids clsx/tailwind-merge for the foundation.
 */
export function cn(
  ...classes: (string | undefined | null | false | 0)[]
): string {
  return classes.filter(Boolean).join(' ')
}
