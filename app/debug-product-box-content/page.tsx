"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import {
  Search,
  AlertCircle,
  CheckCircle,
  XCircle,
  Database,
  FileText,
  RefreshCw,
  Copy,
  ExternalLink,
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface DiagnosticResult {
  productBoxId: string
  timestamp: string
  searches: Array<{
    collection: string
    query: string
    found: boolean
    count?: number
    items?: Array<{
      id: string
      data: any
    }>
    error?: string
  }>
  recommendations: string[]
  summary: {
    totalItemsFound: number
    collectionsWithData: string[]
    possibleIssues: string[]
  }
}

export default function ProductBoxContentDiagnosticPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [productBoxId, setProductBoxId] = useState("bg76KcIQRG5QCaE0MUpJ") // Default to the problematic ID
  const [diagnostic, setDiagnostic] = useState<DiagnosticResult | null>(null)
  const [loading, setLoading] = useState(false)

  const runDiagnostic = async () => {
    if (!user || !productBoxId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a product box ID",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)
      const token = await user.getIdToken()

      const response = await fetch(`/api/debug/product-box-content-diagnostic?productBoxId=${productBoxId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`)
      }

      const data = await response.json()
      setDiagnostic(data.diagnostic)

      toast({
        title: "Diagnostic Complete",
        description: `Found ${data.diagnostic.summary.totalItemsFound} total items`,
      })
    } catch (error) {
      console.error("Diagnostic error:", error)
      toast({
        title: "Diagnostic Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied",
      description: "Copied to clipboard",
    })
  }

  const formatData = (data: any) => {
    return JSON.stringify(data, null, 2)
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold">Product Box Content Diagnostic</h1>
          <p className="text-zinc-400">
            Comprehensive tool to find and diagnose content storage issues for product boxes
          </p>
        </div>

        {/* Input Section */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Run Diagnostic
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Input
                placeholder="Enter Product Box ID"
                value={productBoxId}
                onChange={(e) => setProductBoxId(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
              <Button onClick={runDiagnostic} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                {loading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Run Diagnostic
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {diagnostic && (
          <div className="space-y-6">
            {/* Summary */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-zinc-800 rounded-lg">
                    <div className="text-2xl font-bold text-blue-400">{diagnostic.summary.totalItemsFound}</div>
                    <div className="text-sm text-zinc-400">Total Items Found</div>
                  </div>
                  <div className="text-center p-4 bg-zinc-800 rounded-lg">
                    <div className="text-2xl font-bold text-green-400">
                      {diagnostic.summary.collectionsWithData.length}
                    </div>
                    <div className="text-sm text-zinc-400">Collections with Data</div>
                  </div>
                  <div className="text-center p-4 bg-zinc-800 rounded-lg">
                    <div className="text-2xl font-bold text-red-400">{diagnostic.summary.possibleIssues.length}</div>
                    <div className="text-sm text-zinc-400">Possible Issues</div>
                  </div>
                </div>

                {/* Collections with Data */}
                {diagnostic.summary.collectionsWithData.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Collections with Data:</h4>
                    <div className="flex flex-wrap gap-2">
                      {diagnostic.summary.collectionsWithData.map((collection) => (
                        <Badge key={collection} variant="outline" className="border-green-500 text-green-400">
                          {collection}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Issues */}
                {diagnostic.summary.possibleIssues.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 text-red-400">Possible Issues:</h4>
                    <ul className="space-y-1">
                      {diagnostic.summary.possibleIssues.map((issue, index) => (
                        <li key={index} className="flex items-center gap-2 text-red-300">
                          <AlertCircle className="h-4 w-4" />
                          {issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommendations */}
                {diagnostic.recommendations.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 text-blue-400">Recommendations:</h4>
                    <ul className="space-y-1">
                      {diagnostic.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-center gap-2 text-blue-300">
                          <CheckCircle className="h-4 w-4" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Detailed Results */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Detailed Search Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="all" className="space-y-4">
                  <TabsList className="bg-zinc-800">
                    <TabsTrigger value="all">All Searches</TabsTrigger>
                    <TabsTrigger value="found">Found Data</TabsTrigger>
                    <TabsTrigger value="errors">Errors</TabsTrigger>
                  </TabsList>

                  <TabsContent value="all" className="space-y-4">
                    {diagnostic.searches.map((search, index) => (
                      <div key={index} className="border border-zinc-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="border-zinc-600">
                              {search.collection}
                            </Badge>
                            {search.found ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : search.error ? (
                              <XCircle className="h-4 w-4 text-red-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-zinc-500" />
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(search.query)}
                            className="text-zinc-400 hover:text-white"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>

                        <div className="text-sm text-zinc-400 mb-2">Query: {search.query}</div>

                        {search.found && search.count !== undefined && (
                          <div className="text-sm text-green-400 mb-2">Found {search.count} items</div>
                        )}

                        {search.error && <div className="text-sm text-red-400 mb-2">Error: {search.error}</div>}

                        {search.items && search.items.length > 0 && (
                          <div className="mt-3">
                            <details className="cursor-pointer">
                              <summary className="text-sm font-medium text-zinc-300 hover:text-white">
                                View Sample Data ({search.items.length} items shown)
                              </summary>
                              <div className="mt-2 space-y-2">
                                {search.items.map((item, itemIndex) => (
                                  <div key={itemIndex} className="bg-zinc-800 p-3 rounded text-xs">
                                    <div className="font-medium text-zinc-300 mb-1">ID: {item.id}</div>
                                    <pre className="text-zinc-400 overflow-x-auto whitespace-pre-wrap">
                                      {formatData(item.data)}
                                    </pre>
                                  </div>
                                ))}
                              </div>
                            </details>
                          </div>
                        )}
                      </div>
                    ))}
                  </TabsContent>

                  <TabsContent value="found" className="space-y-4">
                    {diagnostic.searches
                      .filter((search) => search.found)
                      .map((search, index) => (
                        <div key={index} className="border border-green-500/30 rounded-lg p-4 bg-green-900/10">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="border-green-500 text-green-400">
                              {search.collection}
                            </Badge>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-green-400">Found {search.count} items</span>
                          </div>
                          <div className="text-sm text-zinc-400">Query: {search.query}</div>
                        </div>
                      ))}
                  </TabsContent>

                  <TabsContent value="errors" className="space-y-4">
                    {diagnostic.searches
                      .filter((search) => search.error)
                      .map((search, index) => (
                        <div key={index} className="border border-red-500/30 rounded-lg p-4 bg-red-900/10">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="border-red-500 text-red-400">
                              {search.collection}
                            </Badge>
                            <XCircle className="h-4 w-4 text-red-500" />
                          </div>
                          <div className="text-sm text-zinc-400 mb-1">Query: {search.query}</div>
                          <div className="text-sm text-red-400">Error: {search.error}</div>
                        </div>
                      ))}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    onClick={() => window.open(`/product-box/${productBoxId}/content`, "_blank")}
                    className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View Content Page
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => window.open(`/dashboard/purchases`, "_blank")}
                    className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View Purchases Page
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
