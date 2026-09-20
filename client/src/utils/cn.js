/**
 * Lightweight class name merger.
 * Filters falsy values and joins class strings.
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}
