"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Search, Package, AlertCircle, RefreshCw } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

export default function ProductBoxFinderPage() {
  const [productBoxId, setProductBoxId] = useState("")
  const [creatorId, setCreatorId] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [activeTab, setActiveTab] = useState("lookup")
  const { user } = useAuth()
  const { toast } = useToast()

  const lookupProductBox = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "Please log in first",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const token = await user.getIdToken(true)

      let url = `/api/debug/product-box-lookup?`
      if (productBoxId) url += `id=${encodeURIComponent(productBoxId)}`
      if (creatorId) url += `${productBoxId ? "&" : ""}creatorId=${encodeURIComponent(creatorId)}`

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()
      setResult(data)

      if (response.ok) {
        toast({
          title: "Lookup Complete",
          description: "Check the results below",
        })
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to lookup product box",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to lookup product box",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const testDirectContent = async (id: string) => {
    if (!user || !id) return

    try {
      const token = await user.getIdToken(true)

      const response = await fetch(`/api/product-box/${id}/direct-content`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: `Found ${data.content?.length || 0} content items`,
        })
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch content",
          variant: "destructive",
        })
      }

      return data
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to test direct content API",
        variant: "destructive",
      })
    }
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A"

    try {
      // Handle Firestore timestamps
      if (timestamp._seconds) {
        return new Date(timestamp._seconds * 1000).toLocaleString()
      }

      // Handle ISO strings
      return new Date(timestamp).toLocaleString()
    } catch (e) {
      return "Invalid date"
    }
  }

  const viewProductBox = (id: string) => {
    window.open(`/product-box/${id}/content`, "_blank")
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-2">Product Box Finder</h1>
          <p className="text-white/60">Find and diagnose product boxes in your database</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 mb-6">
            <TabsTrigger value="lookup">Lookup Product Box</TabsTrigger>
            <TabsTrigger value="purchases">Your Purchases</TabsTrigger>
          </TabsList>

          <TabsContent value="lookup">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Find Product Box</CardTitle>
                <CardDescription className="text-white/60">
                  Enter a product box ID or creator ID to find product boxes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-white/60 mb-1 block">Product Box ID</label>
                    <div className="flex gap-4">
                      <Input
                        placeholder="Enter product box ID"
                        value={productBoxId}
                        onChange={(e) => setProductBoxId(e.target.value)}
                        className="flex-1 bg-white/5 border-white/20 text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-white/60 mb-1 block">Creator ID (optional)</label>
                    <div className="flex gap-4">
                      <Input
                        placeholder="Enter creator ID"
                        value={creatorId}
                        onChange={(e) => setCreatorId(e.target.value)}
                        className="flex-1 bg-white/5 border-white/20 text-white"
                      />
                    </div>
                  </div>

                  <Button onClick={lookupProductBox} disabled={loading} className="w-full">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                    {loading ? "Searching..." : "Search"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {result && (
              <div className="mt-6 space-y-6">
                {/* Specific product box result */}
                {productBoxId && (
                  <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white">Product Box Lookup Results</CardTitle>
                      <CardDescription className="text-white/60">Results for ID: {productBoxId}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {Object.entries(result.results).map(([collection, collectionResult]: [string, any]) => {
                          if (collection === "byCreator" || collection === "recent" || collection === "userPurchases") {
                            return null
                          }

                          return (
                            <div key={collection} className="border border-white/10 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center">
                                  <Badge
                                    className={
                                      collectionResult.found
                                        ? "bg-green-500/20 text-green-400"
                                        : "bg-red-500/20 text-red-400"
                                    }
                                  >
                                    {collectionResult.found ? "Found" : "Not Found"}
                                  </Badge>
                                  <span className="ml-3 text-white font-medium">Collection: {collection}</span>
                                </div>

                                {collectionResult.found && (
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="border-white/20 text-white/80 hover:bg-white/10"
                                      onClick={() => testDirectContent(productBoxId)}
                                    >
                                      Test Content
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="border-white/20 text-white/80 hover:bg-white/10"
                                      onClick={() => viewProductBox(productBoxId)}
                                    >
                                      View
                                    </Button>
                                  </div>
                                )}
                              </div>

                              {collectionResult.found ? (
                                <div className="bg-white/5 p-4 rounded">
                                  <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                      <div className="text-white/60 text-sm">Title</div>
                                      <div className="text-white font-medium">
                                        {collectionResult.data.title || "Untitled"}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-white/60 text-sm">Creator ID</div>
                                      <div className="text-white">{collectionResult.data.creatorId || "N/A"}</div>
                                    </div>
                                    <div>
                                      <div className="text-white/60 text-sm">Created</div>
                                      <div className="text-white">{formatDate(collectionResult.data.createdAt)}</div>
                                    </div>
                                    <div>
                                      <div className="text-white/60 text-sm">Price</div>
                                      <div className="text-white">
                                        {collectionResult.data.price
                                          ? `${collectionResult.data.price} ${collectionResult.data.currency || "USD"}`
                                          : "N/A"}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="text-white/60 text-sm mb-1">Description</div>
                                  <div className="text-white">
                                    {collectionResult.data.description || "No description"}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-white/60">
                                  {collectionResult.error
                                    ? `Error: ${collectionResult.error}`
                                    : `Product box not found in ${collection} collection`}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Creator results */}
                {result.results.byCreator && (
                  <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white">Creator's Product Boxes</CardTitle>
                      <CardDescription className="text-white/60">Product boxes created by: {creatorId}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {Object.entries(result.results.byCreator).map(
                          ([collection, collectionResult]: [string, any]) => {
                            if (!collectionResult.found) return null

                            return (
                              <div key={collection} className="border border-white/10 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center">
                                    <Badge className="bg-green-500/20 text-green-400">
                                      {collectionResult.count} Items
                                    </Badge>
                                    <span className="ml-3 text-white font-medium">Collection: {collection}</span>
                                  </div>
                                </div>

                                <div className="space-y-3">
                                  {collectionResult.items.map((item: any) => (
                                    <div
                                      key={item.id}
                                      className="bg-white/5 p-3 rounded flex items-center justify-between"
                                    >
                                      <div>
                                        <div className="text-white font-medium">{item.title || "Untitled"}</div>
                                        <div className="text-white/60 text-sm">ID: {item.id}</div>
                                      </div>
                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="border-white/20 text-white/80 hover:bg-white/10"
                                          onClick={() => testDirectContent(item.id)}
                                        >
                                          Test
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="border-white/20 text-white/80 hover:bg-white/10"
                                          onClick={() => viewProductBox(item.id)}
                                        >
                                          View
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )
                          },
                        )}

                        {Object.values(result.results.byCreator).every((r: any) => !r.found) && (
                          <div className="text-center py-6">
                            <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
                            <h3 className="text-white text-lg font-medium mb-1">No Product Boxes Found</h3>
                            <p className="text-white/60">This creator doesn't have any product boxes</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Recent results */}
                {result.results.recent && !productBoxId && !creatorId && (
                  <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white">Recent Product Boxes</CardTitle>
                      <CardDescription className="text-white/60">Recently created product boxes</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {Object.entries(result.results.recent).map(([collection, collectionResult]: [string, any]) => {
                          if (!collectionResult.found) return null

                          return (
                            <div key={collection} className="border border-white/10 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center">
                                  <Badge className="bg-green-500/20 text-green-400">
                                    {collectionResult.count} Items
                                  </Badge>
                                  <span className="ml-3 text-white font-medium">Collection: {collection}</span>
                                </div>
                              </div>

                              <div className="space-y-3">
                                {collectionResult.items.map((item: any) => (
                                  <div
                                    key={item.id}
                                    className="bg-white/5 p-3 rounded flex items-center justify-between"
                                  >
                                    <div>
                                      <div className="text-white font-medium">{item.title || "Untitled"}</div>
                                      <div className="text-white/60 text-sm">ID: {item.id}</div>
                                      <div className="text-white/40 text-xs">
                                        Creator: {item.creatorId || "Unknown"}
                                      </div>
                                    </div>
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="border-white/20 text-white/80 hover:bg-white/10"
                                        onClick={() => testDirectContent(item.id)}
                                      >
                                        Test
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="border-white/20 text-white/80 hover:bg-white/10"
                                        onClick={() => viewProductBox(item.id)}
                                      >
                                        View
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        })}

                        {Object.values(result.results.recent).every((r: any) => !r.found) && (
                          <div className="text-center py-6">
                            <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
                            <h3 className="text-white text-lg font-medium mb-1">No Recent Product Boxes</h3>
                            <p className="text-white/60">No product boxes found in the database</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="purchases">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Your Purchases</CardTitle>
                <CardDescription className="text-white/60">Product boxes you've purchased</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {result?.results?.userPurchases?.found ? (
                    <div>
                      <div className="mb-4">
                        <Badge className="bg-green-500/20 text-green-400">
                          {result.results.userPurchases.count} Purchases
                        </Badge>
                      </div>

                      <div className="space-y-3">
                        {result.results.userPurchases.items.map((item: any) => (
                          <div key={item.id} className="bg-white/5 p-4 rounded flex items-center justify-between">
                            <div>
                              <div className="text-white font-medium">{item.itemName || "Unnamed Product"}</div>
                              <div className="text-white/60 text-sm">Item ID: {item.itemId}</div>
                              <div className="text-white/40 text-xs">
                                Purchased: {formatDate(item.createdAt || item.purchasedAt)}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-white/20 text-white/80 hover:bg-white/10"
                                onClick={() => testDirectContent(item.itemId)}
                              >
                                Test
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-white/20 text-white/80 hover:bg-white/10"
                                onClick={() => viewProductBox(item.itemId)}
                              >
                                View
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      {loading ? (
                        <Loader2 className="w-12 h-12 text-white/40 mx-auto mb-3 animate-spin" />
                      ) : (
                        <>
                          <Package className="w-12 h-12 text-white/40 mx-auto mb-3" />
                          <h3 className="text-white text-lg font-medium mb-1">No Purchases Found</h3>
                          <p className="text-white/60 mb-4">You haven't purchased any product boxes yet</p>
                          <Button onClick={lookupProductBox} disabled={loading}>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Load Purchases
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
