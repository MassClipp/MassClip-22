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

      const response = await fetch(`/api/dashboard/sales-forecast?userId=${user.uid}`)

      if (!response.ok) {
        throw new Error("Failed to fetch sales forecast")
      }

      const data = await response.json()
      setForecast(data)
    } catch (err) {
      console.error("Error fetching sales forecast:", err)
      setError(err instanceof Error ? err.message : "Failed to load forecast")
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
