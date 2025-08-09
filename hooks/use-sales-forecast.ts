"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import type { SalesForecastData } from "@/lib/sales-forecast-service"

export function useSalesForecast() {
  const { user } = useAuth()
  const [forecast, setForecast] = useState<SalesForecastData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchForecast = async () => {
    if (!user?.uid) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      console.log(`📊 Fetching weekly sales forecast for user: ${user.uid}`)

      // Get the Firebase ID token for authentication
      const idToken = await user.getIdToken(true)

      const response = await fetch(`/api/dashboard/sales-forecast`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        cache: "no-store", // Ensure fresh data
      })

      if (!response.ok) {
        throw new Error("Failed to fetch weekly sales forecast")
      }

      const data = await response.json()
      console.log(`✅ Weekly forecast received:`, {
        pastWeek: data.pastWeekAverage,
        projectedNextWeek: data.projectedNextWeek,
        weeklyGoal: data.weeklyGoal,
        progressToGoal: data.progressToGoal,
        trend: data.trendDirection,
      })

      setForecast(data)
    } catch (err) {
      console.error("Error fetching weekly sales forecast:", err)
      setError(err instanceof Error ? err.message : "Failed to load weekly forecast")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchForecast()
  }, [user?.uid])

  return {
    forecast,
    loading,
    error,
    refetch: fetchForecast,
  }
}
