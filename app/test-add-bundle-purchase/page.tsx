"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { AlertCircle, CheckCircle, Package, User, DollarSign, ExternalLink } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import Link from "next/link"

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
  const { user } = useFirebaseAuth()
  const [bundleId, setBundleId] = useState("")
  const [bundleInfo, setBundleInfo] = useState<BundleInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [purchaseDetails, setPurchaseDetails] = useState<any>(null)

  const fetchBundleInfo = async () => {
    if (!bundleId.trim()) {
      setError("Please enter a bundle ID")
      return
    }

    setLoading(true)
    setError("")
    setBundleInfo(null)

    try {
      console.log("🔍 [Test] Fetching bundle info for:", bundleId)

      const response = await fetch(`/api/bundles/${bundleId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch bundle info")
      }

      console.log("✅ [Test] Bundle info fetched:", data.bundle)
      setBundleInfo(data.bundle)
    } catch (err: any) {
      console.error("❌ [Test] Error fetching bundle:", err)
      setError(err.message || "Failed to fetch bundle information")
    } finally {
      setLoading(false)
    }
  }

  const addToPurchases = async () => {
    if (!bundleInfo || !user) {
      setError("Bundle info or user not available")
      return
    }

    setAdding(true)
    setError("")
    setSuccess("")
    setPurchaseDetails(null)

    try {
      console.log("🛒 [Test] Adding bundle to purchases:", {
        userId: user.uid,
        bundleId: bundleInfo.id,
        creatorId: bundleInfo.creatorId,
      })

      const response = await fetch("/api/test/add-bundle-to-purchases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.uid,
          userEmail: user.email,
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
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.details || data.error || "Failed to add bundle to purchases")
      }

      console.log("✅ [Test] Bundle added to purchases successfully:", data)
      console.log("📊 [Test] Purchase details for implementation:", data.purchaseDetails)

      setSuccess("Bundle added to purchases successfully!")
      setPurchaseDetails(data.purchaseDetails)
    } catch (err: any) {
      console.error("❌ [Test] Error adding to purchases:", err)
      setError(err.message || "Failed to add bundle to purchases")
    } finally {
      setAdding(false)
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "Unknown"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Test Bundle Purchase</h1>
          <p className="text-gray-600">
            Add a bundle to your purchases to test the purchase flow and log implementation details
          </p>
        </div>

        {/* User Info */}
        {user && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Current User
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p>
                  <strong>UID:</strong> {user.uid}
                </p>
                <p>
                  <strong>Email:</strong> {user.email}
                </p>
                <p>
                  <strong>Name:</strong> {user.displayName || "Not set"}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bundle Input */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Enter Bundle ID
            </CardTitle>
            <CardDescription>Enter the bundle ID to fetch information and add to your purchases</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter Bundle ID (e.g., 0WTyJRyTgRjlHpn6xJfe)"
                value={bundleId}
                onChange={(e) => setBundleId(e.target.value)}
                className="flex-1"
              />
              <Button onClick={fetchBundleInfo} disabled={loading || !bundleId.trim()}>
                {loading ? "Fetching..." : "Fetch Bundle"}
              </Button>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">{success}</AlertDescription>
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
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Bundle Details */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold">{bundleInfo.title}</h3>
                    <p className="text-gray-600 mt-1">{bundleInfo.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-gray-700">Creator:</p>
                      <p>{bundleInfo.creatorName}</p>
                      <p className="text-gray-500">@{bundleInfo.creatorUsername}</p>
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
                      {bundleInfo.isPublic && (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Public
                        </Badge>
                      )}
                    </div>
                  )}

                  {bundleInfo.contentItems && (
                    <div>
                      <p className="font-medium text-gray-700">Content Items:</p>
                      <p>{bundleInfo.contentItems} files</p>
                    </div>
                  )}
                </div>

                {/* Thumbnail */}
                {bundleInfo.thumbnailUrl && (
                  <div className="flex justify-center">
                    <img
                      src={bundleInfo.thumbnailUrl || "/placeholder.svg"}
                      alt={bundleInfo.title}
                      className="max-w-full h-auto rounded-lg shadow-md max-h-64 object-cover"
                    />
                  </div>
                )}
              </div>

              <Separator />

              {/* Add to Purchases Button */}
              <div className="flex justify-center">
                <Button
                  onClick={addToPurchases}
                  disabled={adding || !user}
                  size="lg"
                  className="bg-red-600 hover:bg-red-700 text-white px-8"
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  {adding ? "Adding to Purchases..." : "Add to My Purchases"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Purchase Details */}
        {purchaseDetails && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Purchase Details (For Implementation)
              </CardTitle>
              <CardDescription>This data structure should be used in the real checkout flow</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <pre className="text-sm overflow-x-auto">{JSON.stringify(purchaseDetails, null, 2)}</pre>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Implementation Steps:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>In Stripe webhook, extract session data</li>
                    <li>Get bundle and creator information from database</li>
                    <li>Call UnifiedPurchaseService.createUnifiedPurchase()</li>
                    <li>Send confirmation email to buyer</li>
                  </ol>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Required Fields:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>userId</li>
                    <li>bundleId</li>
                    <li>creatorId</li>
                    <li>sessionId</li>
                    <li>amount</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Link href="/dashboard/purchases">
                <Button variant="outline" className="flex items-center gap-2 bg-transparent">
                  <ExternalLink className="h-4 w-4" />
                  My Purchases
                </Button>
              </Link>
              <Link href="/dashboard/bundles">
                <Button variant="outline" className="flex items-center gap-2 bg-transparent">
                  <Package className="h-4 w-4" />
                  Browse Bundles
                </Button>
              </Link>
              <Link href="/api/debug/check-bundle-purchases">
                <Button variant="outline" className="flex items-center gap-2 bg-transparent">
                  <AlertCircle className="h-4 w-4" />
                  Debug API
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
