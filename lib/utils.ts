import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Shuffles an array using the Fisher-Yates algorithm
 */
// Enhanced shuffle function that accepts an optional seed for more variety
export function shuffleArray<T>(array: T[], seed?: number): T[] {
  const newArray = [...array]
  let currentIndex = newArray.length
  let temporaryValue, randomIndex

  // Use a seed for more variety if provided
  const getSeed = seed !== undefined ? seed : Math.floor(Math.random() * 10000)

  // Fisher-Yates shuffle with seeded randomness
  while (currentIndex !== 0) {
    // Use a combination of current index and seed for randomness
    randomIndex = Math.floor((Math.sin(currentIndex * getSeed) * 10000) % currentIndex)
    currentIndex -= 1

    // Swap elements
    temporaryValue = newArray[currentIndex]
    newArray[currentIndex] = newArray[randomIndex]
    newArray[randomIndex] = temporaryValue
  }

  return newArray
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
