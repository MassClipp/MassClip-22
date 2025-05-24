"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { collection, query, orderBy, getDocs, limit } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Loader2, DollarSign, TrendingUp, Calendar, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { format } from "date-fns"

export default function EarningsPage() {
  const { user } = useAuth()
  const [sales, setSales] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalEarnings: 0,
    totalSales: 0,
    recentSales: 0,
  })

  useEffect(() => {
    const fetchSales = async () => {
      if (!user) return

      try {
        setLoading(true)

        // Get sales from Firestore
        const salesQuery = query(collection(db, "users", user.uid, "sales"), orderBy("purchasedAt", "desc"), limit(50))

        const salesSnapshot = await getDocs(salesQuery)
        const salesData = salesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          purchasedAt: doc.data().purchasedAt?.toDate() || new Date(),
        }))

        setSales(salesData)

        // Calculate stats
        const totalEarnings = salesData.reduce((sum, sale) => sum + (sale.netAmount || 0), 0)
        const totalSales = salesData.length

        // Recent sales (last 30 days)
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        const recentSales = salesData.filter((sale) => sale.purchasedAt >= thirtyDaysAgo).length

        setStats({
          totalEarnings,
          totalSales,
          recentSales,
        })
      } catch (error) {
        console.error("Error fetching sales:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchSales()
  }, [user])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 text-zinc-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8">Earnings Dashboard</h1>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Earnings</CardDescription>
            <CardTitle className="text-2xl flex items-center">
              <DollarSign className="h-5 w-5 text-green-500 mr-1" />${stats.totalEarnings.toFixed(2)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-500">After platform fees</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Sales</CardDescription>
            <CardTitle className="text-2xl flex items-center">
              <TrendingUp className="h-5 w-5 text-blue-500 mr-1" />
              {stats.totalSales}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-500">Lifetime purchases</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Recent Sales</CardDescription>
            <CardTitle className="text-2xl flex items-center">
              <Calendar className="h-5 w-5 text-purple-500 mr-1" />
              {stats.recentSales}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-500">Last 30 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Sales table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Your most recent sales</CardDescription>
        </CardHeader>
        <CardContent>
          {sales.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-zinc-500 mb-4">No sales yet</p>
              <Button variant="outline" onClick={() => (window.location.href = "/dashboard/profile")}>
                Set up premium content
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800">
                    <th className="text-left py-3 px-4 font-medium">Date</th>
                    <th className="text-left py-3 px-4 font-medium">Video</th>
                    <th className="text-left py-3 px-4 font-medium">Amount</th>
                    <th className="text-left py-3 px-4 font-medium">Fee</th>
                    <th className="text-left py-3 px-4 font-medium">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale) => (
                    <tr key={sale.id} className="border-b border-zinc-200 dark:border-zinc-800">
                      <td className="py-3 px-4">{format(sale.purchasedAt, "MMM d, yyyy")}</td>
                      <td className="py-3 px-4">{sale.videoTitle || "Premium Content"}</td>
                      <td className="py-3 px-4">${sale.amount?.toFixed(2) || "0.00"}</td>
                      <td className="py-3 px-4 text-zinc-500">-${sale.platformFee?.toFixed(2) || "0.00"}</td>
                      <td className="py-3 px-4 font-medium text-green-500">${sale.netAmount?.toFixed(2) || "0.00"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
