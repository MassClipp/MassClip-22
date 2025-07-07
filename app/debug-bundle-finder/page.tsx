"use client"

import { useState, useEffect } from "react"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Copy, Search, RefreshCw, Bug } from "lucide-react"
import { toast } from "sonner"

interface Bundle {
  id: string
  collection: string
  title?: string
  description?: string
  price?: number
  currency?: string
  active?: boolean
  creatorId?: string
  thumbnailUrl?: string
  createdAt?: string
  updatedAt?: string
}

export default function BundleFinderPage() {
  const { user, loading: authLoading } = useFirebaseAuth()
  const [bundles, setBundles] = useState<Bundle[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [debugResults, setDebugResults] = useState<any>(null)
  const [debugLoading, setDebugLoading] = useState(false)

  const fetchBundles = async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/debug/list-bundles", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch bundles")
      }

      setBundles(data.bundles || [])
      toast.success(`Found ${data.bundles?.length || 0} bundles`)
    } catch (err: any) {
      setError(err.message)
      toast.error("Failed to fetch bundles")
    } finally {
      setLoading(false)
    }
  }

  const debugBundle = async (bundleId: string) => {
    if (!user) return

    setDebugLoading(true)
    setDebugResults(null)

    try {
      const token = await user.getIdToken()
      const response = await fetch("/api/debug/checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ bundleId }),
      })

      const data = await response.json()
      setDebugResults(data)

      if (data.success) {
        toast.success("Debug completed successfully")
      } else {
        toast.error(`Debug failed: ${data.error}`)
      }
    } catch (err: any) {
      toast.error("Debug request failed")
      setDebugResults({
        success: false,
        error: err.message,
        bundleId,
      })
    } finally {
      setDebugLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("Copied to clipboard")
  }

  useEffect(() => {
    if (user && !authLoading) {
      fetchBundles()
    }
  }, [user, authLoading])

  const filteredBundles = bundles.filter(
    (bundle) =>
      bundle.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bundle.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bundle.description?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const productBoxes = filteredBundles.filter((b) => b.collection === "productBoxes")
  const bundleCollection = filteredBundles.filter((b) => b.collection === "bundles")

  if (authLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading authentication...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertDescription>Please log in to use the Bundle Finder tool.</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bundle Finder</h1>
          <p className="text-muted-foreground">Find and debug all bundles in your database</p>
        </div>
        <Button onClick={fetchBundles} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search bundles by title, ID, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Badge variant="secondary">{filteredBundles.length} bundles</Badge>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All ({filteredBundles.length})</TabsTrigger>
          <TabsTrigger value="productBoxes">Product Boxes ({productBoxes.length})</TabsTrigger>
          <TabsTrigger value="bundles">Bundles ({bundleCollection.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <BundleGrid bundles={filteredBundles} onDebug={debugBundle} onCopy={copyToClipboard} />
        </TabsContent>

        <TabsContent value="productBoxes" className="space-y-4">
          <BundleGrid bundles={productBoxes} onDebug={debugBundle} onCopy={copyToClipboard} />
        </TabsContent>

        <TabsContent value="bundles" className="space-y-4">
          <BundleGrid bundles={bundleCollection} onDebug={debugBundle} onCopy={copyToClipboard} />
        </TabsContent>
      </Tabs>

      {debugResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5" />
              Debug Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm">{JSON.stringify(debugResults, null, 2)}</pre>
          </CardContent>
        </Card>
      )}

      {debugLoading && (
        <Card>
          <CardContent className="flex items-center justify-center p-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span>Running debug...</span>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function BundleGrid({
  bundles,
  onDebug,
  onCopy,
}: {
  bundles: Bundle[]
  onDebug: (id: string) => void
  onCopy: (text: string) => void
}) {
  if (bundles.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No bundles found</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {bundles.map((bundle) => (
        <Card key={bundle.id} className="relative">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <Badge variant={bundle.collection === "productBoxes" ? "default" : "secondary"}>
                {bundle.collection}
              </Badge>
              <Badge variant={bundle.active ? "default" : "destructive"}>{bundle.active ? "Active" : "Inactive"}</Badge>
            </div>
            <CardTitle className="text-lg line-clamp-2">{bundle.title || "Untitled"}</CardTitle>
            <CardDescription className="line-clamp-2">{bundle.description || "No description"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Price:</span>
              <span className="font-medium">
                ${bundle.price?.toFixed(2) || "0.00"} {bundle.currency?.toUpperCase() || "USD"}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">ID:</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onCopy(bundle.id)}
                  className="h-6 px-2 text-xs font-mono"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  {bundle.id.slice(0, 12)}...
                </Button>
              </div>

              {bundle.creatorId && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Creator:</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onCopy(bundle.creatorId!)}
                    className="h-6 px-2 text-xs font-mono"
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    {bundle.creatorId.slice(0, 8)}...
                  </Button>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => onDebug(bundle.id)} className="flex-1">
                <Bug className="h-3 w-3 mr-1" />
                Debug
              </Button>
              <Button variant="outline" size="sm" onClick={() => onCopy(bundle.id)}>
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
