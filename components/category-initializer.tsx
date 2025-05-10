"use client"

import { useEffect, useState } from "react"
import { initializeCategorySystem } from "@/lib/category-system/category-db"

export default function CategoryInitializer() {
  const [initialized, setInitialized] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function initialize() {
      try {
        await initializeCategorySystem()
        setInitialized(true)
      } catch (err) {
        console.error("Failed to initialize categories:", err)
        setError(err instanceof Error ? err : new Error("Failed to initialize categories"))
      }
    }

    initialize()
  }, [])

  // This component doesn't render anything visible
  return null
}
