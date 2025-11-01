"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useProductBoxSales } from "@/hooks/use-product-box-sales"

interface DashboardSalesData {
  totalRevenueLast30Days: number
  totalSalesLast30Days: number
  averageOrderValue: number
  loading: boolean
  error: string | null
}

export function useDashboardSalesFallback(): DashboardSalesData {
  const { user } = useAuth()
  const { data: productBoxData, loading: productBoxLoading } = useProductBoxSales()

  const [data, setData] = useState<DashboardSalesData>({
    totalRevenueLast30Days: 0,
    totalSalesLast30Days: 0,
    averageOrderValue: 0,
    loading: true,
    error: null,
  })

  useEffect(() => {
    if (!user?.uid) {
      setData({
        totalRevenueLast30Days: 0,
        totalSalesLast30Days: 0,
        averageOrderValue: 0,
        loading: false,
        error: null,
      })
      return
    }

    if (!productBoxLoading && productBoxData) {
      // Use product box sales data as fallback
      setData({
        totalRevenueLast30Days: productBoxData.last30DaysRevenue || 0,
        totalSalesLast30Days: productBoxData.last30DaysSales || 0,
        averageOrderValue:
          productBoxData.last30DaysSales > 0
            ? (productBoxData.last30DaysRevenue || 0) / productBoxData.last30DaysSales
            : 0,
        loading: false,
        error: null,
      })
    } else if (!productBoxLoading) {
      setData((prev) => ({ ...prev, loading: false }))
    }
  }, [user?.uid, productBoxData, productBoxLoading])

  return data
}
