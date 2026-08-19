import { cn as mergeClasses, type ClassValue } from 'tailwind-variants';

export function cn(...values: ClassValue[]): string {
  return mergeClasses(...values) ?? '';
}

export const focusRing =
  'outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas';
