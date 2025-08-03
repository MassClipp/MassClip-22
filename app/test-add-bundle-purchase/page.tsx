"use client"

import { useState } from "react"
import { useAuthContext } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle, XCircle, Package, ShoppingCart } from "lucide-react"
import Link from "next/link"

interface BundleInfo {
  id: string
  title: string
  description: string
  thumbnailUrl: string
  fileUrl: string
  fileSize: number
  fileType: string
  creatorId: string
  creatorName: string
  creatorUsername: string
  price?: number
  currency?: string
  isPublic: boolean
  tags: string[]
  category: string
  contentItems: string[]
}

export default function TestAddBundlePurchasePage() {
  const { user } = useAuthContext()
  const [bundleId, setBundleId] = useState("")
  const [bundleInfo, setBundleInfo] = useState<BundleInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchBundleInfo = async () => {
    if (!bundleId.trim()) {
      setError("Please enter a bundle ID")
      return
    }

    setLoading(true)
    setError(null)
    setBundleInfo(null)

    try {
      console.log("🔍 [Test] Fetching bundle info for:", bundleId)

      const response = await fetch(`/api/bundles/${bundleId}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Bundle not found (${response.status})`)
      }

      const data = await response.json()
      setBundleInfo(data)

      console.log("✅ [Test] Bundle info fetched:", {
        id: data.id,
        title: data.title,
        creator: data.creatorName,
        fileSize: data.fileSize,
        contentItems: data.contentItems?.length || 0,
      })
    } catch (err: any) {
      console.error("❌ [Test] Error fetching bundle:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const addToPurchases = async () => {
    if (!user) {
      setError("You must be logged in to add purchases")
      return
    }

    if (!bundleInfo) {
      setError("Please fetch bundle info first")
      return
    }

    setAdding(true)
    setResult(null)
    setError(null)

    try {
      console.log("🛒 [Test] Adding bundle to purchases:", {
        userId: user.uid,
        bundleId: bundleInfo.id,
        bundleTitle: bundleInfo.title,
        creatorId: bundleInfo.creatorId,
        creatorName: bundleInfo.creatorName,
      })

      const purchaseData = {
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
        amount: (bundleInfo.price || 9.99) * 100, // Convert to cents
        currency: bundleInfo.currency || "usd",
        sessionId: `test_${bundleInfo.id}_${Date.now()}`,
        environment: "test",
      }

      console.log("📦 [Test] Complete purchase data being sent:", purchaseData)

      const response = await fetch("/api/test/add-bundle-to-purchases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(purchaseData),
      })

      const data = await response.json()

      if (response.ok) {
        console.log("✅ [Test] Bundle added to purchases successfully:", data)
        setResult({
          success: true,
          message: "Bundle added to your purchases!",
          purchaseId: data.purchaseId,
          details: data.purchaseDetails,
        })
      } else {
        throw new Error(data.error || "Failed to add bundle to purchases")
      }
    } catch (err: any) {
      console.error("❌ [Test] Error adding to purchases:", err)
      setError(err.message)
    } finally {
      setAdding(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (!bytes) return "Unknown"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Test Bundle Purchase</h1>
        <p className="text-white/70">Add a bundle to your purchases to test the purchase flow</p>
      </div>

      {/* Bundle ID Input */}
      <Card className="bg-black/40 backdrop-blur-xl border-white/10 mb-6">
        <CardHeader>
          <CardTitle className="text-white">Enter Bundle ID</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={bundleId}
              onChange={(e) => setBundleId(e.target.value)}
              placeholder="Enter bundle ID (e.g., 0WTyJRyTgRjlHpn6xJfe)"
              className="bg-black/20 border-white/10 text-white"
              onKeyDown={(e) => e.key === "Enter" && fetchBundleInfo()}
            />
            <Button
              onClick={fetchBundleInfo}
              disabled={loading || !bundleId.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Fetch Bundle"}
            </Button>
          </div>

          {user && (
            <div className="text-sm text-white/60">
              <strong>Your UID:</strong> {user.uid}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert className="bg-red-500/10 border-red-500/20 mb-6">
          <XCircle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-200">{error}</AlertDescription>
        </Alert>
      )}

      {/* Bundle Information */}
      {bundleInfo && (
        <Card className="bg-black/40 backdrop-blur-xl border-white/10 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Package className="h-5 w-5" />
              Bundle Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Bundle Details */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-white">{bundleInfo.title}</h3>
                  <p className="text-white/70">{bundleInfo.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-white/60">Creator:</span>
                    <div className="text-white font-medium">{bundleInfo.creatorName}</div>
                    {bundleInfo.creatorUsername && <div className="text-white/50">@{bundleInfo.creatorUsername}</div>}
                  </div>
                  <div>
                    <span className="text-white/60">File Size:</span>
                    <div className="text-white">{formatFileSize(bundleInfo.fileSize)}</div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                    {bundleInfo.fileType || "Bundle"}
                  </Badge>
                  {bundleInfo.isPublic && (
                    <Badge className="bg-green-500/10 text-green-400 border-green-500/20">Public</Badge>
                  )}
                  {bundleInfo.category && (
                    <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20">
                      {bundleInfo.category}
                    </Badge>
                  )}
                </div>

                {bundleInfo.contentItems && bundleInfo.contentItems.length > 0 && (
                  <div className="text-sm">
                    <span className="text-white/60">Content Items:</span>
                    <span className="text-white ml-2">{bundleInfo.contentItems.length} files</span>
                  </div>
                )}
              </div>

              {/* Thumbnail */}
              {bundleInfo.thumbnailUrl && (
                <div>
                  <img
                    src={bundleInfo.thumbnailUrl || "/placeholder.svg"}
                    alt={bundleInfo.title}
                    className="w-full h-48 object-cover rounded-lg bg-white/5"
                  />
                </div>
              )}
            </div>

            {/* Add to Purchases Button */}
            <div className="mt-6 pt-6 border-t border-white/10">
              <Button
                onClick={addToPurchases}
                disabled={adding || !user}
                className="w-full bg-red-600 hover:bg-red-700"
                size="lg"
              >
                {adding ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Adding to Purchases...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-5 w-5 mr-2" />
                    Add to My Purchases
                  </>
                )}
              </Button>

              {!user && (
                <p className="text-center text-white/60 text-sm mt-2">You must be logged in to add purchases</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success Result */}
      {result && result.success && (
        <Card className="bg-black/40 backdrop-blur-xl border-white/10 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-400" />
              Success!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="bg-green-500/10 border-green-500/20 mb-4">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <AlertDescription className="text-green-200">{result.message}</AlertDescription>
            </Alert>

            <div className="flex gap-2 mb-4">
              <Button asChild className="bg-red-600 hover:bg-red-700">
                <Link href="/dashboard/purchases">
                  <Package className="h-4 w-4 mr-2" />
                  View My Purchases
                </Link>
              </Button>
            </div>

            {/* Logged Purchase Details */}
            <details className="mt-4">
              <summary className="text-white/80 cursor-pointer font-medium">
                📋 Purchase Details (for implementation)
              </summary>
              <div className="mt-2 p-4 bg-black/20 rounded-lg">
                <pre className="text-xs text-white/70 overflow-auto whitespace-pre-wrap">
                  {JSON.stringify(result.details, null, 2)}
                </pre>
              </div>
            </details>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card className="bg-black/40 backdrop-blur-xl border-white/10">
        <CardHeader>
          <CardTitle className="text-white text-sm">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm" className="bg-transparent border-white/10 text-white/80">
              <Link href="/dashboard/purchases">My Purchases</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="bg-transparent border-white/10 text-white/80">
              <Link href="/dashboard/bundles">Browse Bundles</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
