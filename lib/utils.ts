import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Shuffles an array using the Fisher-Yates algorithm
 * @param array The array to shuffle
 * @returns A new shuffled array
 */
export function shuffleArray<T>(array: T[]): T[] {
  // Create a copy of the array to avoid mutating the original
  const shuffled = [...array]

  // Fisher-Yates shuffle algorithm
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  return shuffled
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
