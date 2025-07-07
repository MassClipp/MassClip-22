"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import {
  Search,
  Package,
  User,
  RefreshCw,
  ArrowLeft,
  Copy,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  XCircle,
} from "lucide-react"
import Link from "next/link"

interface Bundle {
  id: string
  title: string
  description?: string
  price: number
  currency: string
  active: boolean
  creatorId: string
  collection: string
  thumbnailUrl?: string
  createdAt?: string
}

interface SearchResult {
  success: boolean
  searchTerm?: string
  creatorId?: string
  productBoxes: Bundle[]
  bundles: Bundle[]
  totalFound: number
  timestamp: string
}

export default function DebugBundleFinderPage() {
  const { toast } = useToast()
  const { user } = useFirebaseAuth()
  const [searchTerm, setSearchTerm] = useState("")
  const [creatorId, setCreatorId] = useState("")
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(false)

  const searchBundles = async () => {
    try {
      setLoading(true)
      setSearchResult(null)

      const response = await fetch("/api/debug/find-bundle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          searchTerm: searchTerm.trim() || undefined,
          creatorId: creatorId.trim() || undefined,
        }),
      })

      const data = await response.json()
      setSearchResult(data)

      if (response.ok) {
        toast({
          title: "Search Complete",
          description: `Found ${data.totalFound} bundles`,
        })
      } else {
        toast({
          title: "Search Failed",
          description: data.error || "Failed to search bundles",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error searching bundles:", error)
      toast({
        title: "Error",
        description: "Failed to search bundles",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const copyBundleId = (bundleId: string) => {
    navigator.clipboard.writeText(bundleId)
    toast({
      title: "Copied!",
      description: "Bundle ID copied to clipboard",
    })
  }

  const debugBundle = (bundleId: string) => {
    window.open(`/debug-checkout-session?bundleId=${bundleId}`, "_blank")
  }

  const BundleCard = ({ bundle }: { bundle: Bundle }) => (
    <div className="bg-gray-700/50 rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="text-white font-medium">{bundle.title}</h4>
            <Badge variant={bundle.active ? "default" : "secondary"} className="text-xs">
              {bundle.active ? "Active" : "Inactive"}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {bundle.collection}
            </Badge>
          </div>
          {bundle.description && <p className="text-gray-400 text-sm mb-2 line-clamp-2">{bundle.description}</p>}
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <span>
              ${bundle.price} {bundle.currency.toUpperCase()}
            </span>
            <span>Creator: {bundle.creatorId.slice(0, 8)}...</span>
            {bundle.createdAt && <span>{new Date(bundle.createdAt).toLocaleDateString()}</span>}
          </div>
        </div>
        {bundle.thumbnailUrl && (
          <img
            src={bundle.thumbnailUrl || "/placeholder.svg"}
            alt={bundle.title}
            className="w-16 h-16 object-cover rounded-lg ml-4"
          />
        )}
      </div>
      <div className="flex items-center gap-2">
        <code className="bg-gray-600 px-2 py-1 rounded text-xs text-white flex-1">{bundle.id}</code>
        <Button
          onClick={() => copyBundleId(bundle.id)}
          variant="outline"
          size="sm"
          className="border-gray-600 bg-transparent"
        >
          <Copy className="h-3 w-3" />
        </Button>
        <Button
          onClick={() => debugBundle(bundle.id)}
          variant="outline"
          size="sm"
          className="border-gray-600 bg-transparent"
        >
          <ExternalLink className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button asChild variant="outline" size="sm" className="border-gray-600 bg-transparent">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">Bundle Finder</h1>
            <p className="text-gray-400">Find and debug bundles in your database</p>
          </div>
        </div>

        {/* User Status */}
        <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-400" />
              <CardTitle className="text-white">Authentication Status</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {user ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
              <span className="text-white">{user ? `Authenticated as ${user.email}` : "Not authenticated"}</span>
            </div>
            {user && (
              <div className="mt-2 text-sm text-gray-400">
                User ID: <code className="bg-gray-700 px-1 rounded">{user.uid}</code>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Search Form */}
        <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-green-400" />
              <CardTitle className="text-white">Search Bundles</CardTitle>
            </div>
            <CardDescription>Search for bundles by title, ID, or creator</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Search Term (Title or ID)</label>
                <Input
                  placeholder="Enter bundle title or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Creator ID (Optional)</label>
                <Input
                  placeholder="Enter creator ID..."
                  value={creatorId}
                  onChange={(e) => setCreatorId(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                />
              </div>
            </div>

            <Button
              onClick={searchBundles}
              disabled={loading || !user}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Search Bundles
                </>
              )}
            </Button>

            {!user && (
              <Alert className="border-yellow-500/30 bg-yellow-500/10">
                <AlertCircle className="h-4 w-4 text-yellow-400" />
                <AlertTitle className="text-yellow-400">Authentication Required</AlertTitle>
                <AlertDescription className="text-yellow-300">
                  You need to be logged in to search bundles.{" "}
                  <Link href="/login" className="underline">
                    Login here
                  </Link>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Search Results */}
        {searchResult && (
          <div className="space-y-6">
            {/* Summary */}
            <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-purple-400" />
                  <CardTitle className="text-white">Search Results</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                    <div className="text-2xl font-bold text-blue-400">{searchResult.productBoxes.length}</div>
                    <div className="text-blue-300 text-sm">Product Boxes</div>
                  </div>
                  <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-400">{searchResult.bundles.length}</div>
                    <div className="text-green-300 text-sm">Bundles</div>
                  </div>
                  <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
                    <div className="text-2xl font-bold text-purple-400">{searchResult.totalFound}</div>
                    <div className="text-purple-300 text-sm">Total Found</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Product Boxes */}
            {searchResult.productBoxes.length > 0 && (
              <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white">Product Boxes ({searchResult.productBoxes.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {searchResult.productBoxes.map((bundle) => (
                    <BundleCard key={bundle.id} bundle={bundle} />
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Bundles */}
            {searchResult.bundles.length > 0 && (
              <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white">Bundles ({searchResult.bundles.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {searchResult.bundles.map((bundle) => (
                    <BundleCard key={bundle.id} bundle={bundle} />
                  ))}
                </CardContent>
              </Card>
            )}

            {/* No Results */}
            {searchResult.totalFound === 0 && (
              <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
                <CardContent className="text-center py-8">
                  <Package className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-white font-medium mb-2">No Bundles Found</h3>
                  <p className="text-gray-400 text-sm">
                    Try adjusting your search terms or check if bundles exist in the database.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Quick Actions</CardTitle>
            <CardDescription>Common debugging tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                onClick={() => {
                  setSearchTerm("")
                  setCreatorId("")
                  searchBundles()
                }}
                variant="outline"
                className="border-gray-600 bg-transparent text-white"
                disabled={loading || !user}
              >
                <Package className="h-4 w-4 mr-2" />
                Show All Bundles
              </Button>
              <Button
                onClick={() => {
                  setSearchTerm("product-")
                  searchBundles()
                }}
                variant="outline"
                className="border-gray-600 bg-transparent text-white"
                disabled={loading || !user}
              >
                <Search className="h-4 w-4 mr-2" />
                Find Product-* IDs
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
