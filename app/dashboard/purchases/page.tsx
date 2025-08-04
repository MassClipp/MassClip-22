"use client"

import { useEffect, useState } from "react"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, RefreshCw } from "lucide-react"
import Link from "next/link"
import PurchasesFullScreen from "@/components/purchases-full-screen"

interface Purchase {
  id: string
  bundleId?: string
  productBoxId?: string
  itemId: string
  amount: number
  currency: string
  status: string
  createdAt: any
  purchasedAt: any
  userEmail: string
  userName: string
  item?: {
    title: string
    description?: string
    thumbnailUrl?: string
  }
  creator?: {
    displayName?: string
    name?: string
    username?: string
  }
}

export default function PurchasesPage() {
  const { user, loading: authLoading } = useFirebaseAuth()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPurchases = async () => {
    if (!user?.uid) {
      setError("User not authenticated")
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      console.log("🔍 [Purchases Page] Fetching purchases for user:", user.uid)

      const response = await fetch(`/api/user/purchases?userId=${user.uid}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      })

      console.log("🔍 [Purchases Page] API response status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("❌ [Purchases Page] API error:", errorText)

        // Check if response is HTML (error page) instead of JSON
        if (errorText.includes("<!DOCTYPE") || errorText.includes("<html")) {
          throw new Error(
            `Server error (${response.status}): The API endpoint returned an HTML error page instead of JSON data.`,
          )
        }

        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const responseText = await response.text()
      console.log("🔍 [Purchases Page] Raw response:", responseText.substring(0, 200))

      if (!responseText.trim()) {
        throw new Error("Empty response from server")
      }

      let data
      try {
        data = JSON.parse(responseText)
      } catch (parseError) {
        console.error("❌ [Purchases Page] JSON parse error:", parseError)
        throw new Error("Invalid JSON response from server")
      }

      console.log("🔍 [Purchases Page] Parsed response:", data)

      if (data.success && Array.isArray(data.purchases)) {
        setPurchases(data.purchases)
        console.log(`✅ [Purchases Page] Loaded ${data.purchases.length} purchases`)
      } else {
        throw new Error(data.error || "Invalid response format")
      }
    } catch (err: any) {
      console.error("❌ [Purchases Page] Error fetching purchases:", err)
      setError(err.message || "Failed to load purchases")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!authLoading && user) {
      fetchPurchases()
    } else if (!authLoading && !user) {
      setError("Please log in to view your purchases")
      setLoading(false)
    }
  }, [user, authLoading])

  const formatAmount = (amount: number, currency = "usd") => {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency.toUpperCase(),
      }).format(amount / 100) // Convert from cents to dollars
    } catch {
      return `$${(amount / 100).toFixed(2)}`
    }
  }

  const formatDate = (dateField: any) => {
    if (!dateField) return "Unknown date"

    try {
      let date: Date

      if (dateField.toDate && typeof dateField.toDate === "function") {
        // Firestore Timestamp
        date = dateField.toDate()
      } else if (dateField.seconds) {
        // Firestore Timestamp object
        date = new Date(dateField.seconds * 1000)
      } else if (typeof dateField === "string") {
        date = new Date(dateField)
      } else if (dateField instanceof Date) {
        date = dateField
      } else {
        return "Invalid date"
      }

      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch (error) {
      console.warn("Date formatting error:", error)
      return "Invalid date"
    }
  }

  if (authLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading your purchases...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card className="border-red-200">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle className="text-red-900">Error Loading Purchases</CardTitle>
              <CardDescription className="text-red-700">{error}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-semibold text-red-800 mb-2">Debug Information:</h4>
                <div className="text-sm text-red-700 space-y-1">
                  <p>
                    <strong>User ID:</strong> {user?.uid || "Not available"}
                  </p>
                  <p>
                    <strong>Auth Loading:</strong> {authLoading.toString()}
                  </p>
                  <p>
                    <strong>Page Loading:</strong> {loading.toString()}
                  </p>
                  <p>
                    <strong>Error:</strong> {error}
                  </p>
                  <p>
                    <strong>Timestamp:</strong> {new Date().toISOString()}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={fetchPurchases} className="bg-red-600 hover:bg-red-700">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/dashboard">Back to Dashboard</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return <PurchasesFullScreen className="min-h-screen" purchases={purchases} />
}
