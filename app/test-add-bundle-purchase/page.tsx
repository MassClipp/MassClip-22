"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { UserIcon, Package, ShoppingCart, ExternalLink, AlertCircle, CheckCircle, Copy } from "lucide-react"
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
  fileSize?: string
  fileSizeBytes?: number
  fileType?: string
  tags?: string[]
  isPublic?: boolean
  contentItems?: number
  price?: number
  currency?: string
  quality?: string
  views?: number
  downloads?: number
  createdAt?: string
  downloadUrl?: string
  _raw?: any
}

export default function TestAddBundlePurchase() {
  const { user, loading: authLoading } = useFirebaseAuth()
  const [userId, setUserId] = useState("")
  const [bundleId, setBundleId] = useState("0WTyJRYTgRJIHpn6xJfe")
  const [bundleInfo, setBundleInfo] = useState<BundleInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [fetchingBundle, setFetchingBundle] = useState(false)

  // Auto-fill user ID when user logs in
  useEffect(() => {
    if (user && !userId) {
      setUserId(user.uid)
    }
  }, [user, userId])

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
        throw new Error(data.error || data.details || "Failed to fetch bundle information")
      }

      console.log("✅ [Test] Bundle info fetched:", data)
      setBundleInfo(data)
    } catch (err: any) {
      console.error("❌ [Test] Error fetching bundle:", err)
      setError(err.message || "Failed to fetch bundle information")
    } finally {
      setFetchingBundle(false)
    }
  }

  const addToUserPurchases = async () => {
    if (!userId.trim()) {
      setError("Please enter a user ID")
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
      console.log("🛒 [Test] Adding bundle to user purchases:", {
        userId,
        bundleId: bundleInfo.id,
        creatorId: bundleInfo.creatorId,
      })

      const purchaseData = {
        userId: userId,
        userEmail: user?.email || `user-${userId}@example.com`,
        userName: user?.displayName || `User ${userId.slice(-6)}`,
        bundleId: bundleInfo.id,
        bundleTitle: bundleInfo.title,
        bundleDescription: bundleInfo.description,
        bundleThumbnail: bundleInfo.thumbnailUrl,
        creatorId: bundleInfo.creatorId,
        creatorName: bundleInfo.creatorName,
        creatorUsername: bundleInfo.creatorUsername,
        amount: Math.round((bundleInfo.price || 0) * 100), // Convert to cents
        currency: bundleInfo.currency || "usd",
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

      setSuccess(
        `Bundle "${bundleInfo.title}" added to user ${userId}'s purchases successfully! Purchase ID: ${result.purchaseId}`,
      )

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

  const copyUserId = () => {
    if (user?.uid) {
      navigator.clipboard.writeText(user.uid)
    }
  }

  const copyBundleId = () => {
    navigator.clipboard.writeText(bundleId)
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
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        <div className="text-center">
          <Package className="mx-auto h-12 w-12 text-primary mb-4" />
          <h1 className="text-3xl font-bold">Enter Bundle ID</h1>
          <p className="text-muted-foreground mt-2">
            Enter the bundle ID to fetch information and add to your purchases
          </p>
        </div>

        {/* Current User Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="h-5 w-5" />
              Current User (Optional)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {user ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <p>
                    <strong>UID:</strong> {user.uid}
                  </p>
                  <Button variant="outline" size="sm" onClick={copyUserId}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
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
                  Not logged in. You can still test by entering any user ID manually below.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* User ID Input */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="h-5 w-5" />
              Target User ID
            </CardTitle>
            <CardDescription>Enter the user ID who should receive the bundle purchase</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Enter user ID (e.g., abc123def456)"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="flex-1"
              />
              {user && (
                <Button variant="outline" onClick={() => setUserId(user.uid)}>
                  Use My ID
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Bundle ID Input */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Bundle ID
            </CardTitle>
            <CardDescription>Enter the bundle ID to fetch information and add to user's purchases</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Enter bundle ID (e.g., 0WTyJRyTgRjlHpn6xJfe)"
                value={bundleId}
                onChange={(e) => setBundleId(e.target.value)}
                className="flex-1"
              />
              <Button variant="outline" onClick={copyBundleId}>
                <Copy className="h-3 w-3" />
              </Button>
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
                    <p className="text-muted-foreground mt-1">{bundleInfo.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-muted-foreground">Creator:</p>
                      <p>{bundleInfo.creatorName || "Unknown"}</p>
                      <p className="text-muted-foreground">@{bundleInfo.creatorUsername || "unknown"}</p>
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground">File Size:</p>
                      <p>{bundleInfo.fileSize || "Unknown"}</p>
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground">Price:</p>
                      <p>${bundleInfo.price?.toFixed(2) || "0.00"}</p>
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground">Quality:</p>
                      <p>{bundleInfo.quality || "Standard"}</p>
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

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-muted-foreground">Views:</p>
                      <p>{bundleInfo.views?.toLocaleString() || 0}</p>
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground">Downloads:</p>
                      <p>{bundleInfo.downloads?.toLocaleString() || 0}</p>
                    </div>
                  </div>
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
        {bundleInfo && userId && (
          <Card>
            <CardContent className="pt-6">
              <Button
                onClick={addToUserPurchases}
                disabled={loading}
                className="w-full bg-red-600 hover:bg-red-700 text-white"
                size="lg"
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                {loading ? "Adding to Purchases..." : `Add Bundle to User ${userId.slice(-6)}'s Purchases`}
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

        {/* Debug Information */}
        {bundleInfo && (
          <Card>
            <CardHeader>
              <CardTitle>Debug Information</CardTitle>
            </CardHeader>
            <CardContent>
              <details className="space-y-2">
                <summary className="cursor-pointer font-medium">Raw Bundle Data (Click to expand)</summary>
                <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto max-h-96">
                  {JSON.stringify(bundleInfo._raw, null, 2)}
                </pre>
              </details>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
