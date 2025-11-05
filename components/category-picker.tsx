"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"

interface CategoryPickerProps {
  categories: string[]
  initialCategory?: string
  onCategoryChange?: (category: string) => void
}

export default function CategoryPicker({ categories, initialCategory, onCategoryChange }: CategoryPickerProps) {
  const [selectedIndex, setSelectedIndex] = useState(() => {
    if (initialCategory) {
      const index = categories.indexOf(initialCategory)
      return index >= 0 ? index : 0
    }
    return 0
  })

  const [isDragging, setIsDragging] = useState(false)
  const [startY, setStartY] = useState(0)
  const [scrollOffset, setScrollOffset] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const itemHeight = 60 // Height of each category item in pixels

  // Handle selection change
  useEffect(() => {
    if (onCategoryChange && categories[selectedIndex]) {
      onCategoryChange(categories[selectedIndex])
    }
  }, [selectedIndex, categories, onCategoryChange])

  // Handle mouse/touch events for dragging
  const handleStart = (clientY: number) => {
    if (isAnimating) return
    setIsDragging(true)
    setStartY(clientY)
  }

  const handleMove = (clientY: number) => {
    if (!isDragging) return

    const delta = clientY - startY
    setScrollOffset(delta)

    // Calculate potential new index based on drag distance
    const potentialIndex = Math.round(delta / -itemHeight) + selectedIndex

    // Visual feedback only during drag, don't update selected index yet
  }

  const handleEnd = () => {
    if (!isDragging) return

    // Calculate new index based on drag distance
    let newIndex = Math.round(scrollOffset / -itemHeight) + selectedIndex

    // Clamp to valid range
    newIndex = Math.max(0, Math.min(categories.length - 1, newIndex))

    // Animate to the new position
    setIsAnimating(true)
    setSelectedIndex(newIndex)
    setScrollOffset(0)
    setIsDragging(false)

    // Reset animation state after animation completes
    setTimeout(() => {
      setIsAnimating(false)
    }, 300)
  }

  // Navigate to category page when selection is confirmed
  const handleCategorySelect = () => {
    if (categories[selectedIndex]) {
      const categorySlug = categories[selectedIndex].toLowerCase().replace(/\s+/g, "-")
      router.push(`/dashboard/category/${categorySlug}`)
    }
  }

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative h-[300px] w-full max-w-[300px] overflow-hidden"
        ref={containerRef}
        onMouseDown={(e) => handleStart(e.clientY)}
        onMouseMove={(e) => handleMove(e.clientY)}
        onMouseUp={() => handleEnd()}
        onMouseLeave={() => isDragging && handleEnd()}
        onTouchStart={(e) => handleStart(e.touches[0].clientY)}
        onTouchMove={(e) => handleMove(e.touches[0].clientY)}
        onTouchEnd={() => handleEnd()}
      >
        {/* Highlight for selected item */}
        <div className="absolute left-0 right-0 top-1/2 h-[60px] -translate-y-1/2 bg-gray-800/80 backdrop-blur-sm z-10 border-t border-b border-gray-700"></div>

        {/* Category items */}
        <div
          className={`absolute left-0 right-0 transition-transform ${isAnimating ? "duration-300 ease-out" : ""}`}
          style={{
            transform: `translateY(${150 - (selectedIndex * itemHeight) + scrollOffset}px)`,
          }}
        >
          {categories.map((category, index) => {
            // Calculate distance from center for opacity
            const distanceFromCenter = Math.abs(index - selectedIndex - scrollOffset / itemHeight)
            const opacity = Math.max(0, 1 - distanceFromCenter * 0.3)

            return (
              <div
                key={category}
                className="flex items-center justify-center h-[60px] text-center cursor-pointer"
                style={{
                  opacity,
                  transform: `scale(${1 - distanceFromCenter * 0.1})`,
                  transition: isAnimating ? "opacity 300ms, transform 300ms" : "none",
                }}
                onClick={() => {
                  if (Math.abs(index - selectedIndex) <= 1) {
                    setIsAnimating(true)
                    setSelectedIndex(index)
                    setTimeout(() => setIsAnimating(false), 300)
                  }
                }}
              >
                <span className={`text-2xl font-medium ${index === selectedIndex ? "text-white" : "text-gray-400"}`}>
                  {category}
                </span>
              </div>
            )
          })}
        </div>

        {/* Gradient overlays for fading effect */}
        <div className="absolute top-0 left-0 right-0 h-[120px] bg-gradient-to-b from-black to-transparent pointer-events-none z-20"></div>
        <div className="absolute bottom-0 left-0 right-0 h-[120px] bg-gradient-to-t from-black to-transparent pointer-events-none z-20"></div>
      </div>

      <button
        className="mt-8 px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
        onClick={handleCategorySelect}
      >
        Browse {categories[selectedIndex]}
      </button>
    </div>
  )
}
