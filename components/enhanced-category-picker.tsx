"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"

interface CategoryPickerProps {
  categories: string[]
  initialCategory?: string
  onCategoryChange?: (category: string) => void
}

export default function EnhancedCategoryPicker({ categories, initialCategory, onCategoryChange }: CategoryPickerProps) {
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
  const [velocity, setVelocity] = useState(0)
  const [lastY, setLastY] = useState(0)
  const [lastTime, setLastTime] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const animationRef = useRef<number | null>(null)
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

    // Cancel any ongoing animation
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }

    setIsDragging(true)
    setStartY(clientY)
    setLastY(clientY)
    setLastTime(Date.now())
    setVelocity(0)
  }

  const handleMove = (clientY: number) => {
    if (!isDragging) return

    const now = Date.now()
    const elapsed = now - lastTime

    if (elapsed > 0) {
      // Calculate velocity (pixels per millisecond)
      const newVelocity = (clientY - lastY) / elapsed
      // Smooth velocity with some damping
      setVelocity(newVelocity * 0.8 + velocity * 0.2)
    }

    const delta = clientY - startY
    setScrollOffset(delta)
    setLastY(clientY)
    setLastTime(now)
  }

  const handleEnd = () => {
    if (!isDragging) return
    setIsDragging(false)

    // Calculate momentum and animate to final position
    const momentumDistance = velocity * 100 // Adjust multiplier for momentum feel

    // Calculate new index based on drag distance plus momentum
    let newIndex = Math.round((scrollOffset + momentumDistance) / -itemHeight) + selectedIndex

    // Clamp to valid range
    newIndex = Math.max(0, Math.min(categories.length - 1, newIndex))

    // Animate to the new position
    animateToIndex(newIndex)
  }

  const animateToIndex = (index: number) => {
    setIsAnimating(true)

    const startOffset = scrollOffset
    const targetOffset = 0
    const startIndex = selectedIndex
    const targetIndex = index
    const startTime = Date.now()
    const duration = 300 // ms

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Ease out cubic function
      const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)
      const easedProgress = easeOut(progress)

      // Interpolate between start and target
      const currentOffset = startOffset * (1 - easedProgress)

      setScrollOffset(currentOffset)

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        // Animation complete
        setSelectedIndex(targetIndex)
        setScrollOffset(0)
        setIsAnimating(false)
        animationRef.current = null
      }
    }

    // Start animation
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current)
    }

    // Set the target index immediately for better UX
    setSelectedIndex(targetIndex)
    animationRef.current = requestAnimationFrame(animate)
  }

  // Clean up animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  // Navigate to category page when selection is confirmed
  const handleCategorySelect = () => {
    if (categories[selectedIndex]) {
      const categorySlug = categories[selectedIndex].toLowerCase().replace(/\s+/g, "-")
      router.push(`/dashboard/category/${categorySlug}`)
    }
  }

  // Calculate visible items for better performance
  const visibleItemCount = 7 // Number of items to render (should be odd)
  const halfVisibleCount = Math.floor(visibleItemCount / 2)

  // Get the range of indices to render
  const startIdx = Math.max(0, selectedIndex - halfVisibleCount - 2)
  const endIdx = Math.min(categories.length - 1, selectedIndex + halfVisibleCount + 2)
  const visibleCategories = categories.slice(startIdx, endIdx + 1)

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative h-[300px] w-full max-w-[300px] overflow-hidden picker-container"
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
            transform: `translateY(${150 - ((selectedIndex - startIdx) * itemHeight) + scrollOffset}px)`,
          }}
        >
          {visibleCategories.map((category, index) => {
            // Calculate the actual index in the full categories array
            const actualIndex = startIdx + index

            // Calculate distance from center for opacity and transform
            const distanceFromCenter = Math.abs(actualIndex - selectedIndex - scrollOffset / itemHeight)
            const opacity = Math.max(0.2, 1 - distanceFromCenter * 0.25)
            const scale = Math.max(0.8, 1 - distanceFromCenter * 0.1)

            return (
              <div
                key={`${category}-${actualIndex}`}
                className="flex items-center justify-center h-[60px] text-center cursor-pointer picker-item"
                style={{
                  opacity,
                  transform: `scale(${scale})`,
                  transition: isAnimating ? "opacity 300ms, transform 300ms" : "none",
                }}
                onClick={() => {
                  if (Math.abs(actualIndex - selectedIndex) <= 2) {
                    animateToIndex(actualIndex)
                  }
                }}
              >
                <span
                  className={`text-2xl font-medium ${actualIndex === selectedIndex ? "text-white" : "text-gray-400"}`}
                >
                  {category}
                </span>
              </div>
            )
          })}
        </div>

        {/* Gradient overlays for fading effect */}
        <div className="absolute top-0 left-0 right-0 h-[120px] bg-gradient-to-b from-black to-transparent pointer-events-none z-20 picker-gradient-top"></div>
        <div className="absolute bottom-0 left-0 right-0 h-[120px] bg-gradient-to-t from-black to-transparent pointer-events-none z-20 picker-gradient-bottom"></div>
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
