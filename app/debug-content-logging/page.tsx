"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { Search, Package, User, FileText, Calendar, CheckCircle, XCircle } from "lucide-react"

export default function DebugContentLoggingPage() {
  const [productBoxId, setProductBoxId] = useState("")
  const [userId, setUserId] = useState("")
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const checkContentLogging = async () => {
    if (!productBoxId && !userId) {
      toast({
        title: "Input Required",
        description: "Please provide either a Product Box ID or User ID",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (productBoxId) params.append("productBoxId", productBoxId)
      if (userId) params.append("userId", userId)

      const response = await fetch(`/api/debug/content-logging?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to check content logging")
      }

      setResults(data.results)
      toast({
        title: "Content Logging Check Complete",
        description: "Results loaded successfully",
      })
    } catch (error) {
      console.error("Error checking content logging:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to check content logging",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const StatusBadge = ({ status }: { status: boolean }) => (
    <Badge className={status ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}>
      {status ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
      {status ? "Found" : "Not Found"}
    </Badge>
  )

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Content Logging Debug</h1>
          <p className="text-zinc-400">Verify content logging and purchase data in Firestore</p>
        </div>

        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Search className="h-5 w-5" />
              Debug Parameters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Product Box ID</label>
                <Input
                  value={productBoxId}
                  onChange={(e) => setProductBoxId(e.target.value)}
                  placeholder="Enter product box ID..."
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">User ID</label>
                <Input
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="Enter user ID..."
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
            </div>
            <Button
              onClick={checkContentLogging}
              disabled={loading}
              className="w-full bg-white text-black hover:bg-zinc-200"
            >
              {loading ? "Checking..." : "Check Content Logging"}
            </Button>
          </CardContent>
        </Card>

        {results && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Product Box Info */}
            {results.checks.productBoxExists !== undefined && (
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Product Box
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-300">Exists</span>
                    <StatusBadge status={results.checks.productBoxExists} />
                  </div>
                  {results.checks.productBoxData && (
                    <div className="space-y-2">
                      <div className="text-sm">
                        <span className="text-zinc-400">Title:</span>
                        <span className="text-white ml-2">{results.checks.productBoxData.title}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-zinc-400">Creator:</span>
                        <span className="text-white ml-2">{results.checks.productBoxData.creatorId}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Content Items */}
            {results.checks.contentItems && (
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Content Items ({results.checks.contentItems.count})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {results.checks.contentItems.items.map((item: any, index: number) => (
                      <div key={index} className="p-3 bg-zinc-800/50 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-white text-sm font-medium">{item.fileName}</span>
                          <Badge className="text-xs">{item.category}</Badge>
                        </div>
                        <div className="text-xs text-zinc-400">
                          Status: {item.status} • Size: {item.fileSize} bytes
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Access Logs */}
            {results.checks.accessLogs && (
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Access Logs ({results.checks.accessLogs.count})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {results.checks.accessLogs.recentLogs.map((log: any, index: number) => (
                      <div key={index} className="p-3 bg-zinc-800/50 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-white text-sm">User: {log.userId}</span>
                          <Badge className="text-xs">{log.accessMethod}</Badge>
                        </div>
                        <div className="text-xs text-zinc-400">
                          {log.accessGrantedAt} • {log.contentItemsCount} items
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* User Purchases */}
            {results.checks.userPurchases && (
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <User className="h-5 w-5" />
                    User Purchases ({results.checks.userPurchases.count})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {results.checks.userPurchases.purchases.map((purchase: any, index: number) => (
                      <div key={index} className="p-3 bg-zinc-800/50 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-white text-sm font-medium">{purchase.itemTitle}</span>
                          <Badge className="text-xs">{purchase.status}</Badge>
                        </div>
                        <div className="text-xs text-zinc-400">
                          {purchase.purchasedAt} • {purchase.contentItemsCount} items
                        </div>
                        {purchase.accessUrl && (
                          <div className="text-xs text-blue-400 mt-1">Access URL: {purchase.accessUrl}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
