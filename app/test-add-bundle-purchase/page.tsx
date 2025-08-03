"use client"

import { useState } from "react"
import { useAuthContext } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Loader2, Plus, CheckCircle, XCircle, AlertTriangle, Package, User } from "lucide-react"
import Link from "next/link"

interface TestPurchaseResult {
  success: boolean
  message: string
  purchaseId?: string
  details?: any
  error?: string
}

export default function TestAddBundlePurchasePage() {
  const { user } = useAuthContext()
  const [formData, setFormData] = useState({
    userId: user?.uid || "",
    bundleId: "",
    amount: "9.99",
    currency: "usd",
    creatorId: "",
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<TestPurchaseResult | null>(null)
  const [bundleInfo, setBundleInfo] = useState<any>(null)
  const [loadingBundle, setLoadingBundle] = useState(false)

  // Auto-fill user ID when user changes
  useState(() => {
    if (user?.uid && !formData.userId) {
      setFormData((prev) => ({ ...prev, userId: user.uid }))
    }
  })

  const fetchBundleInfo = async () => {
    if (!formData.bundleId) return

    setLoadingBundle(true)
    setBundleInfo(null)

    try {
      const response = await fetch(`/api/bundles/${formData.bundleId}`)
      if (response.ok) {
        const data = await response.json()
        setBundleInfo(data)

        // Auto-fill creator ID if found
        if (data.creatorId && !formData.creatorId) {
          setFormData((prev) => ({ ...prev, creatorId: data.creatorId }))
        }
      } else {
        setBundleInfo({ error: "Bundle not found" })
      }
    } catch (error) {
      setBundleInfo({ error: "Failed to fetch bundle info" })
    } finally {
      setLoadingBundle(false)
    }
  }

  const createTestPurchase = async () => {
    if (!formData.userId || !formData.bundleId) {
      setResult({
        success: false,
        message: "User ID and Bundle ID are required",
        error: "MISSING_FIELDS",
      })
      return
    }

    setLoading(true)
    setResult(null)

    try {
      console.log("🧪 [Test Purchase] Creating test bundle purchase:", formData)

      const response = await fetch("/api/test/create-bundle-purchase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: formData.userId,
          bundleId: formData.bundleId,
          amount: Number.parseFloat(formData.amount) * 100, // Convert to cents
          currency: formData.currency,
          creatorId: formData.creatorId,
          sessionId: `test_session_${Date.now()}`,
          environment: "test",
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setResult({
          success: true,
          message: "Test purchase created successfully!",
          purchaseId: data.purchaseId,
          details: data,
        })
      } else {
        setResult({
          success: false,
          message: data.error || "Failed to create test purchase",
          error: data.code || "UNKNOWN_ERROR",
          details: data,
        })
      }
    } catch (error: any) {
      console.error("❌ [Test Purchase] Error:", error)
      setResult({
        success: false,
        message: error.message || "Network error occurred",
        error: "NETWORK_ERROR",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))

    // Auto-fetch bundle info when bundle ID changes
    if (field === "bundleId" && value.length > 10) {
      fetchBundleInfo()
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Test Bundle Purchase</h1>
        <p className="text-white/70">Manually add a bundle to your purchases to test the purchase flow</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Form */}
        <Card className="bg-black/40 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create Test Purchase
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* User ID */}
            <div>
              <Label htmlFor="userId" className="text-white/80">
                User ID (Firebase UID)
              </Label>
              <Input
                id="userId"
                value={formData.userId}
                onChange={(e) => handleInputChange("userId", e.target.value)}
                placeholder="Enter Firebase user ID"
                className="bg-black/20 border-white/10 text-white"
              />
              {user && <p className="text-xs text-white/60 mt-1">Current user: {user.email}</p>}
            </div>

            {/* Bundle ID */}
            <div>
              <Label htmlFor="bundleId" className="text-white/80">
                Bundle ID
              </Label>
              <div className="flex gap-2">
                <Input
                  id="bundleId"
                  value={formData.bundleId}
                  onChange={(e) => handleInputChange("bundleId", e.target.value)}
                  placeholder="Enter bundle ID"
                  className="bg-black/20 border-white/10 text-white"
                />
                <Button
                  onClick={fetchBundleInfo}
                  disabled={!formData.bundleId || loadingBundle}
                  variant="outline"
                  size="sm"
                  className="bg-transparent border-white/10 text-white/80"
                >
                  {loadingBundle ? <Loader2 className="h-4 w-4 animate-spin" /> : "Fetch"}
                </Button>
              </div>
            </div>

            {/* Creator ID */}
            <div>
              <Label htmlFor="creatorId" className="text-white/80">
                Creator ID
              </Label>
              <Input
                id="creatorId"
                value={formData.creatorId}
                onChange={(e) => handleInputChange("creatorId", e.target.value)}
                placeholder="Enter creator ID"
                className="bg-black/20 border-white/10 text-white"
              />
            </div>

            {/* Amount */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="amount" className="text-white/80">
                  Amount
                </Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => handleInputChange("amount", e.target.value)}
                  placeholder="9.99"
                  className="bg-black/20 border-white/10 text-white"
                />
              </div>
              <div>
                <Label htmlFor="currency" className="text-white/80">
                  Currency
                </Label>
                <Input
                  id="currency"
                  value={formData.currency}
                  onChange={(e) => handleInputChange("currency", e.target.value)}
                  placeholder="usd"
                  className="bg-black/20 border-white/10 text-white"
                />
              </div>
            </div>

            {/* Submit Button */}
            <Button
              onClick={createTestPurchase}
              disabled={loading || !formData.userId || !formData.bundleId}
              className="w-full bg-red-600 hover:bg-red-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Purchase...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Test Purchase
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Bundle Info */}
        {bundleInfo && (
          <Card className="bg-black/40 backdrop-blur-xl border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Package className="h-5 w-5" />
                Bundle Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              {bundleInfo.error ? (
                <Alert className="bg-red-500/10 border-red-500/20">
                  <XCircle className="h-4 w-4 text-red-400" />
                  <AlertDescription className="text-red-200">{bundleInfo.error}</AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-3">
                  <div>
                    <h3 className="text-white font-medium">{bundleInfo.title}</h3>
                    <p className="text-white/60 text-sm">{bundleInfo.description}</p>
                  </div>

                  {bundleInfo.thumbnailUrl && (
                    <img
                      src={bundleInfo.thumbnailUrl || "/placeholder.svg"}
                      alt={bundleInfo.title}
                      className="w-full h-32 object-cover rounded-lg bg-white/5"
                    />
                  )}

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-white/60">Creator:</span>
                      <div className="text-white">{bundleInfo.creatorName || "Unknown"}</div>
                    </div>
                    <div>
                      <span className="text-white/60">File Size:</span>
                      <div className="text-white">
                        {bundleInfo.fileSize ? `${Math.round(bundleInfo.fileSize / 1024 / 1024)} MB` : "Unknown"}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                      {bundleInfo.fileType || "Bundle"}
                    </Badge>
                    {bundleInfo.isPublic && (
                      <Badge className="bg-green-500/10 text-green-400 border-green-500/20">Public</Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Result */}
      {result && (
        <Card className="bg-black/40 backdrop-blur-xl border-white/10 mt-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-400" />
              ) : (
                <XCircle className="h-5 w-5 text-red-400" />
              )}
              Test Result
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert
              className={result.success ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20"}
            >
              {result.success ? (
                <CheckCircle className="h-4 w-4 text-green-400" />
              ) : (
                <XCircle className="h-4 w-4 text-red-400" />
              )}
              <AlertDescription className={result.success ? "text-green-200" : "text-red-200"}>
                <strong>{result.success ? "Success!" : "Error:"}</strong> {result.message}
                {result.purchaseId && (
                  <div className="mt-2">
                    <strong>Purchase ID:</strong> {result.purchaseId}
                  </div>
                )}
              </AlertDescription>
            </Alert>

            {result.success && (
              <div className="mt-4 flex gap-2">
                <Button asChild className="bg-red-600 hover:bg-red-700">
                  <Link href="/dashboard/purchases">
                    <Package className="h-4 w-4 mr-2" />
                    View My Purchases
                  </Link>
                </Button>
                <Button asChild variant="outline" className="bg-transparent border-white/10 text-white/80">
                  <Link href={`/bundles/${formData.bundleId}`}>
                    <Package className="h-4 w-4 mr-2" />
                    View Bundle
                  </Link>
                </Button>
              </div>
            )}

            {result.details && (
              <details className="mt-4">
                <summary className="text-white/80 cursor-pointer">View Details</summary>
                <pre className="text-xs text-white/60 overflow-auto bg-black/20 p-4 rounded mt-2">
                  {JSON.stringify(result.details, null, 2)}
                </pre>
              </details>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card className="bg-black/40 backdrop-blur-xl border-white/10 mt-6">
        <CardHeader>
          <CardTitle className="text-white text-sm">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm" className="bg-transparent border-white/10 text-white/80">
              <Link href="/dashboard/purchases">
                <Package className="h-4 w-4 mr-2" />
                My Purchases
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="bg-transparent border-white/10 text-white/80">
              <Link href="/dashboard/bundles">
                <Package className="h-4 w-4 mr-2" />
                Browse Bundles
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="bg-transparent border-white/10 text-white/80">
              <Link href="/debug-purchases-api">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Debug API
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current User Info */}
      {user && (
        <Card className="bg-black/40 backdrop-blur-xl border-white/10 mt-6">
          <CardHeader>
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <User className="h-4 w-4" />
              Current User
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-white/70 space-y-1">
              <div>
                <strong>UID:</strong> {user.uid}
              </div>
              <div>
                <strong>Email:</strong> {user.email}
              </div>
              <div>
                <strong>Display Name:</strong> {user.displayName || "Not set"}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
