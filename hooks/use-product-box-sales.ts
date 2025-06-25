"use client"

import { useState, useEffect } from "react"
import { ProductBoxSalesService, type ProductBoxSalesStats } from "@/lib/product-box-sales-service"
import { useAuth } from "@/contexts/auth-context"

export function useProductBoxSales() {
  const { user } = useAuth()
  const [data, setData] = useState<ProductBoxSalesStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSalesData = async () => {
    if (!user?.uid) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Try the main method first
      let salesStats = await ProductBoxSalesService.getSalesStats(user.uid)

      // If no data found, try the alternative purchases collection
      if (salesStats.totalSales === 0) {
        console.log("No sales found in productBoxSales, trying purchases collection...")
        salesStats = await ProductBoxSalesService.getSalesStatsFromPurchases(user.uid)
      }

      setData(salesStats)
    } catch (err) {
      console.error("Error fetching sales data:", err)

      // If there's an index error, try the alternative method
      if (err instanceof Error && err.message.includes("index")) {
        console.log("Index error detected, trying alternative method...")
        try {
          const salesStats = await ProductBoxSalesService.getSalesStatsFromPurchases(user.uid)
          setData(salesStats)
        } catch (altErr) {
          console.error("Alternative method also failed:", altErr)
          setError("Unable to load sales data")
          // Set empty data instead of null to prevent loading state
          setData({
            totalSales: 0,
            totalRevenue: 0,
            thisMonthSales: 0,
            thisMonthRevenue: 0,
            last30DaysSales: 0,
            last30DaysRevenue: 0,
            bestSellingProductBox: null,
            recentSales: [],
          })
        }
      } else {
        setError("Failed to load sales data")
        // Set empty data instead of null
        setData({
          totalSales: 0,
          totalRevenue: 0,
          thisMonthSales: 0,
          thisMonthRevenue: 0,
          last30DaysSales: 0,
          last30DaysRevenue: 0,
          bestSellingProductBox: null,
          recentSales: [],
        })
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSalesData()
  }, [user?.uid])

  return {
    data,
    loading,
    error,
    refresh: fetchSalesData,
  }
}
