"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Search, RefreshCw } from "lucide-react"

interface Purchase {
  id: string
  collection: string
  type?: string
  itemId?: string
  productBoxId?: string
  status?: string
  stripeSessionId?: string
  createdAt?: string
  metadata?: any
}

export default function DebugUserPurchasesPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [loading, setLoading] = useState(false)

  const fetchUserPurchases = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "Please log in first",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)
      console.log("🔍 [Debug] Fetching purchases for user:", user.uid)

      const token = await user.getIdToken()
      const response = await fetch(`/api/debug/user-purchases/${user.uid}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || "Failed to fetch purchases")
      }

      const data = await response.json()
      console.log("✅ [Debug] Purchases data:", data)

      setPurchases(data.purchases || [])
      toast({
        title: "Purchases loaded",
        description: `Found ${data.totalPurchases} purchases`,
      })
    } catch (error) {
      console.error("❌ [Debug] Error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch purchases",
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
              <Search className="h-5 w-5" />
              Debug User Purchases
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Button onClick={fetchUserPurchases} disabled={loading || !user} className="bg-white text-black">
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Fetch My Purchases
              </Button>
              {user && (
                <div className="text-sm text-zinc-400">
                  User ID: <span className="font-mono text-zinc-300">{user.uid}</span>
                </div>
              )}
            </div>

            {purchases.length > 0 && (
              <div className="space-y-4">
                <div className="text-sm text-zinc-400">Found {purchases.length} purchases:</div>
                <div className="grid gap-4">
                  {purchases.map((purchase, index) => (
                    <Card key={`${purchase.collection}-${purchase.id}`} className="bg-zinc-800/50 border-zinc-700">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm text-zinc-300">{purchase.id}</span>
                              <Badge variant="outline" className="text-xs">
                                {purchase.collection}
                              </Badge>
                            </div>
                            <div className="text-xs text-zinc-500">Purchase #{index + 1}</div>
                          </div>
                          <Badge
                            className={
                              purchase.status === "completed"
                                ? "bg-green-500/20 text-green-400"
                                : purchase.status === "pending"
                                  ? "bg-yellow-500/20 text-yellow-400"
                                  : "bg-red-500/20 text-red-400"
                            }
                          >
                            {purchase.status || "unknown"}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-zinc-500">Type</div>
                            <div className="text-zinc-300">{purchase.type || "N/A"}</div>
                          </div>
                          <div>
                            <div className="text-zinc-500">Item ID</div>
                            <div className="text-zinc-300 font-mono text-xs">
                              {purchase.itemId || purchase.productBoxId || "N/A"}
                            </div>
                          </div>
                          <div>
                            <div className="text-zinc-500">Stripe Session</div>
                            <div className="text-zinc-300 font-mono text-xs">
                              {purchase.stripeSessionId ? purchase.stripeSessionId.substring(0, 20) + "..." : "N/A"}
                            </div>
                          </div>
                          <div>
                            <div className="text-zinc-500">Created</div>
                            <div className="text-zinc-300">
                              {purchase.createdAt ? new Date(purchase.createdAt).toLocaleDateString() : "N/A"}
                            </div>
                          </div>
                        </div>

                        {purchase.metadata && (
                          <div className="mt-3 p-2 bg-zinc-900/50 rounded text-xs">
                            <div className="text-zinc-500 mb-1">Metadata:</div>
                            <pre className="text-zinc-300 whitespace-pre-wrap">
                              {JSON.stringify(purchase.metadata, null, 2)}
                            </pre>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
