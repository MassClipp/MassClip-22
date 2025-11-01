"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, ShoppingCart, Eye, AlertTriangle, CheckCircle, Package, Database } from "lucide-react"

export default function DebugPurchaseAccessPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [productBoxId, setProductBoxId] = useState("bg76KcIQRG5QCaE0MUpJ")
  const [loading, setLoading] = useState(false)
  const [testPurchaseResult, setTestPurchaseResult] = useState<any>(null)
  const [accessTestResult, setAccessTestResult] = useState<any>(null)
  const [purchases, setPurchases] = useState<any[]>([])
  const [createBoxResult, setCreateBoxResult] = useState<any>(null)

  const createTestPurchase = async () => {
    if (!user || !productBoxId) {
      toast({
        title: "Error",
        description: "Please log in and enter a product box ID",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)
      console.log("🔍 [Debug] Creating test purchase for:", productBoxId)

      const token = await user.getIdToken()
      const response = await fetch("/api/debug/create-test-purchase", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productBoxId: productBoxId,
          price: 9.99,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || "Failed to create test purchase")
      }

      const data = await response.json()
      console.log("✅ [Debug] Test purchase created:", data)

      setTestPurchaseResult(data)
      toast({
        title: "Test purchase created",
        description: `Purchase ID: ${data.purchaseId}`,
      })
    } catch (error) {
      console.error("❌ [Debug] Error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create test purchase",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const createProductBox = async () => {
    if (!user || !productBoxId) {
      toast({
        title: "Error",
        description: "Please log in and enter a product box ID",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)
      console.log("🔍 [Debug] Creating product box:", productBoxId)

      const token = await user.getIdToken()
      const response = await fetch("/api/debug/create-product-box", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productBoxId: productBoxId,
          title: "Debug Product Box",
          description: "This product box was created for debugging purposes",
          price: 9.99,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || "Failed to create product box")
      }

      const data = await response.json()
      console.log("✅ [Debug] Product box created:", data)

      setCreateBoxResult(data)
      toast({
        title: data.message || "Product box created",
        description: `Product Box ID: ${data.productBoxId}`,
      })
    } catch (error) {
      console.error("❌ [Debug] Error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create product box",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const testAccess = async () => {
    if (!user || !productBoxId) {
      toast({
        title: "Error",
        description: "Please log in and enter a product box ID",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)
      console.log("🔍 [Debug] Testing access for:", productBoxId)

      const token = await user.getIdToken()
      const response = await fetch(`/api/product-box/${productBoxId}/content`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()
      console.log("🔍 [Debug] Access test result:", data)

      setAccessTestResult({
        status: response.status,
        success: response.ok,
        data: data,
      })

      if (response.ok) {
        toast({
          title: "Access granted",
          description: "Successfully accessed product box content",
        })
      } else {
        toast({
          title: "Access denied",
          description: data.error || "Failed to access content",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("❌ [Debug] Error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to test access",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchUserPurchases = async () => {
    if (!user) return

    try {
      setLoading(true)
      const token = await user.getIdToken()
      const response = await fetch(`/api/debug/user-purchases/${user.uid}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()
        setPurchases(data.purchases || [])
      }
    } catch (error) {
      console.error("Failed to fetch purchases:", error)
      toast({
        title: "Error",
        description: "Failed to fetch user purchases",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Debug Purchase Access
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Product Box ID Input */}
            <div className="space-y-2">
              <label className="text-sm text-zinc-400">Product Box ID</label>
              <Input
                value={productBoxId}
                onChange={(e) => setProductBoxId(e.target.value)}
                placeholder="Enter product box ID"
                className="bg-zinc-800 border-zinc-700 text-white"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4">
              <Button
                onClick={createProductBox}
                disabled={loading || !user || !productBoxId}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Package className="h-4 w-4 mr-2" />}
                Create Product Box
              </Button>

              <Button
                onClick={createTestPurchase}
                disabled={loading || !user || !productBoxId}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ShoppingCart className="h-4 w-4 mr-2" />
                )}
                Create Test Purchase
              </Button>

              <Button
                onClick={testAccess}
                disabled={loading || !user || !productBoxId}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Eye className="h-4 w-4 mr-2" />}
                Test Access
              </Button>

              <Button
                onClick={fetchUserPurchases}
                disabled={loading || !user}
                variant="outline"
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                <Database className="h-4 w-4 mr-2" />
                Fetch Purchases
              </Button>
            </div>

            {/* User Info */}
            {user && (
              <div className="p-4 bg-zinc-800/50 rounded-lg">
                <div className="text-sm text-zinc-400 mb-2">Current User:</div>
                <div className="font-mono text-xs text-zinc-300">{user.uid}</div>
                <div className="text-sm text-zinc-400">{user.email}</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Product Box Creation Result */}
        {createBoxResult && (
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Package className="h-5 w-5 text-purple-400" />
                Product Box Created
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-400">Product Box ID:</span>
                  <span className="font-mono text-sm text-zinc-300">{createBoxResult.productBoxId}</span>
                  <Badge className="bg-purple-500/20 text-purple-400">Created</Badge>
                </div>
                <div className="p-3 bg-zinc-800/50 rounded text-xs">
                  <pre className="text-zinc-300 whitespace-pre-wrap">
                    {JSON.stringify(createBoxResult.productBox, null, 2)}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Test Purchase Result */}
        {testPurchaseResult && (
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-400" />
                Test Purchase Created
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-400">Purchase ID:</span>
                  <span className="font-mono text-sm text-zinc-300">{testPurchaseResult.purchaseId}</span>
                  <Badge className="bg-green-500/20 text-green-400">Test Purchase</Badge>
                </div>
                <div className="p-3 bg-zinc-800/50 rounded text-xs">
                  <pre className="text-zinc-300 whitespace-pre-wrap">
                    {JSON.stringify(testPurchaseResult.data, null, 2)}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Access Test Result */}
        {accessTestResult && (
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                {accessTestResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-400" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                )}
                Access Test Result
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-400">Status:</span>
                  <Badge
                    className={
                      accessTestResult.success ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                    }
                  >
                    {accessTestResult.status} {accessTestResult.success ? "Success" : "Failed"}
                  </Badge>
                </div>
                <div className="p-3 bg-zinc-800/50 rounded text-xs">
                  <pre className="text-zinc-300 whitespace-pre-wrap">
                    {JSON.stringify(accessTestResult.data, null, 2)}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* User Purchases */}
        {purchases.length > 0 && (
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">User Purchases ({purchases.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {purchases.map((purchase, index) => (
                  <div key={purchase.id} className="p-3 bg-zinc-800/50 rounded">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-sm text-zinc-300">{purchase.id}</span>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="text-xs">
                          {purchase.type}
                        </Badge>
                        <Badge
                          className={
                            purchase.status === "completed"
                              ? "bg-green-500/20 text-green-400"
                              : "bg-yellow-500/20 text-yellow-400"
                          }
                        >
                          {purchase.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-xs text-zinc-400 space-y-1">
                      <div>Item ID: {purchase.itemId || purchase.productBoxId || "N/A"}</div>
                      <div>Collection: {purchase.collection}</div>
                      <div>Created: {purchase.createdAt ? new Date(purchase.createdAt).toLocaleString() : "N/A"}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
