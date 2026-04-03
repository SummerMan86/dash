import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS classes with proper precedence
 * Used by all UI components for className composition
 */
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}
