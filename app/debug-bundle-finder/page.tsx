"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import {
  Search,
  Package,
  ArrowLeft,
  Copy,
  ExternalLink,
  CheckCircle,
  XCircle,
  DollarSign,
  User,
  Calendar,
} from "lucide-react"
import Link from "next/link"

interface Bundle {
  id: string
  title: string
  price: number
  currency: string
  active: boolean
  creatorId: string
  createdAt?: string
  thumbnailUrl?: string
}

interface BundleListResult {
  productBoxes: Bundle[]
  bundles: Bundle[]
  summary: {
    totalProductBoxes: number
    totalBundles: number
    activeProductBoxes: number
    activeBundles: number
  }
  timestamp: string
}

export default function DebugBundleFinderPage() {
  const { toast } = useToast()
  const [result, setResult] = useState<BundleListResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [creatorId, setCreatorId] = useState("")
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    fetchBundles()
  }, [])

  const fetchBundles = async (filterCreatorId?: string) => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filterCreatorId) {
        params.append("creatorId", filterCreatorId)
      }

      const response = await fetch(`/api/debug/list-bundles?${params}`)
      const data = await response.json()

      if (response.ok) {
        setResult(data)
        toast({
          title: "Bundles Loaded",
          description: `Found ${data.summary.totalProductBoxes + data.summary.totalBundles} total bundles`,
        })
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch bundles",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching bundles:", error)
      toast({
        title: "Error",
        description: "Failed to fetch bundles",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    fetchBundles(creatorId.trim() || undefined)
  }

  const copyBundleId = (bundleId: string) => {
    navigator.clipboard.writeText(bundleId)
    toast({
      title: "Copied!",
      description: `Bundle ID ${bundleId} copied to clipboard`,
    })
  }

  const debugBundle = (bundleId: string) => {
    window.open(`/debug-checkout-session?bundleId=${bundleId}`, "_blank")
  }

  const filteredProductBoxes = result?.productBoxes.filter((bundle) =>
    searchTerm ? bundle.title.toLowerCase().includes(searchTerm.toLowerCase()) || bundle.id.includes(searchTerm) : true,
  )

  const filteredBundles = result?.bundles.filter((bundle) =>
    searchTerm ? bundle.title.toLowerCase().includes(searchTerm.toLowerCase()) || bundle.id.includes(searchTerm) : true,
  )

  const BundleCard = ({ bundle, collection }: { bundle: Bundle; collection: string }) => (
    <Card className="bg-gray-800/30 border-gray-700/50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-white text-sm font-medium truncate">{bundle.title}</CardTitle>
            <CardDescription className="text-xs text-gray-400 mt-1">
              {collection} • {bundle.id}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1 ml-2">
            {bundle.active ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500" />
            )}
            <Badge variant={bundle.active ? "default" : "secondary"} className="text-xs">
              {bundle.active ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1">
            <DollarSign className="h-3 w-3 text-green-400" />
            <span className="text-white">
              ${bundle.price} {bundle.currency.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <User className="h-3 w-3 text-blue-400" />
            <span className="text-gray-300 truncate">{bundle.creatorId.slice(0, 8)}...</span>
          </div>
          {bundle.createdAt && (
            <div className="flex items-center gap-1 col-span-2">
              <Calendar className="h-3 w-3 text-purple-400" />
              <span className="text-gray-300">{new Date(bundle.createdAt).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => copyBundleId(bundle.id)}
            variant="outline"
            size="sm"
            className="flex-1 h-8 text-xs border-gray-600 bg-transparent"
          >
            <Copy className="h-3 w-3 mr-1" />
            Copy ID
          </Button>
          <Button
            onClick={() => debugBundle(bundle.id)}
            variant="outline"
            size="sm"
            className="flex-1 h-8 text-xs border-gray-600 bg-transparent"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Debug
          </Button>
        </div>
      </CardContent>
    </Card>
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
            <p className="text-gray-400">Find and debug bundle IDs in your database</p>
          </div>
        </div>

        {/* Search Controls */}
        <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-amber-400" />
              <CardTitle className="text-white">Search Bundles</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Filter by Creator ID (optional)</label>
                <Input
                  placeholder="Enter creator ID to filter..."
                  value={creatorId}
                  onChange={(e) => setCreatorId(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Search by title or ID</label>
                <Input
                  placeholder="Search bundles..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                />
              </div>
            </div>

            <Button
              onClick={handleSearch}
              disabled={loading}
              className="w-full bg-amber-600 hover:bg-amber-700 text-black"
            >
              {loading ? "Loading..." : "Search Bundles"}
            </Button>
          </CardContent>
        </Card>

        {/* Summary */}
        {result && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gray-800/30 border-gray-700/50">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-400">{result.summary.totalProductBoxes}</div>
                <div className="text-sm text-gray-400">Product Boxes</div>
              </CardContent>
            </Card>
            <Card className="bg-gray-800/30 border-gray-700/50">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-400">{result.summary.totalBundles}</div>
                <div className="text-sm text-gray-400">Bundles</div>
              </CardContent>
            </Card>
            <Card className="bg-gray-800/30 border-gray-700/50">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-400">{result.summary.activeProductBoxes}</div>
                <div className="text-sm text-gray-400">Active Product Boxes</div>
              </CardContent>
            </Card>
            <Card className="bg-gray-800/30 border-gray-700/50">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-400">{result.summary.activeBundles}</div>
                <div className="text-sm text-gray-400">Active Bundles</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Product Boxes */}
        {filteredProductBoxes && filteredProductBoxes.length > 0 && (
          <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-400" />
                <CardTitle className="text-white">Product Boxes ({filteredProductBoxes.length})</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProductBoxes.map((bundle) => (
                  <BundleCard key={bundle.id} bundle={bundle} collection="productBoxes" />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bundles */}
        {filteredBundles && filteredBundles.length > 0 && (
          <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-purple-400" />
                <CardTitle className="text-white">Bundles ({filteredBundles.length})</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredBundles.map((bundle) => (
                  <BundleCard key={bundle.id} bundle={bundle} collection="bundles" />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Results */}
        {result && filteredProductBoxes?.length === 0 && filteredBundles?.length === 0 && (
          <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <Package className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-white font-medium mb-2">No bundles found</h3>
              <p className="text-gray-400 text-sm">
                {searchTerm || creatorId ? "Try adjusting your search criteria" : "No bundles exist in the database"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
