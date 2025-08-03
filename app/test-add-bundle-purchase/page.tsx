"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { User, Package, ShoppingCart, ExternalLink, AlertCircle, CheckCircle } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

interface BundleInfo {
  id: string
  title: string
  description: string
  thumbnailUrl?: string
  creatorId: string
  creatorName: string
  creatorUsername: string
  fileSize?: number
  fileType?: string
  tags?: string[]
  isPublic?: boolean
  contentItems?: number
}

export default function TestAddBundlePurchase() {
  const { user, loading: authLoading } = useFirebaseAuth()
  const [bundleId, setBundleId] = useState("")
  const [bundleInfo, setBundleInfo] = useState<BundleInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [fetchingBundle, setFetchingBundle] = useState(false)

  // Auto-fill bundle ID for testing
  useEffect(() => {
    if (!bundleId) {
      setBundleId("0WTyJRyTgRjlHpn6xJfe")
    }
  }, [bundleId])

  const fetchBundleInfo = async () => {
    if (!bundleId.trim()) {
      setError("Please enter a bundle ID")
      return
    }

    setFetchingBundle(true)
    setError("")
    setBundleInfo(null)

    try {
      console.log("🔍 [Test] Fetching bundle info for:", bundleId)

      const response = await fetch(`/api/bundles/${bundleId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch bundle information")
      }

      console.log("✅ [Test] Bundle info fetched:", data.bundle)
      setBundleInfo(data.bundle)
    } catch (err: any) {
      console.error("❌ [Test] Error fetching bundle:", err)
      setError(err.message || "Failed to fetch bundle information")
    } finally {
      setFetchingBundle(false)
    }
  }

  const addToMyPurchases = async () => {
    if (!user) {
      setError("You must be logged in to add purchases")
      return
    }

    if (!bundleInfo) {
      setError("Please fetch bundle information first")
      return
    }

    setLoading(true)
    setError("")
    setSuccess("")

    try {
      console.log("🛒 [Test] Adding bundle to purchases:", {
        userId: user.uid,
        bundleId: bundleInfo.id,
        creatorId: bundleInfo.creatorId,
      })

      const purchaseData = {
        userId: user.uid,
        userEmail: user.email || "",
        userName: user.displayName || user.email?.split("@")[0] || "User",
        bundleId: bundleInfo.id,
        bundleTitle: bundleInfo.title,
        bundleDescription: bundleInfo.description,
        bundleThumbnail: bundleInfo.thumbnailUrl,
        creatorId: bundleInfo.creatorId,
        creatorName: bundleInfo.creatorName,
        creatorUsername: bundleInfo.creatorUsername,
        amount: 999, // $9.99 in cents
        currency: "usd",
        sessionId: `test_${bundleInfo.id}_${Date.now()}`,
        environment: "test",
      }

      console.log("📋 [Test] Complete purchase data being sent:", purchaseData)

      const response = await fetch("/api/test/add-bundle-to-purchases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(purchaseData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.details || result.error || "Failed to add bundle to purchases")
      }

      console.log("✅ [Test] Bundle added to purchases successfully:", result)
      console.log("📊 [Test] Purchase details for implementation:", result.purchaseDetails)
      console.log("📋 [Test] Implementation guide:", result.implementationGuide)

      setSuccess(`Bundle "${bundleInfo.title}" added to your purchases successfully!`)

      // Log the complete data structure for implementation
      console.log("🔧 [IMPLEMENTATION DATA] Use this structure in your Stripe webhook:")
      console.log("=".repeat(80))
      console.log(JSON.stringify(result.purchaseDetails, null, 2))
      console.log("=".repeat(80))
    } catch (err: any) {
      console.error("❌ [Test] Error adding bundle to purchases:", err)
      setError(err.message || "Failed to add bundle to purchases")
    } finally {
      setLoading(false)
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "Unknown"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Test Bundle Purchase</h1>
          <p className="text-gray-600">
            Add a bundle to your purchases to test the purchase flow and log implementation details
          </p>
        </div>

        {/* Current User Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Current User
            </CardTitle>
          </CardHeader>
          <CardContent>
            {user ? (
              <div className="space-y-2">
                <p>
                  <strong>UID:</strong> {user.uid}
                </p>
                <p>
                  <strong>Email:</strong> {user.email || "Not provided"}
                </p>
                <p>
                  <strong>Name:</strong> {user.displayName || user.email?.split("@")[0] || "User"}
                </p>
              </div>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  You must be logged in to test bundle purchases. Please log in first.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Bundle ID Input */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Enter Bundle ID
            </CardTitle>
            <CardDescription>Enter the bundle ID to fetch information and add to your purchases</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Enter bundle ID (e.g., 0WTyJRyTgRjlHpn6xJfe)"
                value={bundleId}
                onChange={(e) => setBundleId(e.target.value)}
                className="flex-1"
              />
              <Button onClick={fetchBundleInfo} disabled={fetchingBundle || !bundleId.trim()} variant="outline">
                {fetchingBundle ? "Fetching..." : "Fetch Bundle"}
              </Button>
            </div>

            {error && (
              <Alert className="mt-4" variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Bundle Information */}
        {bundleInfo && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Bundle Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold">{bundleInfo.title}</h3>
                    <p className="text-gray-600 mt-1">{bundleInfo.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-gray-700">Creator:</p>
                      <p>{bundleInfo.creatorName || "Unknown"}</p>
                      <p className="text-gray-500">@{bundleInfo.creatorUsername || "unknown"}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">File Size:</p>
                      <p>{formatFileSize(bundleInfo.fileSize)}</p>
                    </div>
                  </div>

                  {bundleInfo.tags && bundleInfo.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {bundleInfo.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {bundleInfo.contentItems && (
                    <p className="text-sm text-gray-600">
                      <strong>Content Items:</strong> {bundleInfo.contentItems} files
                    </p>
                  )}
                </div>

                {bundleInfo.thumbnailUrl && (
                  <div className="flex justify-center">
                    <div className="relative w-48 h-32 bg-gray-100 rounded-lg overflow-hidden">
                      <Image
                        src={bundleInfo.thumbnailUrl || "/placeholder.svg"}
                        alt={bundleInfo.title}
                        fill
                        className="object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = "none"
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Add to Purchases Button */}
        {bundleInfo && user && (
          <Card>
            <CardContent className="pt-6">
              <Button
                onClick={addToMyPurchases}
                disabled={loading}
                className="w-full bg-red-600 hover:bg-red-700 text-white"
                size="lg"
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                {loading ? "Adding to Purchases..." : "Add to My Purchases"}
              </Button>

              {success && (
                <Alert className="mt-4" variant="default">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button variant="outline" asChild>
                <Link href="/dashboard/purchases" className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  My Purchases
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/dashboard/bundles" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Browse Bundles
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/api/test/add-bundle-to-purchases" target="_blank" className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Debug API
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
